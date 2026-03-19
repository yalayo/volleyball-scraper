(ns app.team.interface
  (:require [integrant.core :as ig]
            [app.team.routes :as routes]))

(defn get-routes [] routes/routes)

(defmethod ig/init-key ::routes [_ _] routes/routes)
