(ns app.main-ui.events
  (:require [re-frame.core :as re-frame :refer [after]]
            [cljs.reader]
            [app.main-ui.db :as db]
            [day8.re-frame.http-fx]
            [ajax.edn :as ajax-edn]
            [app.auth-ui.config :as config]))

(def local-storage-interceptor (after db/db->local-store))

(re-frame/reg-event-db
 ::change-active-section
 [local-storage-interceptor]
 (fn [db [_ id _]]
   (assoc-in db [:ui :active-section] id)))

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

(re-frame/reg-event-db
 ::signed-out
 [local-storage-interceptor]
 (fn [db _]
   (-> db
       (assoc-in [:user :info] nil)
       (assoc-in [:user :token] nil)
       (assoc-in [:user :user-loged-in?] false)
       (assoc-in [:user :sign-out :loading?] false)
       (assoc-in [:ui :active-section] "auth"))))
