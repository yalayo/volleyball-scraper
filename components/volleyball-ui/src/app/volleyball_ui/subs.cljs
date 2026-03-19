(ns app.volleyball-ui.subs
  (:require [re-frame.core :as re-frame]))

(re-frame/reg-sub
 ::stats
 (fn [db _]
   (get-in db [:volleyball :stats])))

(re-frame/reg-sub
 ::leagues
 (fn [db _]
   (get-in db [:volleyball :leagues] [])))

(re-frame/reg-sub
 ::teams
 (fn [db _]
   (get-in db [:volleyball :teams] [])))

(re-frame/reg-sub
 ::players
 (fn [db _]
   (get-in db [:volleyball :players] [])))

(re-frame/reg-sub
 ::matches
 (fn [db _]
   (get-in db [:volleyball :matches] [])))

(re-frame/reg-sub
 ::scrape-logs
 (fn [db _]
   (get-in db [:volleyball :scrape-logs] [])))

(re-frame/reg-sub
 ::loading?
 (fn [db _]
   (get-in db [:volleyball :loading?] true)))
