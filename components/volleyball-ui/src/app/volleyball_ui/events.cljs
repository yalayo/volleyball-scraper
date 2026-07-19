(ns app.volleyball-ui.events
  "Loads the volleyball data through the unified query endpoint:
   every read is a POST /api/query {:entity <kw>} carrying the admin token."
  (:require [re-frame.core :as re-frame :refer [after]]
            [day8.re-frame.http-fx]
            [ajax.edn :as ajax-edn]
            [app.volleyball-ui.db :as db]
            [app.volleyball-ui.config :as config]))

(def local-storage-interceptor (after db/db->local-store))

(defn- query-fx
  "Effect map for one entity query against /api/query."
  [db entity on-success on-failure]
  {:http-xhrio {:method          :post
                :uri             (str (config/get-api-url) "/api/query")
                :params          {:entity entity}
                :headers         {"Authorization" (str "Bearer " (get-in db [:user :token] ""))}
                :format          (ajax-edn/edn-request-format)
                :response-format (ajax-edn/edn-response-format)
                :timeout         8000
                :on-success      on-success
                :on-failure      on-failure}})

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
 (fn [{:keys [db]} _]
   (query-fx db :stats [::stats-loaded] [::query-error "stats"])))

(re-frame/reg-event-db
 ::stats-loaded
 (fn [db [_ response]]
   (-> db
       (assoc-in [:volleyball :stats] (:data response))
       (assoc-in [:volleyball :loading?] false))))

;; Leagues

(re-frame/reg-event-fx
 ::load-leagues
 (fn [{:keys [db]} _]
   (query-fx db :league [::leagues-loaded] [::query-error "leagues"])))

(re-frame/reg-event-db
 ::leagues-loaded
 (fn [db [_ response]]
   (assoc-in db [:volleyball :leagues] (:data response))))

;; Teams

(re-frame/reg-event-fx
 ::load-teams
 (fn [{:keys [db]} _]
   (query-fx db :team [::teams-loaded] [::query-error "teams"])))

(re-frame/reg-event-db
 ::teams-loaded
 (fn [db [_ response]]
   (assoc-in db [:volleyball :teams] (:data response))))

;; Players

(re-frame/reg-event-fx
 ::load-players
 (fn [{:keys [db]} _]
   (query-fx db :player [::players-loaded] [::query-error "players"])))

(re-frame/reg-event-db
 ::players-loaded
 (fn [db [_ response]]
   (assoc-in db [:volleyball :players] (:data response))))

;; Matches

(re-frame/reg-event-fx
 ::load-matches
 (fn [{:keys [db]} _]
   (query-fx db :match [::matches-loaded] [::query-error "matches"])))

(re-frame/reg-event-db
 ::matches-loaded
 (fn [db [_ response]]
   (assoc-in db [:volleyball :matches] (:data response))))

;; Scrape logs

(re-frame/reg-event-fx
 ::load-scrape-logs
 (fn [{:keys [db]} _]
   (query-fx db :scrape-log [::scrape-logs-loaded] [::query-error "scrape logs"])))

(re-frame/reg-event-db
 ::scrape-logs-loaded
 (fn [db [_ response]]
   (assoc-in db [:volleyball :scrape-logs] (:data response))))

;; Tracked games (live game tracker)

(re-frame/reg-event-fx
 ::load-stat-games
 (fn [{:keys [db]} _]
   (query-fx db :stat-game [::stat-games-loaded] [::query-error "tracked games"])))

(re-frame/reg-event-db
 ::stat-games-loaded
 (fn [db [_ response]]
   (assoc-in db [:volleyball :stat-games] (:data response))))

(re-frame/reg-event-fx
 ::save-game
 (fn [{:keys [db]} [_ game-data]]
   {:db (assoc-in db [:volleyball :save-game-status] "saving")
    :http-xhrio {:method          :post
                 :uri             (str (config/get-api-url) "/api/command")
                 :params          {:command :save-game :data game-data}
                 :headers         {"Authorization" (str "Bearer " (get-in db [:user :token] ""))}
                 :format          (ajax-edn/edn-request-format)
                 :response-format (ajax-edn/edn-response-format)
                 :timeout         8000
                 :on-success      [::game-saved]
                 :on-failure      [::save-game-error]}}))

(re-frame/reg-event-fx
 ::game-saved
 (fn [{:keys [db]} _]
   {:db       (assoc-in db [:volleyball :save-game-status] "saved")
    :dispatch [::load-stat-games]}))

(re-frame/reg-event-fx
 ::save-game-error
 (fn [{:keys [db]} [_ error]]
   (js/console.error "Failed to save game:" error)
   {:db (assoc-in db [:volleyball :save-game-status] "error")}))

(re-frame/reg-event-db
 ::reset-save-game-status
 (fn [db _]
   (assoc-in db [:volleyball :save-game-status] nil)))

;; Errors

(re-frame/reg-event-fx
 ::query-error
 (fn [_ [_ what error]]
   (js/console.error (str "Failed to load " what ":") error)
   {}))
