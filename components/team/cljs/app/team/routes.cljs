(ns app.team.routes
  (:require [app.team.handler :as handler]))

(def routes
  [["/teams"
    {:get  {:handler handler/get-all}
     :post {:handler handler/create}}]
   ["/teams/:id"
    {:get    {:handler handler/get-one}
     :put    {:handler handler/update!}
     :delete {:handler handler/delete}}]])
