(ns app.auth-ui.subs
  (:require [re-frame.core :as re-frame]))

(re-frame/reg-sub
 ::current-user
 (fn [db _]
   (get-in db [:user :info])))

(re-frame/reg-sub
 ::sign-in-loading
 (fn [db _]
   (get-in db [:user :sign-in :loading?] false)))

(re-frame/reg-sub
 ::auth-token
 (fn [db _]
   (get-in db [:user :token])))

(re-frame/reg-sub
 ::sign-in-error
 (fn [db _]
   (get-in db [:user :sign-in :error])))

(re-frame/reg-sub
 ::logged-in?
 (fn [db _]
   (get-in db [:user :user-loged-in?] false)))

(re-frame/reg-sub
 ::user-role
 (fn [db _]
   (get-in db [:user :info :role])))
