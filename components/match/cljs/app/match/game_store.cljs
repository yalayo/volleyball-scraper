(ns app.match.game-store
  "Storage-backed persistence for live-tracked games (EAV entity type
   \"stat-game\"): set scores, the full action log and per-player points
   recorded courtside with the game tracker."
  (:require [app.storage.interface :as storage]))

(defn- now [] (.toISOString (js/Date.)))

(defn- clean [m] (into {} (remove (comp nil? val) m)))

(defn ->api [e]
  (let [data (:stat-game/data e)]
    {:id          (:db/id e)
     :name        (:stat-game/name e)
     :teamAName   (:stat-game/team-a-name e)
     :teamBName   (:stat-game/team-b-name e)
     :matchId     (:stat-game/match-id e)
     :date        (:stat-game/date e)
     :setsWonA    (:stat-game/sets-won-a e)
     :setsWonB    (:stat-game/sets-won-b e)
     :sets        (:sets data)
     :playerStats (:playerStats data)
     :stats       (:stats data)
     :actions     (:actions data)
     :createdAt   (:stat-game/created-at e)}))

(defn save!+
  "Persists one finished (or abandoned) tracked game. `data` is the camelCase
   payload assembled by the tracker UI; the whole nested structure is stored
   as a single JSON fact, with the headline fields (including the originating
   scheduled matchId, when the game was started from one) lifted out as their
   own attributes for listing. Resolves to the new eid."
  [{:keys [name teamAName teamBName matchId date sets] :as data}]
  (let [sets-won (fn [team]
                   (count (filter #(= team (:winner %)) sets)))]
    (-> (storage/transact!
         [(clean {:db/type               "stat-game"
                  :stat-game/name        (or name (str teamAName " vs " teamBName))
                  :stat-game/team-a-name teamAName
                  :stat-game/team-b-name teamBName
                  :stat-game/match-id    matchId
                  :stat-game/date        (or date (now))
                  :stat-game/sets-won-a  (sets-won "A")
                  :stat-game/sets-won-b  (sets-won "B")
                  :stat-game/data        data
                  :stat-game/created-at  (now)})])
        (.then (fn [r] (first (:entity-ids r)))))))

(defn find-all+
  "All tracked games in API shape, newest first."
  []
  (-> (storage/find-by-type "stat-game")
      (.then #(storage/pull-many % '*))
      (.then (fn [games]
               (->> games
                    (filter :stat-game/team-a-name)
                    (sort-by :stat-game/created-at #(compare %2 %1))
                    (mapv ->api))))))
