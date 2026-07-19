(ns app.main-ui.rules-test
  "Simulates the navigation fact sequences the app produces, in the same order
   re-frame effects and the auth-sync reaction fire them."
  (:require [cljs.test :refer [deftest is testing]]
            [app.main-ui.rules :as rules]))

(deftest fresh-visitor-lands-on-landing
  (rules/reset-session!)
  (rules/navigate-to! :home)
  (is (= :landing (rules/current-section))))

(deftest sign-in-flow-reaches-dashboard
  (rules/reset-session!)
  (testing "visitor navigates to the admin login"
    (rules/navigate-to! :auth)
    (is (= :auth (rules/current-section))))
  (testing "sign-in request in flight"
    (rules/set-submitting! true)
    (is (= :submitting (rules/current-section))))
  (testing "success: submitting clears first (sync effect), auth fact follows (reaction)"
    (rules/set-submitting! false)
    (rules/insert-facts! true :superadmin)
    (is (= :dashboard (rules/current-section)))))

(deftest sign-in-flow-when-reaction-fires-first
  (rules/reset-session!)
  (rules/navigate-to! :auth)
  (rules/set-submitting! true)
  ;; auth-sync reaction may flush before the :rules/set-submitting false effect
  (rules/insert-facts! true :superadmin)
  (rules/set-submitting! false)
  (is (= :dashboard (rules/current-section))))

(deftest restored-session-goes-to-dashboard
  (rules/reset-session!)
  ;; restore-nav runs against the not-yet-restored db → intent :home,
  ;; then the auth-sync reaction reports the persisted login
  (rules/navigate-to! :home)
  (rules/insert-facts! true :superadmin)
  (is (= :dashboard (rules/current-section))))

(deftest logout-returns-to-auth
  (rules/reset-session!)
  (rules/navigate-to! :auth)
  (rules/insert-facts! true :superadmin)
  (is (= :dashboard (rules/current-section)))
  (rules/logout!)
  (is (= :auth (rules/current-section))))

(deftest player-area-reachable
  (rules/reset-session!)
  (rules/navigate-to! :player-login)
  (is (= :player-login (rules/current-section))))

(deftest tracker-requires-authentication
  (rules/reset-session!)
  (testing "unauthenticated visitors don't reach the tracker"
    (rules/navigate-to! :tracker)
    (is (not= :tracker (rules/current-section))))
  (testing "authenticated admins do"
    (rules/insert-facts! true :superadmin)
    (rules/navigate-to! :tracker)
    (is (= :tracker (rules/current-section))))
  (testing "leaving the tracker returns to the dashboard"
    (rules/navigate-to! :dashboard)
    (is (= :dashboard (rules/current-section)))))
