(ns app.league.handler
  (:require [app.worker.async :refer [js-await]]
            [app.worker.cf :as cf]
            [app.league.store :as store]))

(defn get-all [{:keys [_request _env]}]
  (js-await [leagues (store/find-all+)]
            (cf/response-edn leagues {:status 200})))

(defn get-one [{:keys [route _request _env]}]
  (let [id (-> route :path-params :id)]
    (js-await [league (store/by-id+ id)]
              (if league
                (cf/response-edn league {:status 200})
                (cf/response-error "League not found" {:status 404})))))

(defn create [{:keys [request _env]}]
  (js-await [data (cf/request->auto request)
             _    (store/create!+ {:name        (:name data)
                                   :category    (:category data)
                                   :url         (:url data)
                                   :series-id   (:series-id data)
                                   :sams-id     (:sams-id data)
                                   :teams-count (:teams-count data)})]
            (cf/response-edn {:message "League created"} {:status 201})))

(defn update! [{:keys [route request _env]}]
  (let [id (-> route :path-params :id)]
    (js-await [data (cf/request->auto request)
               _    (store/update!+ id {:name        (:name data)
                                        :category    (:category data)
                                        :url         (:url data)
                                        :series-id   (:series-id data)
                                        :sams-id     (:sams-id data)
                                        :teams-count (:teams-count data)})]
              (cf/response-edn {:message "League updated"} {:status 200}))))

(defn delete [{:keys [route _request _env]}]
  (let [id (-> route :path-params :id)]
    (js-await [_ (store/delete!+ id)]
              (cf/response-edn {:message "League deleted"} {:status 200}))))
