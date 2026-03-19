(ns app.team.handler
  (:require [app.worker.async :refer [js-await]]
            [app.worker.db :as db]
            [app.worker.cf :as cf]))

(defn get-all [{:keys [_request _env]}]
  (js-await [{:keys [success results]} (db/query+ {:select    [:t.*
                                                               [:l.name :league_name]]
                                                    :from      [[:volley_teams :t]]
                                                    :left-join [[:volley_leagues :l] [:= :t.league_id :l.id]]
                                                    :where     [:= :t.is_active 1]
                                                    :order-by  [[:t.name :asc]]})]
            (if success
              (cf/response-edn results {:status 200})
              (cf/response-error "Failed to load teams"))))

(defn get-one [{:keys [route _request _env]}]
  (let [id (js/parseInt (-> route :path-params :id) 10)]
    (js-await [{:keys [success results]} (db/query+ {:select    [:t.*
                                                                 [:l.name :league_name]]
                                                      :from      [[:volley_teams :t]]
                                                      :left-join [[:volley_leagues :l] [:= :t.league_id :l.id]]
                                                      :where     [:= :t.id id]})]
              (if success
                (if-let [team (first results)]
                  (cf/response-edn team {:status 200})
                  (cf/response-error "Team not found" {:status 404}))
                (cf/response-error "Failed to load team")))))

(defn create [{:keys [request env]}]
  (js-await [data              (cf/request->edn request)
             {:keys [success]} (db/run+ env {:insert-into :volley_teams
                                             :columns     [:name :location :team_id :sams_id :homepage
                                                           :logo_url :contact_email :contact_address :league_id]
                                             :values      [[(:name data)
                                                            (:location data)
                                                            (:team-id data)
                                                            (:sams-id data)
                                                            (:homepage data)
                                                            (:logo-url data)
                                                            (:contact-email data)
                                                            (:contact-address data)
                                                            (:league-id data)]]})]
            (if success
              (cf/response-edn {:message "Team created"} {:status 201})
              (cf/response-error "Failed to create team"))))

(defn update! [{:keys [route request env]}]
  (let [id (js/parseInt (-> route :path-params :id) 10)]
    (js-await [data              (cf/request->edn request)
               {:keys [success]} (db/run+ env {:update :volley_teams
                                               :set    {:name            (:name data)
                                                        :location        (:location data)
                                                        :homepage        (:homepage data)
                                                        :logo_url        (:logo-url data)
                                                        :contact_email   (:contact-email data)
                                                        :contact_address (:contact-address data)
                                                        :league_id       (:league-id data)
                                                        :updated_at      (js/Date. (.now js/Date))}
                                               :where  [:= :id id]})]
              (if success
                (cf/response-edn {:message "Team updated"} {:status 200})
                (cf/response-error "Failed to update team")))))

(defn delete [{:keys [route _request env]}]
  (let [id (js/parseInt (-> route :path-params :id) 10)]
    (js-await [{:keys [success]} (db/run+ env {:delete-from :volley_teams
                                               :where       [:= :id id]})]
              (if success
                (cf/response-edn {:message "Team deleted"} {:status 200})
                (cf/response-error "Failed to delete team")))))
