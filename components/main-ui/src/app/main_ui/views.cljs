(ns app.main-ui.views
  (:require [reagent.core  :as r]
            [re-frame.core :as re-frame]
            [app.main-ui.subs   :as subs]
            [app.main-ui.events :as events]
            [app.auth-ui.views      :as auth]
            [app.auth-ui.subs       :as auth-subs]
            [app.register-ui.interface :as register]
            [app.volleyball-ui.subs :as vb-subs]
            [app.volleyball-ui.events :as vb-events]
            ;; React page imports
            ["/pages/landing$default"      :as landing-js]
            ["/pages/dashboard$default"    :as dashboard-js]
            ["/pages/not-found$default"    :as not-found-js]))

(def landing   (r/adapt-react-class landing-js))
(def dashboard (r/adapt-react-class dashboard-js))
(def not-found (r/adapt-react-class not-found-js))

(defn dashboard-component []
  (re-frame/dispatch [::vb-events/load-data])
  (fn []
    (let [stats       @(re-frame/subscribe [::vb-subs/stats])
          leagues     @(re-frame/subscribe [::vb-subs/leagues])
          teams       @(re-frame/subscribe [::vb-subs/teams])
          players     @(re-frame/subscribe [::vb-subs/players])
          matches     @(re-frame/subscribe [::vb-subs/matches])
          scrape-logs @(re-frame/subscribe [::vb-subs/scrape-logs])
          loading?    @(re-frame/subscribe [::vb-subs/loading?])
          auth-token  @(re-frame/subscribe [::auth-subs/auth-token])]
      [dashboard
       {:stats      (when stats (clj->js stats))
        :leagues    (clj->js leagues)
        :teams      (clj->js teams)
        :players    (clj->js players)
        :matches    (clj->js matches)
        :scrapeLogs (clj->js scrape-logs)
        :isLoading  loading?
        :authToken  auth-token
        :onRefresh  #(re-frame/dispatch [::vb-events/load-data])
        :onLogout   #(re-frame/dispatch [::events/sign-out])}])))

(defn component []
  (let [active @(re-frame/subscribe [::subs/active-section])]
    (case active
      "auth"      [auth/component {:id "auth"}]
      "register"  [register/component {:id "register"}]
      "dashboard" [dashboard-component]
      ;; default: landing page
      [landing
       {:onSignIn  #(re-frame/dispatch [::events/change-active-section "auth"])
        :onSignUp  #(re-frame/dispatch [::events/change-active-section "register"])
        :onEnter   #(re-frame/dispatch [::events/change-active-section "dashboard"])}])))
