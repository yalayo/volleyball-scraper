(ns app.match.scraper
  "Imperative shell of the league scraper: fetches SAMS pages and persists
   what app.match.core extracts. All parsing lives in the functional core."
  (:require [app.worker.async :refer [js-await]]
            [app.worker.db :as db]
            [app.match.core :as core]))

;; ── fetch ─────────────────────────────────────────────────────────────────────

(def ^:private user-agent
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36")

(defn- fetch-html [url]
  (let [controller (js/AbortController.)
        timer      (js/setTimeout #(.abort controller) 20000)]
    (js-await [resp (js/fetch url #js {:headers #js {"User-Agent" user-agent}
                                       :signal  (.-signal controller)})]
              (js/clearTimeout timer)
              (if (.-ok resp)
                (.text resp)
                (throw (js/Error. (str "HTTP " (.-status resp) " fetching " url)))))))

;; ── promise helpers ───────────────────────────────────────────────────────────

(defn- sequentially+
  "Runs (f item) one after another (SAMS rate-limits parallel hits),
   resolving to the vector of results."
  [f items]
  (reduce (fn [acc-p item]
            (.then acc-p (fn [acc]
                           (.then (js/Promise.resolve (f item))
                                  (fn [r] (conj acc r))))))
          (js/Promise.resolve [])
          items))

;; ── DB upserts ────────────────────────────────────────────────────────────────

(defn- upsert-league! [env {:keys [name category url series-id sams-id]}]
  (js-await [{:keys [results]} (db/query+ {:select [:id]
                                           :from   [:volley_leagues]
                                           :where  [:and [:= :name name] [:= :category category]]})]
            (if-let [existing (first results)]
              (js-await [_ (db/run+ env {:update :volley_leagues
                                         :set    {:url url :series_id series-id :sams_id sams-id
                                                  :updated_at [:raw "datetime('now')"]}
                                         :where  [:= :id (:id existing)]})]
                        (:id existing))
              (js-await [r (db/run+ env {:insert-into :volley_leagues
                                         :columns     [:name :category :url :series_id :sams_id :is_active]
                                         :values      [[name category url series-id sams-id 1]]})]
                        (-> r :meta :last_row_id)))))

(defn- upsert-team! [env {:keys [name team-id league-id homepage logo-url]}]
  (js-await [{:keys [results]} (db/query+ {:select [:id]
                                           :from   [:volley_teams]
                                           :where  [:= :team_id team-id]})]
            (if-let [existing (first results)]
              (js-await [_ (db/run+ env {:update :volley_teams
                                         :set    {:name name :league_id league-id
                                                  :homepage homepage :logo_url logo-url
                                                  :updated_at [:raw "datetime('now')"]}
                                         :where  [:= :id (:id existing)]})]
                        (:id existing))
              (js-await [r (db/run+ env {:insert-into :volley_teams
                                         :columns     [:name :team_id :league_id :homepage :logo_url :is_active]
                                         :values      [[name team-id league-id homepage logo-url 1]]})]
                        (-> r :meta :last_row_id)))))

(defn- upsert-player! [env {:keys [name player-id jersey-number position nationality team-id]}]
  (js-await [{:keys [results]} (db/query+ {:select [:id]
                                           :from   [:volley_players]
                                           :where  (if player-id
                                                     [:and [:= :player_id player-id] [:= :team_id team-id]]
                                                     [:and [:= :team_id team-id] [:= :name name]])})]
            (if-let [existing (first results)]
              (js-await [_ (db/run+ env {:update :volley_players
                                         :set    {:name name :jersey_number jersey-number
                                                  :position position :nationality nationality
                                                  :updated_at [:raw "datetime('now')"]}
                                         :where  [:= :id (:id existing)]})]
                        (:id existing))
              (js-await [r (db/run+ env {:insert-into :volley_players
                                         :columns     [:name :player_id :jersey_number :position :nationality :team_id :is_active]
                                         :values      [[name player-id jersey-number position nationality team-id 1]]})]
                        (-> r :meta :last_row_id)))))

(defn- upsert-match!
  "Matches carry a stable SAMS matchId, so results of already-stored fixtures
   are updated in place once they are played."
  [env {:keys [match-id home-team-name away-team-name home-team-id away-team-id
               home-score away-score home-sets away-sets set-results
               match-date status location sams-url league-id series-id]}]
  (js-await [{:keys [results]} (db/query+ {:select [:id]
                                           :from   [:volley_matches]
                                           :where  [:= :match_id match-id]})]
            (if-let [existing (first results)]
              (db/run+ env {:update :volley_matches
                            :set    {:home_team_id home-team-id :away_team_id away-team-id
                                     :home_team_name home-team-name :away_team_name away-team-name
                                     :home_score home-score :away_score away-score
                                     :home_sets home-sets :away_sets away-sets
                                     :set_results set-results :match_date match-date
                                     :status status :location location
                                     :updated_at [:raw "datetime('now')"]}
                            :where  [:= :id (:id existing)]})
              (db/run+ env {:insert-into :volley_matches
                            :columns     [:match_id :home_team_id :away_team_id
                                          :home_team_name :away_team_name
                                          :home_score :away_score :home_sets :away_sets
                                          :set_results :match_date :status :location :sams_url
                                          :league_id :series_id]
                            :values      [[match-id home-team-id away-team-id
                                           home-team-name away-team-name
                                           home-score away-score home-sets away-sets
                                           set-results match-date status location sams-url
                                           league-id series-id]]}))))

(defn- log-scrape! [env operation status message details duration created updated processed]
  (db/run+ env {:insert-into :volley_scrape_logs
                :columns     [:operation :status :message :details
                              :duration :records_created :records_updated :records_processed]
                :values      [[operation status message details
                               duration created updated processed]]}))

;; ── scraping steps ────────────────────────────────────────────────────────────

(defn- scrape-players-for-team!
  "Fetches a team's roster page and persists its players. Resolves to the
   number of players found; roster pages that fail don't abort the league run."
  [env base-url series-id team team-id->db-id]
  (-> (fetch-html (core/build-team-roster-url base-url series-id (:team-id team)))
      (.then #(core/extract-players % (get team-id->db-id (:team-id team))))
      (.then (fn [players]
               (js-await [_ (sequentially+ #(upsert-player! env %) players)]
                         (count players))))
      (.catch (fn [err]
                (js/console.error "Roster scrape failed for team" (:name team) ":" (.-message err))
                0))))

;; ── main entry points ─────────────────────────────────────────────────────────

(defn scrape-league!
  "Scrapes one SAMS league page end to end: league metadata, all teams,
   every team's player roster and the full playing schedule (played and
   upcoming matches). Resolves to a summary map."
  [env url league-name category]
  (let [start-ms (.now js/Date)]
    (->
     (js-await
      [html (fetch-html url)]
      (let [series-id   (core/extract-series-id url html)
            sams-id     (core/extract-sams-id html)
            league-name (or league-name (core/extract-league-name html))]
        (when-not series-id
          (throw (js/Error. (str "No matchSeriesId found on " url))))
        (js-await
         [league-id  (upsert-league! env {:name      league-name
                                          :category  category
                                          :url       url
                                          :series-id series-id
                                          :sams-id   sams-id})
          teams-html (fetch-html (core/build-team-overview-url url series-id))]
         (let [teams (core/extract-teams teams-html league-id)]
           (js-await
            [team-db-ids (sequentially+ #(upsert-team! env %) teams)]
            (let [team-id->db-id (zipmap (map :team-id teams) team-db-ids)]
              (js-await
               [player-counts (sequentially+
                               #(scrape-players-for-team! env url series-id % team-id->db-id)
                               teams)
                match-html    (fetch-html (core/build-matches-url url series-id))]
               (let [matches (-> (core/extract-matches match-html series-id league-id url)
                                 (core/link-matches-to-teams team-id->db-id))
                     summary {:teams   (count teams)
                              :players (reduce + 0 player-counts)
                              :matches (count matches)}]
                 (js-await
                  [_ (sequentially+ #(upsert-match! env %) matches)
                   _ (db/run+ env {:update :volley_leagues
                                   :set    {:teams_count (count teams)
                                            :updated_at  [:raw "datetime('now')"]}
                                   :where  [:= :id league-id]})
                   _ (log-scrape! env
                                  (str "scrape:" league-name)
                                  "success"
                                  (str "Scraped " league-name ": "
                                       (:teams summary) " teams, "
                                       (:players summary) " players, "
                                       (:matches summary) " matches")
                                  (str "url=" url " series=" series-id)
                                  (- (.now js/Date) start-ms)
                                  (:teams summary)
                                  (:players summary)
                                  (+ (:teams summary) (:players summary) (:matches summary)))]
                  summary)))))))))
     (.catch
      (fn [err]
        (js/console.error "Scrape failed:" err)
        (js-await [_ (log-scrape! env
                                  (str "scrape:" (or league-name url))
                                  "error"
                                  (str "Failed to scrape " (or league-name url) ": " (.-message err))
                                  (.-stack err)
                                  (- (.now js/Date) start-ms)
                                  0 0 0)]
                  {:error (.-message err)}))))))

(defn scrape-all-leagues!
  "Scrapes every active league that has a URL, one after another.
   Resolves to a vector of per-league summary maps."
  [env]
  (js-await [{:keys [results]} (db/query+ {:select   [:*]
                                           :from     [:volley_leagues]
                                           :where    [:= :is_active 1]
                                           :order-by [[:name :asc]]})]
            (sequentially+
             (fn [{:keys [url name category]}]
               (js-await [summary (scrape-league! env url name category)]
                         (assoc summary :league name)))
             (filter :url results))))
