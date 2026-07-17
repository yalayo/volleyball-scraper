(ns app.web.core
  "Web base: mounts whatever UI the project's composition root injects.
   Knows nothing about concrete pages — see app.frontend.core in the
   frontend project for the actual wiring."
  (:require [integrant.core :as ig]
            [re-frame.core :as re-frame]
            [reagent.core :as r]
            ["react-dom/client" :as rdom]
            [app.web.events :as events]
            [app.web.views :as views]))

(defonce root (rdom/createRoot (.getElementById js/document "app")))

(defonce mounted-ui (atom nil))

(defn mount-root [main-ui]
  (reset! mounted-ui main-ui)
  (.render root (r/as-element [views/home-component main-ui])))

(defn ^:dev/after-load re-mount []
  ;; Only hot reloads clear the cache — clearing on first mount would dispose
  ;; subscriptions created during Integrant init of the UI components.
  (re-frame/clear-subscription-cache!)
  (when-let [ui @mounted-ui]
    (mount-root ui)))

(defn init [main-ui]
  (re-frame/dispatch-sync [::events/initialize-db])
  (mount-root main-ui))

(defmethod ig/init-key ::entry-point [_ {:keys [main-ui]}]
  (init main-ui))
