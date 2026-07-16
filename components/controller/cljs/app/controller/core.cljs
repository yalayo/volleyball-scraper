(ns app.controller.core
  "Imperative shell around the pure domain core (app.core.system/process).
   Receives {:command :data :user :env :execution-ctx} from the /api/command
   and /api/query endpoints, gathers facts, lets the domain rules decide, and
   runs the side effects (D1 queries, scraping, JWT issuing)."
  (:require ["jsonwebtoken" :as jwt]
            [app.worker.async :refer [js-await]]
            [app.worker.auth :as auth]
            [app.worker.db :as db]
            [app.match.interface :as match]))

;; ── auth helpers ──────────────────────────────────────────────────────────────

(defn- issue-token [env {:keys [id username role superadmin]}]
  (let [claims (cond-> #js {:id       id
                            :username username
                            :role     role
                            :exp      (+ (js/Math.floor (/ (.now js/Date) 1000)) 86400)}
                 superadmin (doto (aset "superadmin" true)))]
    (.sign jwt claims (aget env "JWT_SECRET"))))

;; ── command handlers ──────────────────────────────────────────────────────────

(defn- handle-admin-sign-in!
  "Gathers the sign-in facts (env super admin match, DB admin row, password
   hash) and lets the domain rules decide the outcome."
  [core env {:keys [username password]}]
  (js-await [{:keys [results]} (db/query+ {:select [:*]
                                           :from   [:volley_admin_users]
                                           :where  [:= :username username]})
             provided-hash    (auth/hash-password password)]
            (let [su-name (aget env "SUPER_ADMIN_USERNAME")
                  su-pass (aget env "SUPER_ADMIN_PASSWORD")
                  result  ((:process core)
                           {:command :admin-sign-in
                            :data    {:super-match?   (and (some? su-name) (some? su-pass)
                                                           (= username su-name)
                                                           (= password su-pass))
                                      :super-username su-name
                                      :db-user        (first results)
                                      :provided-hash  provided-hash}})]
              (if (= :sign-in-ok (:action result))
                {:message "Login successful"
                 :token   (issue-token env (:user result))
                 :user    (:user result)}
                result))))

(defn- with-scrape-access
  "Runs f when the domain rules allow this user to scrape."
  [core user f]
  (let [result ((:process core) {:command :scrape
                                 :data    {:role (:role user)}})]
    (if (= :scrape-allowed (:action result))
      (f)
      result)))

(defn- handle-scrape-url! [env execution-ctx {:keys [url league-name category]}]
  (if-not url
    {:error :missing-url}
    (do (.waitUntil execution-ctx
                    (match/scrape-league! env url
                                          (or league-name (str "League from " url))
                                          (or category "General")))
        {:message (str "Scraping started for " url)})))

(defn- handle-scrape-league! [env execution-ctx {:keys [id]}]
  (js-await [{:keys [results]} (db/query+ {:select [:*]
                                           :from   [:volley_leagues]
                                           :where  [:= :id id]})]
            (let [league (first results)]
              (cond
                (nil? league)       {:error :league-not-found}
                (nil? (:url league)) {:error :league-url-not-set}
                :else (do (.waitUntil execution-ctx
                                      (match/scrape-league! env (:url league)
                                                            (:name league)
                                                            (:category league)))
                          {:message (str "Scraping started for league: " (:name league))})))))

(defn- handle-scrape-all! [env execution-ctx]
  (.waitUntil execution-ctx (match/scrape-all-leagues! env))
  {:message "Scraping started for all active leagues"})

;; ── query handlers ────────────────────────────────────────────────────────────

(defn- run-query [query-map]
  (js-await [{:keys [success results]} (db/query+ query-map)]
            (if success
              {:data results}
              {:error :query-failed})))

(defn- get-stats []
  (js-await [leagues-r (db/query+ {:select [[[:count :*] :total]]
                                   :from   [:volley_leagues]
                                   :where  [:= :is_active 1]})
             teams-r   (db/query+ {:select [[[:count :*] :total]]
                                   :from   [:volley_teams]
                                   :where  [:= :is_active 1]})
             players-r (db/query+ {:select [[[:count :*] :total]]
                                   :from   [:volley_players]
                                   :where  [:= :is_active 1]})
             matches-r (db/query+ {:select [[[:count :*] :total]]
                                   :from   [:volley_matches]})
             log-r     (db/query+ {:select   [[:created_at :last_scrape_time]]
                                   :from     [:volley_scrape_logs]
                                   :where    [:= :status "success"]
                                   :order-by [[:created_at :desc]]
                                   :limit    1})]
            {:data {:totalLeagues   (-> leagues-r :results first :total)
                    :totalTeams     (-> teams-r   :results first :total)
                    :totalPlayers   (-> players-r :results first :total)
                    :totalMatches   (-> matches-r :results first :total)
                    :totalSeries    0
                    :lastScrapeTime (-> log-r :results first :last_scrape_time)}}))

;; ── dispatch ──────────────────────────────────────────────────────────────────

(defn dispatch [{:keys [core command data env user execution-ctx]}]
  (case command
    ;; commands
    :admin-sign-in (handle-admin-sign-in! core env data)
    :scrape-url    (with-scrape-access core user #(handle-scrape-url! env execution-ctx data))
    :scrape-league (with-scrape-access core user #(handle-scrape-league! env execution-ctx data))
    :scrape-all    (with-scrape-access core user #(handle-scrape-all! env execution-ctx))

    ;; queries
    :get-leagues (run-query {:select   [:*]
                             :from     [:volley_leagues]
                             :where    [:= :is_active 1]
                             :order-by [[:name :asc]]})
    :get-teams   (run-query {:select    [:t.* [:l.name :league_name]]
                             :from      [[:volley_teams :t]]
                             :left-join [[:volley_leagues :l] [:= :t.league_id :l.id]]
                             :where     [:= :t.is_active 1]
                             :order-by  [[:t.name :asc]]})
    :get-players (run-query {:select    [:p.* [:t.name :team_name]]
                             :from      [[:volley_players :p]]
                             :left-join [[:volley_teams :t] [:= :p.team_id :t.id]]
                             :where     [:= :p.is_active 1]
                             :order-by  [[:p.name :asc]]})
    :get-matches (run-query {:select    [:m.*
                                         [:ht.name :home_team_name_joined]
                                         [:at.name :away_team_name_joined]
                                         [:l.name  :league_name]]
                             :from      [[:volley_matches :m]]
                             :left-join [[:volley_teams :ht]  [:= :m.home_team_id :ht.id]
                                         [:volley_teams :at]  [:= :m.away_team_id :at.id]
                                         [:volley_leagues :l] [:= :m.league_id :l.id]]
                             :order-by  [[:m.match_date :desc]]})
    :get-scrape-logs (run-query {:select   [:*]
                                 :from     [:volley_scrape_logs]
                                 :order-by [[:created_at :desc]]
                                 :limit    50})
    :get-stats (get-stats)

    {:error :unknown-command}))
