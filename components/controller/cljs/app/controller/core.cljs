(ns app.controller.core
  "Imperative shell around the pure domain core (app.core.system/process).
   Receives {:command :data :user :env :execution-ctx} from the /api/command
   and /api/query endpoints, gathers facts, lets the domain rules decide, and
   runs the side effects against the storage-backed domain stores."
  (:require ["jsonwebtoken" :as jwt]
            [app.worker.async :refer [js-await]]
            [app.worker.auth :as auth]
            [app.storage.interface :as storage]
            [app.match.interface :as match]
            [app.match.store :as match-store]
            [app.match.game-store :as game-store]
            [app.league.store :as league-store]
            [app.team.store :as team-store]
            [app.player.store :as player-store]
            [app.user.admin-store :as admin-store]))

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
  "Gathers the sign-in facts (env super admin match, stored admin entity,
   password hash) and lets the domain rules decide the outcome."
  [core env {:keys [username password]}]
  (js-await [admin         (admin-store/find-by-username+ username)
             provided-hash (auth/hash-password password)]
            (let [su-name (aget env "SUPER_ADMIN_USERNAME")
                  su-pass (aget env "SUPER_ADMIN_PASSWORD")
                  db-user (when (:admin-user/username admin)
                            {:id            (:db/id admin)
                             :username      (:admin-user/username admin)
                             :role          (:admin-user/role admin)
                             :password_hash (:admin-user/password-hash admin)})
                  result  ((:process core)
                           {:command :admin-sign-in
                            :data    {:super-match?   (and (some? su-name) (some? su-pass)
                                                           (= username su-name)
                                                           (= password su-pass))
                                      :super-username su-name
                                      :db-user        db-user
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
  (js-await [league (league-store/by-id+ id)]
            (cond
              (nil? league)        {:error :league-not-found}
              (nil? (:url league)) {:error :league-url-not-set}
              :else (do (.waitUntil execution-ctx
                                    (match/scrape-league! env (:url league)
                                                          (:name league)
                                                          (:category league)))
                        {:message (str "Scraping started for league: " (:name league))}))))

(defn- handle-scrape-all! [env execution-ctx]
  (.waitUntil execution-ctx (match/scrape-all-leagues! env))
  {:message "Scraping started for all active leagues"})

(defn- handle-save-game! [{:keys [teamAName teamBName] :as data}]
  (if-not (and teamAName teamBName)
    {:error :missing-team-names}
    (js-await [eid (game-store/save!+ data)]
              {:message "Game saved" :id eid})))

;; ── query handlers ────────────────────────────────────────────────────────────

(defn- as-data [p]
  (.then p (fn [rows] {:data rows})))

(defn- get-stats []
  (js-await [leagues (storage/find-by-type "league")
             teams   (storage/find-by-type "team")
             players (storage/find-by-type "player")
             matches (storage/find-by-type "match")
             logs    (match-store/recent-logs+)]
            {:data {:totalLeagues   (count leagues)
                    :totalTeams     (count teams)
                    :totalPlayers   (count players)
                    :totalMatches   (count matches)
                    :totalSeries    0
                    :lastScrapeTime (->> logs
                                         (filter #(= "success" (:status %)))
                                         first
                                         :createdAt)}}))

;; ── dispatch ──────────────────────────────────────────────────────────────────

(defn dispatch [{:keys [core command data env user execution-ctx]}]
  (case command
    ;; commands
    :admin-sign-in (handle-admin-sign-in! core env data)
    :scrape-url    (with-scrape-access core user #(handle-scrape-url! env execution-ctx data))
    :scrape-league (with-scrape-access core user #(handle-scrape-league! env execution-ctx data))
    :scrape-all    (with-scrape-access core user #(handle-scrape-all! env execution-ctx))
    :save-game     (if user
                     (handle-save-game! data)
                     {:error :unauthorized})

    ;; queries
    :get-leagues     (as-data (league-store/find-all+))
    :get-teams       (as-data (team-store/find-all+))
    :get-players     (as-data (player-store/find-all+))
    :get-matches     (as-data (match-store/find-all+))
    :get-scrape-logs (as-data (match-store/recent-logs+))
    :get-stat-games  (as-data (game-store/find-all+))
    :get-stats       (get-stats)

    {:error :unknown-command}))
