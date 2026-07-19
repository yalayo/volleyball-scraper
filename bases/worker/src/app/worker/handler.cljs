(ns app.worker.handler
  "Command/query endpoints, following the property-management-v architecture:
   every write goes through POST /api/command {:command <kw> :data {...}} and
   every read through POST /api/query {:entity <kw> ...}. Both delegate to the
   controller, which consults the pure domain rules before acting."
  (:require [app.worker.async :refer [js-await]]
            [app.worker.cf :as cf]))

(defn command
  "Returns a Reitit route handler that delegates to the controller."
  [controller]
  (fn [{:keys [request env user execution-ctx]}]
    (js-await [body (cf/request->auto request)]
              (let [cmd (keyword (:command body))]
                (js-await [result (controller {:command       cmd
                                               :data          (:data body)
                                               :user          user
                                               :env           env
                                               :execution-ctx execution-ctx})]
                          (cond
                            (= :invalid-credentials (:error result))
                            (cf/response-edn result {:status 401})

                            (= :unauthorized (:error result))
                            (cf/response-edn result {:status 403})

                            (:error result)
                            (cf/response-edn result {:status 400})

                            :else
                            (cf/response-edn result {:status 200})))))))

(def ^:private entity->command
  {:league     :get-leagues
   :team       :get-teams
   :player     :get-players
   :match      :get-matches
   :stats      :get-stats
   :stat-game  :get-stat-games
   :scrape-log :get-scrape-logs})

(defn query
  "Returns a Reitit route handler for POST queries.
   Reads :entity from the body and maps it to a read command."
  [controller]
  (fn [{:keys [request env user]}]
    (js-await [body (cf/request->auto request)]
              (let [entity (keyword (:entity body))
                    cmd    (get entity->command entity)]
                (if-not cmd
                  (cf/response-edn {:error :unknown-entity} {:status 400})
                  (js-await [result (controller {:command cmd
                                                 :data    (dissoc body :entity)
                                                 :user    user
                                                 :env     env})]
                            (if (:error result)
                              (cf/response-edn result {:status 400})
                              (cf/response-edn result {:status 200}))))))))

(defn create-routes [controller]
  [["/command" {:post {:handler (command controller)}}]
   ["/query"   {:post {:handler (query controller) :auth-required true}}]])
