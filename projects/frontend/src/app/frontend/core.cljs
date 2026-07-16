(ns app.frontend.core
  "Project-level composition root: wires the UI components together with
   Integrant and hands the assembled app to the web base's entry point."
  (:require [integrant.core :as ig]
            [app.web.core :as web]
            [app.web.interceptors :as interceptors]
            [app.auth-ui.interface :as auth]
            [app.register-ui.interface :as register]
            [app.main-ui.interface :as main]))

(def config
  {::interceptors/storage {}
   ::auth/component       {:local-storage (ig/ref ::interceptors/storage)}
   ::register/component   {:local-storage (ig/ref ::interceptors/storage)}
   ::main/component       {:auth-page     (ig/ref ::auth/component)
                           :register-page (ig/ref ::register/component)}
   ::web/entry-point      {:main-ui (ig/ref ::main/component)}})

(defonce system (atom nil))

(defn start []
  (reset! system (ig/init config)))

(defn stop []
  (when @system
    (ig/halt! @system)
    (reset! system nil)))

(defn restart []
  (stop)
  (start))

(defn init []
  (start))
