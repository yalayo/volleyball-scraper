(ns app.controller.interface
  (:require [integrant.core :as ig]
            [app.controller.core :as core]))

(defmethod ig/init-key ::controller [_ {:keys [core]}]
  (fn [ctx]
    (core/dispatch (assoc ctx :core core))))
