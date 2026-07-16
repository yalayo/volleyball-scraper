(ns app.main-ui.interface
  (:require [integrant.core :as ig]
            [app.main-ui.core :as core]))

(defmethod ig/init-key ::component [_ children]
  (core/init children))
