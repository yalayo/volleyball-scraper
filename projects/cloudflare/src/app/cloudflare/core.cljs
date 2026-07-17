(ns app.cloudflare.core
  (:require [integrant.core :as ig]
            [app.worker.core :as worker]
            [app.core.interface :as core]
            [app.controller.interface :as controller]
            [app.storage.interface :as storage]
            [app.user.interface :as user]
            [app.survey.interface :as survey]
            [app.plans.interface :as plans]
            [app.payment.interface :as payment]
            [app.league.interface :as league]
            [app.team.interface :as team]
            [app.player.interface :as player]
            [app.match.interface :as match]))

;; ::storage/d1 receives {:db <D1-binding> :prefix <table-prefix>} injected
;; lazily on the first incoming request (see ensure-started!), because env is
;; only available inside the fetch handler, not at module-load time.
(def config
  {::core/domain      {}
   ::storage/d1       {}
   ::controller/controller {:core    (ig/ref ::core/domain)
                            :storage (ig/ref ::storage/d1)}
   ::user/routes      {}
   ::survey/routes    {}
   ::plans/routes     {}
   ::payment/routes   {}
   ::league/routes    {}
   ::team/routes      {}
   ::player/routes    {}
   ::match/routes     {}
   ::worker/handler {:controller     (ig/ref ::controller/controller)
                     :storage        (ig/ref ::storage/d1)
                     :user-routes    (ig/ref ::user/routes)
                     :survey-routes  (ig/ref ::survey/routes)
                     :plans-routes   (ig/ref ::plans/routes)
                     :payment-routes (ig/ref ::payment/routes)
                     :league-routes  (ig/ref ::league/routes)
                     :team-routes    (ig/ref ::team/routes)
                     :player-routes  (ig/ref ::player/routes)
                     :match-routes   (ig/ref ::match/routes)}})

(defonce system (atom nil))

(defn- ensure-started!
  "Initializes the Integrant system once, on the first request, binding the
   live D1 handle and the table prefix (default \"volley\") into storage."
  [^js env]
  (when-not @system
    (reset! system
            (ig/init (assoc config
                            ::storage/d1 {:db     (aget env "DB")
                                          :prefix (or (aget env "TABLE_PREFIX") "volley")})))))

(defn stop []
  (when @system
    (ig/halt! @system)
    (reset! system nil)))

;; Cloudflare Workers export — a JS object with a `fetch` method.
;; ensure-started! runs once on the first request.
(def handler
  #js {:fetch (fn [^js request ^js env ^js ctx]
                (ensure-started! env)
                ((.-fetch ^js (::worker/handler @system)) request env ctx))})
