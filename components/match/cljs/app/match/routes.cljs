(ns app.match.routes
  (:require [app.match.handler :as handler]))

(def routes
  [["/matches"
    {:get {:handler handler/get-all}}]
   ["/teams/:teamId/matches"
    {:get {:handler handler/get-by-team}}]
   ["/stats"
    {:get {:handler handler/get-stats}}]
   ["/scrape-logs"
    {:get {:handler handler/get-scrape-logs}}]])
