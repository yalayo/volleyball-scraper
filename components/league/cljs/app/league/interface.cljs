(ns app.league.interface
  (:require [integrant.core :as ig]
            [app.league.routes :as routes]))

(defn get-routes [] routes/routes)

(defmethod ig/init-key ::routes [_ _] routes/routes)
