(ns app.main-ui.views
  (:require [reagent.core  :as r]
            [re-frame.core :as re-frame]
            [app.main-ui.events :as events]
            [app.main-ui.rules  :as rules]
            [app.auth-ui.subs       :as auth-subs]
            [app.volleyball-ui.subs :as vb-subs]
            [app.volleyball-ui.events :as vb-events]
            [app.auth-ui.config :as api-config]
            ;; React page imports
            ["/i18n/config"]
            ["/pages/landing$default"          :as landing-js]
            ["/pages/dashboard$default"        :as dashboard-js]
            ["/pages/not-found$default"        :as not-found-js]
            ["/pages/player-login$default"     :as player-login-js]
            ["/pages/player-dashboard$default" :as player-dashboard-js]
            ["/pages/game-tracker$default"     :as game-tracker-js]))

(def landing          (r/adapt-react-class landing-js))
(def dashboard        (r/adapt-react-class dashboard-js))
(def not-found        (r/adapt-react-class not-found-js))
(def player-login     (r/adapt-react-class player-login-js))
(def player-dashboard (r/adapt-react-class player-dashboard-js))
(def game-tracker     (r/adapt-react-class game-tracker-js))

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
        :authToken   auth-token
        :apiBaseUrl  (api-config/get-api-url)
        :onRefresh   #(re-frame/dispatch [::vb-events/load-data])
        :onLogout    #(re-frame/dispatch [::events/sign-out])
        :onOpenTracker (fn [match-id]
                         (when (string? match-id)
                           (re-frame/dispatch [::vb-events/set-tracker-match-id match-id]))
                         (re-frame/dispatch [::events/change-active-section "tracker"]))}])))

(defn tracker-component []
  ;; roster data for team prefill; a fresh status for every tracker visit.
  ;; initial-match-id is captured once at mount (form-2 component) and
  ;; immediately cleared from app-db so the next plain "New Game" visit
  ;; doesn't see stale deep-link state.
  (let [initial-match-id @(re-frame/subscribe [::vb-subs/tracker-match-id])]
    (re-frame/dispatch [::vb-events/load-data])
    (re-frame/dispatch [::vb-events/reset-save-game-status])
    (when initial-match-id
      (re-frame/dispatch [::vb-events/clear-tracker-match-id]))
    (fn []
      (let [teams       @(re-frame/subscribe [::vb-subs/teams])
            players     @(re-frame/subscribe [::vb-subs/players])
            matches     @(re-frame/subscribe [::vb-subs/matches])
            save-status @(re-frame/subscribe [::vb-subs/save-game-status])]
        [game-tracker
         {:teams          (clj->js teams)
          :players        (clj->js players)
          :matches        (clj->js matches)
          :initialMatchId initial-match-id
          :saveStatus     save-status
          :onSave         (fn [payload]
                            (re-frame/dispatch [::vb-events/save-game
                                                (js->clj payload :keywordize-keys true)]))
          :onExit         #(re-frame/dispatch [::events/change-active-section "dashboard"])}]))))

(defn player-login-component []
  [player-login
   {:onLoginSuccess #(re-frame/dispatch [::events/change-active-section "player-dashboard"])
    :onRegister     #(re-frame/dispatch [::events/change-active-section "register"])
    :onGoHome       #(re-frame/dispatch [::events/change-active-section "home"])}])

(defn player-dashboard-component []
  ;; the page clears its own playerSession from localStorage before calling this
  [player-dashboard
   {:onLogout #(re-frame/dispatch [::events/change-active-section "home"])}])

(defn submitting []
  [:div "Signing in…"])

(defn component
  "Top-level router driven by the odoyle navigation rules (rules/current-section
   derefs the reactive session). auth-page and register-page are component
   functions injected by the project's composition root (app.frontend.core)."
  [{:keys [auth-page register-page]}]
  (case (rules/current-section)
    :auth             [auth-page {:id "auth"}]
    :register         [register-page {:id "register"}]
    :dashboard        [dashboard-component]
    :tracker          [tracker-component]
    :player-login     [player-login-component]
    :player-dashboard [player-dashboard-component]
    :submitting       [submitting]
    ;; default: landing page
    [landing
     {:onSignIn       #(re-frame/dispatch [::events/change-active-section "auth"])
      :onPlayerSignIn #(re-frame/dispatch [::events/change-active-section "player-login"])
      :onSignUp       #(re-frame/dispatch [::events/change-active-section "register"])
      :onEnter        #(re-frame/dispatch [::events/change-active-section "dashboard"])}]))
