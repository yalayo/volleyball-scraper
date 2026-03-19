(ns app.player.routes
  (:require [app.player.handler :as handler]))

(def routes
  [["/players"
    {:get  {:handler handler/get-all}
     :post {:handler handler/create}}]
   ["/teams/:teamId/players"
    {:get {:handler handler/get-by-team}}]
   ["/players/:id"
    {:put    {:handler handler/update}
     :delete {:handler handler/delete}}]])
