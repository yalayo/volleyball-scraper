(ns app.team.handler
  (:require [app.worker.async :refer [js-await]]
            [app.worker.cf :as cf]
            [app.team.store :as store]))

(defn get-all [{:keys [_request _env]}]
  (js-await [teams (store/find-all+)]
            (cf/response-edn teams {:status 200})))

(defn get-one [{:keys [route _request _env]}]
  (let [id (-> route :path-params :id)]
    (js-await [team (store/by-id+ id)]
              (if team
                (cf/response-edn team {:status 200})
                (cf/response-error "Team not found" {:status 404})))))
