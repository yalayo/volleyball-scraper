(ns app.match.interface
  (:require [integrant.core :as ig]
            [app.match.routes :as routes]))

(defn get-routes [] routes/routes)

(defmethod ig/init-key ::routes [_ _] routes/routes)
