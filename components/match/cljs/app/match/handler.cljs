(ns app.match.handler
  (:require ["jsonwebtoken" :as jwt]
            [app.worker.async :refer [js-await]]
            [app.worker.db :as db]
            [app.worker.cf :as cf]
            [app.match.scraper :as scraper]))

;; ── helpers ─────────────────────────────────────────────────────────────────

(defn- hash-password [password]
  (let [salt "volleyball-admin-salt"
        input (str salt ":" password)
        encoder (js/TextEncoder.)
        data (.encode encoder input)]
    (-> (js/Promise.resolve (.digest js/crypto.subtle "SHA-256" data))
        (.then (fn [hash-buffer]
                 (let [hash-array (js/Uint8Array. hash-buffer)]
                   (->> hash-array
                        (map (fn [b] (.padStart (.toString b 16) 2 "0")))
                        (apply str))))))))

;; ── public data endpoints ────────────────────────────────────────────────────

(defn get-all [{:keys [_request _env]}]
  (js-await [{:keys [success results]} (db/query+ {:select    [:m.*
                                                               [:ht.name :home_team_name_joined]
                                                               [:at.name :away_team_name_joined]
                                                               [:l.name  :league_name]]
                                                    :from      [[:volley_matches :m]]
                                                    :left-join [[:volley_teams :ht]  [:= :m.home_team_id :ht.id]
                                                                [:volley_teams :at]  [:= :m.away_team_id :at.id]
                                                                [:volley_leagues :l] [:= :m.league_id :l.id]]
                                                    :order-by  [[:m.match_date :desc]]})]
            (if success
              (cf/response-edn results {:status 200})
              (cf/response-error "Failed to load matches"))))

(defn get-by-team [{:keys [route _request _env]}]
  (let [team-id (js/parseInt (-> route :path-params :teamId) 10)]
    (js-await [{:keys [success results]} (db/query+ {:select   [:*]
                                                      :from     [:volley_matches]
                                                      :where    [:or
                                                                 [:= :home_team_id team-id]
                                                                 [:= :away_team_id team-id]]
                                                      :order-by [[:match_date :desc]]})]
              (if success
                (cf/response-edn results {:status 200})
                (cf/response-error "Failed to load team matches")))))

(defn get-stats [{:keys [_request _env]}]
  (js-await [leagues-r  (db/query+ {:select [[[:count :*] :total]]
                                     :from   [:volley_leagues]
                                     :where  [:= :is_active 1]})
             teams-r    (db/query+ {:select [[[:count :*] :total]]
                                     :from   [:volley_teams]
                                     :where  [:= :is_active 1]})
             players-r  (db/query+ {:select [[[:count :*] :total]]
                                     :from   [:volley_players]
                                     :where  [:= :is_active 1]})
             matches-r  (db/query+ {:select [[[:count :*] :total]]
                                     :from   [:volley_matches]})
             log-r      (db/query+ {:select   [[:created_at :last_scrape_time]]
                                     :from     [:volley_scrape_logs]
                                     :where    [:= :status "success"]
                                     :order-by [[:created_at :desc]]
                                     :limit    1})]
            (cf/response-edn {:totalLeagues   (-> leagues-r  :results first :total)
                               :totalTeams     (-> teams-r    :results first :total)
                               :totalPlayers   (-> players-r  :results first :total)
                               :totalMatches   (-> matches-r  :results first :total)
                               :totalSeries    0
                               :lastScrapeTime (-> log-r :results first :last_scrape_time)}
                              {:status 200})))

(defn get-scrape-logs [{:keys [_request _env]}]
  (js-await [{:keys [success results]} (db/query+ {:select   [:*]
                                                    :from     [:volley_scrape_logs]
                                                    :order-by [[:created_at :desc]]
                                                    :limit    50})]
            (if success
              (cf/response-edn results {:status 200})
              (cf/response-error "Failed to load scrape logs"))))

;; ── admin auth endpoints ─────────────────────────────────────────────────────

(defn- issue-admin-token [env {:keys [id username role superadmin]}]
  (let [claims (cond-> #js {:id       id
                            :username username
                            :role     role
                            :exp      (+ (js/Math.floor (/ (.now js/Date) 1000)) 86400)}
                 superadmin (doto (aset "superadmin" true)))]
    (.sign jwt claims (aget env "JWT_SECRET"))))

