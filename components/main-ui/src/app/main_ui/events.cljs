(ns app.main-ui.events
  (:require [re-frame.core :as re-frame :refer [after]]
            [cljs.reader]
            [app.main-ui.db :as db]
            [app.main-ui.rules :as rules]
            [day8.re-frame.http-fx]
            [ajax.edn :as ajax-edn]
            [app.auth-ui.config :as config]))

(def local-storage-interceptor (after db/db->local-store))

;; ── Rules effects ─────────────────────────────────────────────────────────────
;; Registered globally so any UI component can navigate through the rules
;; session by returning these effects (reference: core-ui in
;; property-management-v).

(re-frame/reg-fx :rules/navigate
  (fn [intent] (rules/navigate-to! intent)))

(re-frame/reg-fx :rules/logout
  (fn [_] (rules/logout!)))

(re-frame/reg-fx :rules/set-submitting
  (fn [v] (rules/set-submitting! v)))

(re-frame/reg-fx :rules/set-auth
  (fn [{:keys [authenticated? role]}]
    (rules/insert-facts! (boolean authenticated?)
                         (keyword (or role "guest")))))

;; ── Navigation ────────────────────────────────────────────────────────────────

(re-frame/reg-event-fx
 ::change-active-section
 [local-storage-interceptor]
 (fn [{:keys [db]} [_ id _]]
   {:db             (assoc-in db [:ui :active-section] id)
    :rules/navigate (keyword id)}))

(re-frame/reg-event-fx
 ::restore-nav
 (fn [{:keys [db]} _]
   {:rules/navigate (keyword (get-in db [:ui :active-section] "home"))}))

;; Pushes the persisted auth state into the rules session at boot, so a
;; still-valid session from the last visit lands on the dashboard directly.
(re-frame/reg-event-fx
 ::restore-auth
 (fn [{:keys [db]} _]
   {:rules/set-auth {:authenticated? (get-in db [:user :user-loged-in?] false)
                     :role           (get-in db [:user :info :role])}}))

;; ── Sign out ──────────────────────────────────────────────────────────────────

(re-frame/reg-event-fx
 ::sign-out
 (fn [_ _]
   {:http-xhrio {:method          :post
                 :uri             (str (config/get-api-url) "/api/admin/logout")
                 :format          (ajax-edn/edn-request-format)
                 :response-format (ajax-edn/edn-response-format)
                 :timeout         8000
                 :on-success      [::signed-out]
                 :on-failure      [::signed-out]}}))

(re-frame/reg-event-fx
 ::signed-out
 [local-storage-interceptor]
 (fn [{:keys [db]} _]
   {:db (-> db
            (assoc-in [:user :info] nil)
            (assoc-in [:user :token] nil)
            (assoc-in [:user :user-loged-in?] false)
            (assoc-in [:user :sign-out :loading?] false)
            (assoc-in [:ui :active-section] "auth"))
    :rules/logout nil}))
