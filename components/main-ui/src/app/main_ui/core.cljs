(ns app.main-ui.core
  "Shell init: keeps the odoyle rules session in sync with re-frame auth state
   and hands the routed component tree to the web base."
  (:require [re-frame.core :as re-frame]
            [reagent.core :as r]
            [app.auth-ui.subs :as auth-subs]
            [app.main-ui.events :as events]
            [app.main-ui.rules :as rules]
            [app.main-ui.views :as views]))

;; Keeps the odoyle session in sync with the re-frame auth state, so the
;; navigation rules re-evaluate whenever the user signs in or out.
(defonce auth-sync
  (delay
    (r/track!
     (fn []
       (rules/insert-facts!
        @(re-frame/subscribe [::auth-subs/logged-in?])
        (keyword (or @(re-frame/subscribe [::auth-subs/user-role]) "guest")))))))

(defn init [children]
  (re-frame/dispatch-sync [::events/restore-nav])
  (force auth-sync)
  [views/component children])
