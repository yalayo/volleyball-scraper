(ns app.league.handler
  (:require [app.worker.async :refer [js-await]]
            [app.worker.db :as db]
            [app.worker.cf :as cf]))

(defn get-all [{:keys [_request _env]}]
  (js-await [{:keys [success results]} (db/query+ {:select   [:*]
                                                    :from     [:volley_leagues]
                                                    :where    [:= :is_active 1]
                                                    :order-by [[:name :asc]]})]
            (if success
              (cf/response-edn results {:status 200})
              (cf/response-error "Failed to load leagues"))))

(defn get-one [{:keys [route _request _env]}]
  (let [id (js/parseInt (-> route :path-params :id) 10)]
    (js-await [{:keys [success results]} (db/query+ {:select [:*]
                                                      :from   [:volley_leagues]
                                                      :where  [:= :id id]})]
              (if success
                (if-let [league (first results)]
                  (cf/response-edn league {:status 200})
                  (cf/response-error "League not found" {:status 404}))
                (cf/response-error "Failed to load league")))))

(defn create [{:keys [request env]}]
  (js-await [data                (cf/request->edn request)
             {:keys [success]}   (db/run+ env {:insert-into :volley_leagues
                                               :columns     [:name :category :url :series_id :sams_id :teams_count]
                                               :values      [[(:name data)
                                                              (:category data)
                                                              (:url data)
                                                              (:series-id data)
                                                              (:sams-id data)
                                                              (or (:teams-count data) 0)]]})]
            (if success
              (cf/response-edn {:message "League created"} {:status 201})
              (cf/response-error "Failed to create league"))))

(defn update! [{:keys [route request env]}]
  (let [id (js/parseInt (-> route :path-params :id) 10)]
    (js-await [data               (cf/request->edn request)
               {:keys [success]}  (db/run+ env {:update :volley_leagues
                                                :set    {:name        (:name data)
                                                         :category    (:category data)
                                                         :url         (:url data)
                                                         :series_id   (:series-id data)
                                                         :sams_id     (:sams-id data)
                                                         :teams_count (:teams-count data)
                                                         :updated_at  (js/Date. (.now js/Date))}
                                                :where  [:= :id id]})]
              (if success
                (cf/response-edn {:message "League updated"} {:status 200})
                (cf/response-error "Failed to update league")))))

(defn delete [{:keys [route _request env]}]
  (let [id (js/parseInt (-> route :path-params :id) 10)]
    (js-await [{:keys [success]} (db/run+ env {:delete-from :volley_leagues
                                               :where       [:= :id id]})]
              (if success
                (cf/response-edn {:message "League deleted"} {:status 200})
                (cf/response-error "Failed to delete league")))))
