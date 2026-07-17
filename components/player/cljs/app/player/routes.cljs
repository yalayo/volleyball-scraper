(ns app.player.routes
  (:require [app.player.handler :as handler]))

;; Players are written exclusively by the scraper (through app.player.store);
;; the REST surface is read-only.
(def routes
  [["/players"
    {:get {:handler handler/get-all}}]
   ["/teams/:teamId/players"
    {:get {:handler handler/get-by-team}}]])
