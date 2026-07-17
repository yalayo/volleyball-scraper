(ns app.team.routes
  (:require [app.team.handler :as handler]))

;; Teams are written exclusively by the scraper (through app.team.store);
;; the REST surface is read-only.
(def routes
  [["/teams"
    {:get {:handler handler/get-all}}]
   ["/teams/:id"
    {:get {:handler handler/get-one}}]])
