(ns app.team.store
  "Storage-backed persistence for teams (EAV entity type \"team\")."
  (:require [app.storage.interface :as storage]))

(defn- now [] (.toISOString (js/Date.)))

(defn- clean [m] (into {} (remove (comp nil? val) m)))

(defn ->api [e]
  {:id        (:db/id e)
   :name      (:team/name e)
   :teamId    (:team/sams-id e)
   :homepage  (:team/homepage e)
   :logoUrl   (:team/logo-url e)
   :leagueId  (:team/league-id e)
   :isActive  (not= false (:team/active? e))
   :createdAt (:team/created-at e)
   :updatedAt (:team/updated-at e)})

(defn- league-index+
  "Resolves to {league-eid {:id .. :name ..}} for joining."
  []
  (-> (storage/find-by-type "league")
      (.then #(storage/pull-many % [:league/name]))
      (.then (fn [ls]
               (into {} (map (fn [l] [(:db/id l) {:id (:db/id l) :name (:league/name l)}]) ls))))))

(defn find-all+
  "All active teams in API shape (with nested :league), name-ascending."
  []
  (-> (js/Promise.all
       #js [(-> (storage/find-by-type "team") (.then #(storage/pull-many % '*)))
            (league-index+)])
      (.then (fn [[teams leagues]]
               (->> teams
                    (filter #(and (:team/name %) (not= false (:team/active? %))))
                    (sort-by :team/name)
                    (mapv (fn [t]
                            (let [api (->api t)]
                              (assoc api
                                     :league     (get leagues (:leagueId api))
                                     :leagueName (:name (get leagues (:leagueId api))))))))))))

(defn by-id+ [eid]
  (-> (storage/entity eid)
      (.then (fn [e] (when (:team/name e) (->api e))))))

(defn find-by-sams-id+ [sams-id]
  (-> (storage/find-by-attr :team/sams-id sams-id)
      (.then first)))

(defn upsert!+
  "Creates or updates a team identified by its SAMS teamId. Resolves to its eid."
  [{:keys [name team-id league-id homepage logo-url]}]
  (-> (find-by-sams-id+ team-id)
      (.then (fn [eid]
               (if eid
                 (-> (storage/transact!
                      [(clean {:db/id           eid
                               :db/type         "team"
                               :team/name       name
                               :team/league-id  league-id
                               :team/homepage   homepage
                               :team/logo-url   logo-url
                               :team/updated-at (now)})])
                     (.then (fn [_] eid)))
                 (-> (storage/transact!
                      [(clean {:db/type         "team"
                               :team/name       name
                               :team/sams-id    team-id
                               :team/league-id  league-id
                               :team/homepage   homepage
                               :team/logo-url   logo-url
                               :team/active?    true
                               :team/created-at (now)
                               :team/updated-at (now)})])
                     (.then (fn [r] (first (:entity-ids r))))))))))
