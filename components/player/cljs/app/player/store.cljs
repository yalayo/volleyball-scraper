(ns app.player.store
  "Storage-backed persistence for players (EAV entity type \"player\")."
  (:require [app.storage.interface :as storage]))

(defn- now [] (.toISOString (js/Date.)))

(defn- clean [m] (into {} (remove (comp nil? val) m)))

(defn ->api [e]
  {:id           (:db/id e)
   :name         (:player/name e)
   :playerId     (:player/sams-id e)
   :jerseyNumber (:player/jersey-number e)
   :position     (:player/position e)
   :nationality  (:player/nationality e)
   :teamId       (:player/team-id e)
   :isActive     (not= false (:player/active? e))
   :createdAt    (:player/created-at e)
   :updatedAt    (:player/updated-at e)})

(defn- team-index+ []
  (-> (storage/find-by-type "team")
      (.then #(storage/pull-many % [:team/name]))
      (.then (fn [ts]
               (into {} (map (fn [t] [(:db/id t) {:id (:db/id t) :name (:team/name t)}]) ts))))))

(defn find-all+
  "All active players in API shape (with nested :team), name-ascending."
  []
  (-> (js/Promise.all
       #js [(-> (storage/find-by-type "player") (.then #(storage/pull-many % '*)))
            (team-index+)])
      (.then (fn [[players teams]]
               (->> players
                    (filter #(and (:player/name %) (not= false (:player/active? %))))
                    (sort-by :player/name)
                    (mapv (fn [p]
                            (let [api (->api p)]
                              (assoc api
                                     :team     (get teams (:teamId api))
                                     :teamName (:name (get teams (:teamId api))))))))))))

(defn find-by-team+
  "Active players of one team, name-ascending."
  [team-eid]
  (-> (storage/find-by-attr :player/team-id team-eid)
      (.then #(storage/pull-many % '*))
      (.then (fn [players]
               (->> players
                    (filter #(not= false (:player/active? %)))
                    (sort-by :player/name)
                    (mapv ->api))))))

(defn- find-existing+
  "Existing player eid by SAMS teamMemberId, or by name within the team."
  [{:keys [player-id name team-id]}]
  (if player-id
    (-> (storage/find-by-attr :player/sams-id player-id) (.then first))
    (-> (storage/q {:where [['?e :player/name name]
                            ['?e :player/team-id team-id]]})
        (.then first))))

(defn upsert!+
  "Creates or updates a player. Resolves to its eid."
  [{:keys [name player-id jersey-number position nationality team-id] :as player}]
  (-> (find-existing+ player)
      (.then (fn [eid]
               (if eid
                 (-> (storage/transact!
                      [(clean {:db/id                eid
                               :db/type              "player"
                               :player/name          name
                               :player/jersey-number jersey-number
                               :player/position      position
                               :player/nationality   nationality
                               :player/team-id       team-id
                               :player/updated-at    (now)})])
                     (.then (fn [_] eid)))
                 (-> (storage/transact!
                      [(clean {:db/type              "player"
                               :player/name          name
                               :player/sams-id       player-id
                               :player/jersey-number jersey-number
                               :player/position      position
                               :player/nationality   nationality
                               :player/team-id       team-id
                               :player/active?       true
                               :player/created-at    (now)
                               :player/updated-at    (now)})])
                     (.then (fn [r] (first (:entity-ids r))))))))))
