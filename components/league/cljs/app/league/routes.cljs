(ns app.league.routes
  (:require [app.league.handler :as handler]))

(def routes
  [["/leagues"
    {:get  {:handler handler/get-all}
     :post {:handler handler/create}}]
   ["/leagues/:id"
    {:get    {:handler handler/get-one}
     :put    {:handler handler/update!}
     :delete {:handler handler/delete}}]])
