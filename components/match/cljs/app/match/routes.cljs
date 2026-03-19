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

   ;; Admin auth
   ["/admin/login"
    {:post {:handler handler/admin-login}}]
   ["/admin/logout"
    {:post {:handler handler/admin-logout}}]
   ["/admin/session"
    {:get {:handler handler/admin-session :auth-required true}}]
   ["/admin/setup"
    {:post {:handler handler/admin-setup}}]

   ;; Scraping (admin-protected)
   ["/scrape"
    {:post {:handler handler/trigger-scrape :auth-required true}}]
   ["/scrape/league/:id"
    {:post {:handler handler/trigger-league-scrape :auth-required true}}]])
