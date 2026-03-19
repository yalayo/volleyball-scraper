(ns app.player.handler
  (:require [app.worker.async :refer [js-await]]
            [app.worker.db :as db]
            [app.worker.cf :as cf]))

(defn get-all [{:keys [_request _env]}]
  (js-await [{:keys [success results]} (db/query+ {:select    [:p.*
                                                               [:t.name :team_name]]
                                                    :from      [[:volley_players :p]]
                                                    :left-join [[:volley_teams :t] [:= :p.team_id :t.id]]
                                                    :where     [:= :p.is_active 1]
                                                    :order-by  [[:p.name :asc]]})]
            (if success
              (cf/response-edn results {:status 200})
              (cf/response-error "Failed to load players"))))

(defn get-by-team [{:keys [route _request _env]}]
  (let [team-id (js/parseInt (-> route :path-params :teamId) 10)]
    (js-await [{:keys [success results]} (db/query+ {:select   [:*]
                                                      :from     [:volley_players]
                                                      :where    [:and
                                                                 [:= :team_id team-id]
                                                                 [:= :is_active 1]]
                                                      :order-by [[:name :asc]]})]
              (if success
                (cf/response-edn results {:status 200})
                (cf/response-error "Failed to load team players")))))

(defn create [{:keys [request env]}]
  (js-await [data              (cf/request->edn request)
             {:keys [success]} (db/run+ env {:insert-into :volley_players
                                             :columns     [:name :position :nationality :jersey_number
                                                           :player_id :team_id]
                                             :values      [[(:name data)
                                                            (:position data)
                                                            (:nationality data)
                                                            (:jersey-number data)
                                                            (:player-id data)
                                                            (:team-id data)]]})]
            (if success
              (cf/response-edn {:message "Player created"} {:status 201})
              (cf/response-error "Failed to create player"))))

(defn update! [{:keys [route request env]}]
  (let [id (js/parseInt (-> route :path-params :id) 10)]
    (js-await [data              (cf/request->edn request)
               {:keys [success]} (db/run+ env {:update :volley_players
                                               :set    {:name          (:name data)
                                                        :position      (:position data)
                                                        :nationality   (:nationality data)
                                                        :jersey_number (:jersey-number data)
                                                        :team_id       (:team-id data)
                                                        :updated_at    (js/Date. (.now js/Date))}
                                               :where  [:= :id id]})]
              (if success
                (cf/response-edn {:message "Player updated"} {:status 200})
                (cf/response-error "Failed to update player")))))

(defn delete [{:keys [route _request env]}]
  (let [id (js/parseInt (-> route :path-params :id) 10)]
    (js-await [{:keys [success]} (db/run+ env {:delete-from :volley_players
                                               :where       [:= :id id]})]
              (if success
                (cf/response-edn {:message "Player deleted"} {:status 200})
                (cf/response-error "Failed to delete player")))))
