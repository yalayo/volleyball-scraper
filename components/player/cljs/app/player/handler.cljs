(ns app.player.handler
  (:require [app.worker.async :refer [js-await]]
            [app.worker.cf :as cf]
            [app.player.store :as store]))

(defn get-all [{:keys [_request _env]}]
  (js-await [players (store/find-all+)]
            (cf/response-edn players {:status 200})))

(defn get-by-team [{:keys [route _request _env]}]
  (let [team-id (-> route :path-params :teamId)]
    (js-await [players (store/find-by-team+ team-id)]
              (cf/response-edn players {:status 200}))))
