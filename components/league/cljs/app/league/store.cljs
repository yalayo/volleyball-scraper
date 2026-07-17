(ns app.league.store
  "Storage-backed persistence for leagues (EAV entity type \"league\")."
  (:require [app.storage.interface :as storage]))

(defn- now [] (.toISOString (js/Date.)))

(defn- clean [m] (into {} (remove (comp nil? val) m)))

(defn ->api
  "Entity map → API shape (camelCase, as the React UI expects)."
  [e]
  {:id         (:db/id e)
   :name       (:league/name e)
   :category   (:league/category e)
   :url        (:league/url e)
   :seriesId   (:league/series-id e)
   :samsId     (:league/sams-id e)
   :teamsCount (or (:league/teams-count e) 0)
   :isActive   (not= false (:league/active? e))
   :createdAt  (:league/created-at e)
   :updatedAt  (:league/updated-at e)})

(defn find-all+
  "All active leagues in API shape, name-ascending."
  []
  (-> (storage/find-by-type "league")
      (.then #(storage/pull-many % '*))
      (.then (fn [es]
               (->> es
                    (filter #(and (:league/name %) (not= false (:league/active? %))))
                    (sort-by :league/name)
                    (mapv ->api))))))

(defn by-id+ [eid]
  (-> (storage/entity eid)
      (.then (fn [e] (when (:league/name e) (->api e))))))

(defn- find-id+ [name category]
  (-> (storage/q {:where [['?e :league/name name]
                          ['?e :league/category category]]})
      (.then first)))

(defn upsert!+
  "Creates or updates a league identified by name+category. Resolves to its eid."
  [{:keys [name category url series-id sams-id]}]
  (-> (find-id+ name category)
      (.then (fn [eid]
               (if eid
                 (-> (storage/transact!
                      [(clean {:db/id             eid
                               :db/type           "league"
                               :league/url        url
                               :league/series-id  series-id
                               :league/sams-id    sams-id
                               :league/updated-at (now)})])
                     (.then (fn [_] eid)))
                 (-> (storage/transact!
                      [(clean {:db/type           "league"
                               :league/name       name
                               :league/category   category
                               :league/url        url
                               :league/series-id  series-id
                               :league/sams-id    sams-id
                               :league/active?    true
                               :league/created-at (now)
                               :league/updated-at (now)})])
                     (.then (fn [r] (first (:entity-ids r))))))))))

(defn create!+ [{:keys [name category url series-id sams-id teams-count]}]
  (-> (storage/transact!
       [(clean {:db/type            "league"
                :league/name        name
                :league/category    category
                :league/url         url
                :league/series-id   series-id
                :league/sams-id     sams-id
                :league/teams-count (or teams-count 0)
                :league/active?     true
                :league/created-at  (now)
                :league/updated-at  (now)})])
      (.then (fn [r] (first (:entity-ids r))))))

(defn update!+ [eid {:keys [name category url series-id sams-id teams-count]}]
  (storage/transact!
   [(clean {:db/id              eid
            :db/type            "league"
            :league/name        name
            :league/category    category
            :league/url         url
            :league/series-id   series-id
            :league/sams-id     sams-id
            :league/teams-count teams-count
            :league/updated-at  (now)})]))

(defn set-teams-count!+ [eid n]
  (storage/transact! [[:db/add eid :league/teams-count n]
                      [:db/add eid :league/updated-at (now)]]))

(defn delete!+
  "Permanently removes the league entity (excision)."
  [eid]
  (storage/excise! eid))
