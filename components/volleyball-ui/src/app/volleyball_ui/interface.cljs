(ns app.volleyball-ui.interface
  (:require [re-frame.core :as re-frame]
            [app.volleyball-ui.events :as events]
            [app.volleyball-ui.subs]))

(defn load-data []
  (re-frame/dispatch [::events/load-data]))
