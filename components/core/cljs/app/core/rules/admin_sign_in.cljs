(ns app.core.rules.admin-sign-in
  "Business rules for admin authentication, expressed as an odoyle ruleset.
   Pure: facts in, outcome out — hashing and database access happen in the
   controller, which feeds the results in here as facts."
  (:require [odoyle.rules :as o]))

(def ^:private rules
  (o/ruleset
   {;; Credentials match the environment-defined super admin → superadmin session
    ::super-admin-match
    [:what
     [::sign-in :sign-in/super-match?   true]
     [::sign-in :sign-in/super-username su-name]
     :then
     (o/insert! ::result ::outcome
                {:action :sign-in-ok
                 :user   {:id 0 :username su-name :role "superadmin" :superadmin true}})]

    ;; Database admin found and password hash matches
    ::db-admin-match
    [:what
     [::sign-in :sign-in/super-match?  false]
     [::sign-in :sign-in/user-found?   true]
     [::sign-in :sign-in/user-id       user-id]
     [::sign-in :sign-in/username      username]
     [::sign-in :sign-in/role          role]
     [::sign-in :sign-in/provided-hash provided]
     [::sign-in :sign-in/stored-hash   stored]
     :when (= provided stored)
     :then
     (o/insert! ::result ::outcome
                {:action :sign-in-ok
                 :user   {:id user-id :username username :role role}})]

    ;; Database admin found but wrong password
    ::db-admin-mismatch
    [:what
     [::sign-in :sign-in/super-match?  false]
     [::sign-in :sign-in/user-found?   true]
     [::sign-in :sign-in/provided-hash provided]
     [::sign-in :sign-in/stored-hash   stored]
     :when (not= provided stored)
     :then
     (o/insert! ::result ::outcome {:error :invalid-credentials})]

    ;; Nobody by that name
    ::user-not-found
    [:what
     [::sign-in :sign-in/super-match? false]
     [::sign-in :sign-in/user-found?  false]
     :then
     (o/insert! ::result ::outcome {:error :invalid-credentials})]

    ;; Query rule — no side effects
    ::outcome
    [:what
     [::result ::outcome result]]}))

(defn- new-session []
  (reduce o/add-rule (o/->session) rules))

(defn validate
  "Facts: :super-match? (env credentials matched), :db-user (row from
   volley_admin_users or nil), :provided-hash (hash of the submitted password),
   :super-username. Returns {:action :sign-in-ok :user {...}} or
   {:error :invalid-credentials}."
  [{:keys [super-match? super-username db-user provided-hash]}]
  (let [session (-> (new-session)
                    (o/insert ::sign-in :sign-in/super-match?   (boolean super-match?))
                    (o/insert ::sign-in :sign-in/super-username (or super-username ""))
                    (o/insert ::sign-in :sign-in/user-found?    (some? db-user))
                    (o/insert ::sign-in :sign-in/provided-hash  provided-hash))
        session (if db-user
                  (-> session
                      (o/insert ::sign-in :sign-in/user-id     (:id db-user))
                      (o/insert ::sign-in :sign-in/username    (:username db-user))
                      (o/insert ::sign-in :sign-in/role        (:role db-user))
                      (o/insert ::sign-in :sign-in/stored-hash (:password_hash db-user)))
                  session)]
    (:result (first (o/query-all (o/fire-rules session) ::outcome)))))
