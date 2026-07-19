(ns app.main-ui.nav-flow-test
  "Integration test of the post-login navigation: real re-frame events wired
   to the odoyle rules session — booted exactly like the browser does through
   app.frontend.core / app.web.core."
  (:require [cljs.test :refer [deftest is testing]]
            [reagent.core :as r]
            [re-frame.core :as re-frame]
            [re-frame.db :as rf-db]
            [app.main-ui.rules :as rules]
            [app.main-ui.events :as events]
            [app.auth-ui.events :as auth-events]))

;; node has no localStorage — stub it before any interceptor runs
(when-not (exists? js/localStorage)
  (set! (.-localStorage js/globalThis)
        #js {:getItem    (fn [_] nil)
             :setItem    (fn [_ _] nil)
             :removeItem (fn [_] nil)}))

(deftest post-login-navigation-reaches-dashboard
  (rules/reset-session!)
  (reset! rf-db/app-db {})

  (testing "boot sequence (app.main-ui.core/init dispatches)"
    (re-frame/dispatch-sync [::events/restore-auth])
    (re-frame/dispatch-sync [::events/restore-nav])
    (r/flush)
    (is (= :landing (rules/current-section)) "fresh visitor starts on landing"))

  (testing "visitor opens the admin login"
    (re-frame/dispatch-sync [::events/change-active-section "auth"])
    (is (= :auth (rules/current-section))))

  (testing "successful sign-in routes to the dashboard"
    ;; the :rules/set-submitting true effect of ::sign-in (HTTP call itself skipped)
    (rules/set-submitting! true)
    (is (= :submitting (rules/current-section)))
    ;; the HTTP success callback with the /api/command response shape
    (re-frame/dispatch-sync
     [::auth-events/signed-in {:message "Login successful"
                               :token   "test-token"
                               :user    {:id 0 :username "superadmin"
                                         :role "superadmin" :superadmin true}}])
    (is (= :dashboard (rules/current-section)))))

(deftest restored-session-boots-into-dashboard
  (rules/reset-session!)
  ;; app-db as ::initialize-db restores it for a persisted admin session
  (reset! rf-db/app-db {:user {:user-loged-in? true
                               :info  {:username "superadmin" :role "superadmin"}
                               :token "persisted-token"}
                        :ui   {:active-section "dashboard"}})
  (re-frame/dispatch-sync [::events/restore-auth])
  (re-frame/dispatch-sync [::events/restore-nav])
  (is (= :dashboard (rules/current-section))))

(deftest sign-out-returns-to-landing
  (rules/reset-session!)
  (reset! rf-db/app-db {:user {:user-loged-in? true
                               :info {:username "superadmin" :role "superadmin"}}})
  (re-frame/dispatch-sync [::events/restore-auth])
  (re-frame/dispatch-sync [::events/change-active-section "dashboard"])
  (is (= :dashboard (rules/current-section)))
  (re-frame/dispatch-sync [::events/signed-out])
  (is (= :landing (rules/current-section)))
  (is (nil? (get-in @rf-db/app-db [:user :token])) "JWT token removed")
  (is (false? (get-in @rf-db/app-db [:user :user-loged-in?]))))
