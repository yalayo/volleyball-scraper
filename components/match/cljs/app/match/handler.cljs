(ns app.match.handler
  (:require [app.worker.async :refer [js-await]]
            [app.worker.db :as db]
            [app.worker.cf :as cf]))

(defn get-all [{:keys [_request _env]}]
  (js-await [{:keys [success results]} (db/query+ {:select    [:m.*
                                                               [:ht.name :home_team_name_joined]
                                                               [:at.name :away_team_name_joined]
                                                               [:l.name  :league_name]]
                                                    :from      [[:props_matches :m]]
                                                    :left-join [[:props_teams :ht]   [:= :m.home_team_id :ht.id]
                                                                [:props_teams :at]   [:= :m.away_team_id :at.id]
                                                                [:props_leagues :l]  [:= :m.league_id :l.id]]
                                                    :order-by  [[:m.match_date :desc]]})]
            (if success
              (cf/response-edn results {:status 200})
              (cf/response-error "Failed to load matches"))))

(defn get-by-team [{:keys [route _request _env]}]
  (let [team-id (js/parseInt (-> route :path-params :teamId) 10)]
    (js-await [{:keys [success results]} (db/query+ {:select   [:*]
                                                      :from     [:props_matches]
                                                      :where    [:or
                                                                 [:= :home_team_id team-id]
                                                                 [:= :away_team_id team-id]]
                                                      :order-by [[:match_date :desc]]})]
              (if success
                (cf/response-edn results {:status 200})
                (cf/response-error "Failed to load team matches")))))

(defn get-stats [{:keys [_request _env]}]
  (js-await [{:keys [success results] :as leagues-result} (db/query+ {:select [[[:count :*] :total]]
                                                                       :from   [:props_leagues]
                                                                       :where  [:= :is_active 1]})]
            (js-await [{:keys [success results] :as teams-result} (db/query+ {:select [[[:count :*] :total]]
                                                                               :from   [:props_teams]
                                                                               :where  [:= :is_active 1]})]
                      (js-await [{:keys [success results] :as players-result} (db/query+ {:select [[[:count :*] :total]]
                                                                                           :from   [:props_players]
                                                                                           :where  [:= :is_active 1]})]
                                (js-await [{:keys [success results] :as matches-result} (db/query+ {:select [[[:count :*] :total]]
                                                                                                     :from   [:props_matches]})]
                                          (js-await [{:keys [success results] :as log-result} (db/query+ {:select   [[:created_at :last_scrape_time]]
                                                                                                           :from     [:props_scrape_logs]
                                                                                                           :where    [:= :status "success"]
                                                                                                           :order-by [[:created_at :desc]]
                                                                                                           :limit    1})]
                                                    (cf/response-edn {:totalLeagues  (-> leagues-result  :results first :total)
                                                                      :totalTeams    (-> teams-result    :results first :total)
                                                                      :totalPlayers  (-> players-result  :results first :total)
                                                                      :totalMatches  (-> matches-result  :results first :total)
                                                                      :totalSeries   0
                                                                      :lastScrapeTime (-> log-result :results first :last_scrape_time)}
                                                                     {:status 200})))))))

(defn get-scrape-logs [{:keys [_request _env]}]
  (js-await [{:keys [success results]} (db/query+ {:select   [:*]
                                                    :from     [:props_scrape_logs]
                                                    :order-by [[:created_at :desc]]
                                                    :limit    50})]
            (if success
              (cf/response-edn results {:status 200})
              (cf/response-error "Failed to load scrape logs"))))
