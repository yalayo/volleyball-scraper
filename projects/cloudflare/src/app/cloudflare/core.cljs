(ns app.cloudflare.core
  (:require [integrant.core :as ig]
            [app.worker.core :as worker]
            [app.core.interface :as core]
            [app.user.interface :as user]
            [app.survey.interface :as survey]
            [app.plans.interface :as plans]
            [app.payment.interface :as payment]
            [app.league.interface :as league]
            [app.team.interface :as team]
            [app.player.interface :as player]
            [app.match.interface :as match]))

(def config
  {::core/domain      {}
   ::user/routes      {}
   ::survey/routes    {}
   ::plans/routes     {}
   ::payment/routes   {}
   ::league/routes    {}
   ::team/routes      {}
   ::player/routes    {}
   ::match/routes     {}
   ::worker/handler {:user-routes    (ig/ref ::user/routes)
                     :survey-routes  (ig/ref ::survey/routes)
                     :plans-routes   (ig/ref ::plans/routes)
                     :payment-routes (ig/ref ::payment/routes)
                     :league-routes  (ig/ref ::league/routes)
                     :team-routes    (ig/ref ::team/routes)
                     :player-routes  (ig/ref ::player/routes)
                     :match-routes   (ig/ref ::match/routes)}})

(defonce system (atom nil))

(defn start []
  (reset! system (ig/init config)))

(defn stop []
  (when @system
    (ig/halt! @system)
    (reset! system nil)))

(defn restart []
  (stop)
  (start))

(defn init []
  (start)
  (::worker/handler @system))

(def handler (init))
