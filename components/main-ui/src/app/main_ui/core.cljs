(ns app.main-ui.core
  "Shell init: restores navigation and auth facts into the odoyle rules
   session and hands the routed component tree to the web base.
   The dispatches are async on purpose: they run after the web base's
   dispatch-sync ::initialize-db, so they see the restored app-db."
  (:require [re-frame.core :as re-frame]
            [app.main-ui.events :as events]
            [app.main-ui.views :as views]))

(defn init [children]
  (re-frame/dispatch [::events/restore-auth])
  (re-frame/dispatch [::events/restore-nav])
  [views/component children])
