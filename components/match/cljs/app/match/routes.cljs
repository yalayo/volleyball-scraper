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
    {:get {:handler handler/get-scrape-logs}}]

   ;; Admin auth — sign-in goes through POST /api/command {:command :admin-sign-in}
   ["/admin/logout"
    {:post {:handler handler/admin-logout}}]
   ["/admin/session"
    {:get {:handler handler/admin-session :auth-required true}}]
   ["/admin/setup"
    {:post {:handler handler/admin-setup}}]

   ;; Scraping (admin-protected)
   ["/scrape"
    {:post {:handler handler/trigger-scrape :auth-required true}}]
   ["/scrape/all"
    {:post {:handler handler/trigger-scrape-all :auth-required true}}]
   ["/scrape/league/:id"
    {:post {:handler handler/trigger-league-scrape :auth-required true}}]])
