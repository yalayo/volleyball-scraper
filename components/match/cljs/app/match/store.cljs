(ns app.match.store
  "Storage-backed persistence for matches and scrape logs
   (EAV entity types \"match\" and \"scrape-log\")."
  (:require [clojure.set :as set]
            [app.storage.interface :as storage]))

(defn- now [] (.toISOString (js/Date.)))

(defn- clean [m] (into {} (remove (comp nil? val) m)))

;; ── matches ───────────────────────────────────────────────────────────────────

(defn ->api [e]
  {:id           (:db/id e)
   :matchId      (:match/sams-id e)
   :homeTeamId   (:match/home-team-id e)
   :awayTeamId   (:match/away-team-id e)
   :homeTeamName (:match/home-team-name e)
   :awayTeamName (:match/away-team-name e)
   :homeScore    (:match/home-score e)
   :awayScore    (:match/away-score e)
   :homeSets     (:match/home-sets e)
   :awaySets     (:match/away-sets e)
   :setResults   (:match/set-results e)
   :matchDate    (:match/date e)
   :status       (:match/status e)
   :location     (:match/location e)
   :samsUrl      (:match/sams-url e)
   :leagueId     (:match/league-id e)
   :seriesId     (:match/series-id e)
   :createdAt    (:match/created-at e)
   :updatedAt    (:match/updated-at e)})

(defn- league-index+ []
  (-> (storage/find-by-type "league")
      (.then #(storage/pull-many % [:league/name]))
      (.then (fn [ls] (into {} (map (fn [l] [(:db/id l) (:league/name l)]) ls))))))

(defn find-all+
  "All matches in API shape (with :leagueName and nested team maps),
   most recent match date first."
  []
  (-> (js/Promise.all
       #js [(-> (storage/find-by-type "match") (.then #(storage/pull-many % '*)))
            (league-index+)])
      (.then (fn [[matches leagues]]
               (->> matches
                    (filter :match/sams-id)
                    (sort-by :match/date #(compare %2 %1))
                    (mapv (fn [m]
                            (let [api (->api m)]
                              (assoc api
                                     :leagueName (get leagues (:leagueId api))
                                     :homeTeam   {:id (:homeTeamId api) :name (:homeTeamName api)}
                                     :awayTeam   {:id (:awayTeamId api) :name (:awayTeamName api)})))))))))

(defn find-by-team+
  "Matches where the team plays home or away, most recent first."
  [team-eid]
  (-> (js/Promise.all
       #js [(storage/find-by-attr :match/home-team-id team-eid)
            (storage/find-by-attr :match/away-team-id team-eid)])
      (.then (fn [[home away]]
               (vec (set/union (set home) (set away)))))
      (.then #(storage/pull-many % '*))
      (.then (fn [matches]
               (->> matches
                    (sort-by :match/date #(compare %2 %1))
                    (mapv ->api))))))

(defn upsert!+
  "Creates or updates a match identified by its stable SAMS matchId, so
   fixtures gain their results in place once played. Resolves to its eid."
  [{:keys [match-id home-team-id away-team-id home-team-name away-team-name
           home-score away-score home-sets away-sets set-results
           match-date status location sams-url league-id series-id]}]
  (let [attrs (clean {:match/home-team-id   home-team-id
                      :match/away-team-id   away-team-id
                      :match/home-team-name home-team-name
                      :match/away-team-name away-team-name
                      :match/home-score     home-score
                      :match/away-score     away-score
                      :match/home-sets      home-sets
                      :match/away-sets      away-sets
                      :match/set-results    set-results
                      :match/date           match-date
                      :match/status         status
                      :match/location       location
                      :match/updated-at     (now)})]
    (-> (storage/find-by-attr :match/sams-id match-id)
        (.then first)
        (.then (fn [eid]
                 (if eid
                   (-> (storage/transact! [(assoc attrs :db/id eid :db/type "match")])
                       (.then (fn [_] eid)))
                   (-> (storage/transact!
                        [(merge attrs
                                (clean {:db/type          "match"
                                        :match/sams-id    match-id
                                        :match/sams-url   sams-url
                                        :match/league-id  league-id
                                        :match/series-id  series-id
                                        :match/created-at (now)}))])
                       (.then (fn [r] (first (:entity-ids r)))))))))))

;; ── scrape logs ───────────────────────────────────────────────────────────────

(defn log->api [e]
  {:id               (:db/id e)
   :operation        (:scrape-log/operation e)
   :status           (:scrape-log/status e)
   :message          (:scrape-log/message e)
   :details          (:scrape-log/details e)
   :duration         (:scrape-log/duration e)
   :recordsCreated   (:scrape-log/records-created e)
   :recordsUpdated   (:scrape-log/records-updated e)
   :recordsProcessed (:scrape-log/records-processed e)
   :createdAt        (:scrape-log/created-at e)})

(defn log!+
  [{:keys [operation status message details duration created updated processed]}]
  (storage/transact!
   [(clean {:db/type                     "scrape-log"
            :scrape-log/operation         operation
            :scrape-log/status            status
            :scrape-log/message           message
            :scrape-log/details           details
            :scrape-log/duration          duration
            :scrape-log/records-created   created
            :scrape-log/records-updated   updated
            :scrape-log/records-processed processed
            :scrape-log/created-at        (now)})]))

(defn recent-logs+
  "Latest scrape logs in API shape, newest first."
  ([] (recent-logs+ 50))
  ([limit]
   (-> (storage/find-by-type "scrape-log")
       (.then #(storage/pull-many % '*))
       (.then (fn [logs]
                (->> logs
                     (sort-by :scrape-log/created-at #(compare %2 %1))
                     (take limit)
                     (mapv log->api)))))))
