(ns app.volleyball-ui.events
  (:require [re-frame.core :as re-frame :refer [after]]
            [day8.re-frame.http-fx]
            [ajax.edn :as ajax-edn]
            [app.volleyball-ui.db :as db]
            [app.volleyball-ui.config :as config]))

(def local-storage-interceptor (after db/db->local-store))

;; Load all data

(re-frame/reg-event-fx
 ::load-data
 (fn [_ _]
   {:dispatch-n [[::load-stats]
                 [::load-leagues]
                 [::load-teams]
                 [::load-players]
                 [::load-matches]
                 [::load-scrape-logs]]}))

;; Stats

(re-frame/reg-event-fx
 ::load-stats
 (fn [_ _]
   {:http-xhrio {:method          :get
                 :uri             (str (config/get-api-url) "/api/stats")
                 :response-format (ajax-edn/edn-response-format)
                 :timeout         8000
                 :on-success      [::stats-loaded]
                 :on-failure      [::stats-error]}}))

(re-frame/reg-event-db
 ::stats-loaded
 (fn [db [_ data]]
   (-> db
       (assoc-in [:volleyball :stats] data)
       (assoc-in [:volleyball :loading?] false))))

(re-frame/reg-event-fx
 ::stats-error
 (fn [_ [_ error]]
   (js/console.error "Failed to load stats:" error)
   {}))

;; Leagues

(re-frame/reg-event-fx
 ::load-leagues
 (fn [_ _]
   {:http-xhrio {:method          :get
                 :uri             (str (config/get-api-url) "/api/leagues")
                 :response-format (ajax-edn/edn-response-format)
                 :timeout         8000
                 :on-success      [::leagues-loaded]
                 :on-failure      [::leagues-error]}}))

(re-frame/reg-event-db
 ::leagues-loaded
 (fn [db [_ data]]
   (assoc-in db [:volleyball :leagues] data)))

(re-frame/reg-event-fx
 ::leagues-error
 (fn [_ [_ error]]
   (js/console.error "Failed to load leagues:" error)
   {}))

;; Teams

(re-frame/reg-event-fx
 ::load-teams
 (fn [_ _]
   {:http-xhrio {:method          :get
                 :uri             (str (config/get-api-url) "/api/teams")
                 :response-format (ajax-edn/edn-response-format)
                 :timeout         8000
                 :on-success      [::teams-loaded]
                 :on-failure      [::teams-error]}}))

(re-frame/reg-event-db
 ::teams-loaded
 (fn [db [_ data]]
   (assoc-in db [:volleyball :teams] data)))

(re-frame/reg-event-fx
 ::teams-error
 (fn [_ [_ error]]
   (js/console.error "Failed to load teams:" error)
   {}))

;; Players

(re-frame/reg-event-fx
 ::load-players
 (fn [_ _]
   {:http-xhrio {:method          :get
                 :uri             (str (config/get-api-url) "/api/players")
                 :response-format (ajax-edn/edn-response-format)
                 :timeout         8000
                 :on-success      [::players-loaded]
                 :on-failure      [::players-error]}}))

(re-frame/reg-event-db
 ::players-loaded
 (fn [db [_ data]]
   (assoc-in db [:volleyball :players] data)))

(re-frame/reg-event-fx
 ::players-error
 (fn [_ [_ error]]
   (js/console.error "Failed to load players:" error)
   {}))

;; Matches

(re-frame/reg-event-fx
 ::load-matches
 (fn [_ _]
   {:http-xhrio {:method          :get
                 :uri             (str (config/get-api-url) "/api/matches")
                 :response-format (ajax-edn/edn-response-format)
                 :timeout         8000
                 :on-success      [::matches-loaded]
                 :on-failure      [::matches-error]}}))

(re-frame/reg-event-db
 ::matches-loaded
 (fn [db [_ data]]
   (assoc-in db [:volleyball :matches] data)))

(re-frame/reg-event-fx
 ::matches-error
 (fn [_ [_ error]]
   (js/console.error "Failed to load matches:" error)
   {}))

;; Scrape logs

(re-frame/reg-event-fx
 ::load-scrape-logs
 (fn [_ _]
   {:http-xhrio {:method          :get
                 :uri             (str (config/get-api-url) "/api/scrape-logs")
                 :response-format (ajax-edn/edn-response-format)
                 :timeout         8000
                 :on-success      [::scrape-logs-loaded]
                 :on-failure      [::scrape-logs-error]}}))

(re-frame/reg-event-db
 ::scrape-logs-loaded
 (fn [db [_ data]]
   (assoc-in db [:volleyball :scrape-logs] data)))

(re-frame/reg-event-fx
 ::scrape-logs-error
 (fn [_ [_ error]]
   (js/console.error "Failed to load scrape logs:" error)
   {}))
