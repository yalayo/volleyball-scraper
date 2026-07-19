(ns app.main-ui.rules
  "Navigation/business rules for the frontend, expressed as an odoyle ruleset
   (same architecture as property-management-v's core-ui). Facts about the
   session (authenticated admin?, role) and the user's intent are inserted into
   the session; the rules derive which section to render. The session lives in
   a Reagent atom so views re-render automatically when it changes."
  (:require [odoyle.rules :as o]
            [reagent.core :as r]))

(def ^:private player-sections #{:player-login :player-dashboard})

;; Sections an authenticated admin can visit besides the dashboard.
(def ^:private admin-sections #{:tracker})

(def rules
  (o/ruleset
   {;; Authenticated admins land on the dashboard (unless they explicitly
    ;; navigate into the player area)
    ::set-section-authenticated
    [:what
     [::session ::authenticated? true]
     [::nav     ::intent         ?intent]
     [::nav     ::submitting?    false]
     :when (and (not (contains? player-sections ?intent))
                (not (contains? admin-sections ?intent)))
     :then
     (o/insert! ::nav ::current-section :dashboard)]

    ;; Live game tracker — an admin tool, requires an authenticated session
    ::set-section-tracker
    [:what
     [::session ::authenticated? true]
     [::nav     ::intent         :tracker]
     [::nav     ::submitting?    false]
     :then
     (o/insert! ::nav ::current-section :tracker)]

    ;; Unauthenticated visitor with no special intent → landing page
    ::set-section-landing
    [:what
     [::session ::authenticated? ?auth]
     [::nav     ::intent         ?intent]
     [::nav     ::submitting?    false]
     :when (and (not ?auth)
                (contains? #{:none :home :landing} ?intent))
     :then
     (o/insert! ::nav ::current-section :landing)]

    ;; Explicit admin-login intent while unauthenticated → auth form
    ::set-section-auth
    [:what
     [::session ::authenticated? ?auth]
     [::nav     ::intent         :auth]
     [::nav     ::submitting?    false]
     :when (not ?auth)
     :then
     (o/insert! ::nav ::current-section :auth)]

    ;; Explicit register intent while unauthenticated → register form
    ::set-section-register
    [:what
     [::session ::authenticated? ?auth]
     [::nav     ::intent         :register]
     [::nav     ::submitting?    false]
     :when (not ?auth)
     :then
     (o/insert! ::nav ::current-section :register)]

    ;; Player area is reachable regardless of the admin session
    ::set-section-player-login
    [:what
     [::nav ::intent      :player-login]
     [::nav ::submitting? false]
     :then
     (o/insert! ::nav ::current-section :player-login)]

    ::set-section-player-dashboard
    [:what
     [::nav ::intent      :player-dashboard]
     [::nav ::submitting? false]
     :then
     (o/insert! ::nav ::current-section :player-dashboard)]

    ;; Auth form in flight → full-page progress state
    ::set-section-submitting
    [:what
     [::session ::authenticated? false]
     [::nav     ::intent         :auth]
     [::nav     ::submitting?    true]
     :then
     (o/insert! ::nav ::current-section :submitting)]

    ;; Query rule — no side effects
    ::get-section
    [:what
     [::nav ::current-section section]
     :then false]}))

(defn- fresh-session []
  (-> (reduce o/add-rule (o/->session) rules)
      (o/insert ::session ::authenticated? false)
      (o/insert ::user    ::role           :guest)
      (o/insert ::nav     ::intent         :none)
      (o/insert ::nav     ::submitting?    false)
      o/fire-rules))

(defonce session (r/atom (fresh-session)))

;; ── Public API ───────────────────────────────────────────────────────────────

(defn current-section
  "Reactive when called inside a Reagent render (derefs the session atom)."
  []
  (:section (first (o/query-all @session ::get-section))))

(defn navigate-to! [intent]
  (swap! session #(-> %
                      (o/retract ::nav ::intent)
                      (o/insert ::nav ::intent intent)
                      o/fire-rules)))

(defn set-submitting! [v]
  (swap! session #(-> %
                      (o/insert ::nav ::submitting? (boolean v))
                      o/fire-rules)))

(defn logout!
  "Drops the authenticated facts and routes to the landing page."
  []
  (swap! session #(-> %
                      (o/insert ::session ::authenticated? false)
                      (o/insert ::user    ::role           :guest)
                      (o/insert ::nav     ::intent         :home)
                      o/fire-rules)))

(defn insert-facts!
  "Syncs the admin auth state from re-frame into the rules session."
  [authenticated? role]
  (swap! session #(-> %
                      (o/insert ::session ::authenticated? (boolean authenticated?))
                      (o/insert ::user    ::role           (or role :guest))
                      o/fire-rules)))

(defn reset-session! []
  (reset! session (fresh-session)))
