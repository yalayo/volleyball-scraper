(ns app.match.handler
  (:require [app.worker.async :refer [js-await]]
            [app.worker.auth :refer [hash-password]]
            [app.worker.cf :as cf]
            [app.storage.interface :as storage]
            [app.match.store :as store]
            [app.league.store :as league-store]
            [app.user.admin-store :as admin-store]
            [app.match.scraper :as scraper]))

;; ── public data endpoints ────────────────────────────────────────────────────

(defn get-all [{:keys [_request _env]}]
  (js-await [matches (store/find-all+)]
            (cf/response-edn matches {:status 200})))

(defn get-by-team
  "Consumed directly by a browser fetch().json() call (team-detail-modal.tsx),
   not through the EDN-aware re-frame layer — must respond JSON."
  [{:keys [route _request _env]}]
  (let [team-id (-> route :path-params :teamId)]
    (js-await [matches (store/find-by-team+ team-id)]
              (cf/response-json matches {:status 200}))))

(defn get-stats [{:keys [_request _env]}]
  (js-await [leagues (storage/find-by-type "league")
             teams   (storage/find-by-type "team")
             players (storage/find-by-type "player")
             matches (storage/find-by-type "match")
             logs    (store/recent-logs+)]
            (cf/response-edn {:totalLeagues   (count leagues)
                              :totalTeams     (count teams)
                              :totalPlayers   (count players)
                              :totalMatches   (count matches)
                              :totalSeries    0
                              :lastScrapeTime (->> logs
                                                   (filter #(= "success" (:status %)))
                                                   first
                                                   :createdAt)}
                             {:status 200})))

(defn get-scrape-logs [{:keys [_request _env]}]
  (js-await [logs (store/recent-logs+)]
            (cf/response-edn logs {:status 200})))

;; ── admin auth endpoints ─────────────────────────────────────────────────────
;; Sign-in itself goes through POST /api/command {:command :admin-sign-in}.

(defn admin-logout [{:keys [_request _env]}]
  (cf/response-edn {:message "Logout successful"} {:status 200}))

(defn admin-session [{:keys [_request _env user]}]
  (if user
    (cf/response-edn {:isAuthenticated true :user user} {:status 200})
    (cf/response-edn {:isAuthenticated false} {:status 200})))

(defn admin-setup [{:keys [request _env]}]
  (js-await [cnt  (admin-store/count+)
             data (cf/request->auto request)]
            (if (pos? cnt)
              (cf/response-edn {:message "Admin user already exists"} {:status 409})
              (js-await [hashed (hash-password (:password data))
                         _      (admin-store/create!+ {:username      (:username data)
                                                       :password-hash hashed
                                                       :email         (:email data)
                                                       :role          "admin"})]
                        (cf/response-edn {:message "Admin user created successfully"} {:status 201})))))

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
  (let [id (-> route :path-params :id)]
    (js-await [league (league-store/by-id+ id)]
              (cond
                (nil? league)
                (cf/response-error "League not found" {:status 404})

                (nil? (:url league))
                (cf/response-error "League URL not set" {:status 400})

                :else
                (do (.waitUntil execution-ctx
                                (scraper/scrape-league! env (:url league) (:name league) (:category league)))
                    (cf/response-edn {:message (str "Scraping started for league: " (:name league))} {:status 200}))))))
