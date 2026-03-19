(ns app.player.interface
  (:require [integrant.core :as ig]
            [app.player.routes :as routes]))

(defn get-routes [] routes/routes)

(defmethod ig/init-key ::routes [_ _] routes/routes)