(defn- super-admin-user
  "The super admin is not stored in the database: its credentials come from the
   SUPER_ADMIN_USERNAME / SUPER_ADMIN_PASSWORD environment secrets (same pattern
   as property-management-v's SUPER_ADMIN_EMAIL). Returns the user map when the
   submitted credentials match, nil otherwise."
  [env username password]
  (let [su-name (aget env "SUPER_ADMIN_USERNAME")
        su-pass (aget env "SUPER_ADMIN_PASSWORD")]
    (when (and su-name su-pass
               (= username su-name)
               (= password su-pass))
      {:id 0 :username su-name :role "superadmin" :superadmin true})))

(defn admin-login [{:keys [request env]}]
  (js-await [data (cf/request->auto request)]
            (if-let [super (super-admin-user env (:username data) (:password data))]
              (cf/response-edn {:message "Login successful"
                                :token   (issue-admin-token env super)
                                :user    super}
                               {:status 200})
              ;; fall back to database-managed admin users
              (js-await [{:keys [success results]} (db/query+ {:select [:*]
                                                               :from   [:volley_admin_users]
                                                               :where  [:= :username (:username data)]})]
                        (let [user (first results)]
                          (if-not (and success user)
                            (cf/response-edn {:message "Invalid credentials"} {:status 401})
                            (js-await [hashed (hash-password (:password data))]
                                      (if (not= hashed (:password_hash user))
                                        (cf/response-edn {:message "Invalid credentials"} {:status 401})
                                        (cf/response-edn {:message "Login successful"
                                                          :token   (issue-admin-token env {:id       (:id user)
                                                                                           :username (:username user)
                                                                                           :role     (:role user)})
                                                          :user    {:id       (:id user)
                                                                    :username (:username user)
                                                                    :role     (:role user)}}
                                                         {:status 200})))))))))

(defn admin-logout [{:keys [_request _env]}]
  (cf/response-edn {:message "Logout successful"} {:status 200}))

(defn admin-session [{:keys [_request _env user]}]
  (if user
    (cf/response-edn {:isAuthenticated true
                      :user            (js->clj user :keywordize-keys true)}
                     {:status 200})
    (cf/response-edn {:isAuthenticated false} {:status 200})))

(defn admin-setup [{:keys [request env]}]
  (js-await [{:keys [success results]} (db/query+ {:select [[[:count :*] :total]]
                                                    :from   [:volley_admin_users]})
             data                      (cf/request->auto request)]
            (let [cnt (-> results first :total (or 0))]
              (if (> cnt 0)
                (cf/response-edn {:message "Admin user already exists"} {:status 409})
                (js-await [hashed            (hash-password (:password data))
                           {:keys [success]} (db/run+ env {:insert-into :volley_admin_users
                                                           :columns     [:username :password_hash :email :role]
                                                           :values      [[(:username data)
                                                                          hashed
                                                                          (:email data)
                                                                          "admin"]]})]
                          (if success
                            (cf/response-edn {:message "Admin user created successfully"} {:status 201})
                            (cf/response-error "Failed to create admin user")))))))

;; ── scraping endpoints ────────────────────────────────────────────────────────

(defn trigger-scrape [{:keys [request env]}]
  (js-await [data (cf/request->auto request)]
            (let [url         (:url data)
                  league-name (or (:leagueName data) (str "League from " url))
                  category    (or (:category data) "General")]
              (if-not url
                (cf/response-edn {:error "url is required"} {:status 400})
                (js-await [result (scraper/scrape-league! env url league-name category)]
                          (cf/response-edn {:message (str "Scraping done for: " league-name) :data result} {:status 200}))))))

(defn trigger-scrape-all [{:keys [_request env execution-ctx]}]
  (.waitUntil execution-ctx (scraper/scrape-all-leagues! env))
  (cf/response-edn {:message "Scraping started for all active leagues"} {:status 200}))

(defn trigger-league-scrape [{:keys [route env execution-ctx]}]
  (let [id (js/parseInt (-> route :path-params :id) 10)]
    (js-await [{:keys [success results]} (db/query+ {:select [:*]
                                                      :from   [:volley_leagues]
                                                      :where  [:= :id id]})]
              (let [league (first results)]
                (if-not (and success league)
                  (cf/response-error "League not found" {:status 404})
                  (if-not (:url league)
                    (cf/response-error "League URL not set" {:status 400})
                    (do
                      (.waitUntil execution-ctx
                                   (scraper/scrape-league! env (:url league) (:name league) (:category league)))
                      (cf/response-edn {:message (str "Scraping started for league: " (:name league))} {:status 200}))))))))
