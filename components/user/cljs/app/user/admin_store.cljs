(ns app.user.admin-store
  "Storage-backed persistence for admin accounts (EAV entity type \"admin-user\").
   The environment-defined super admin never lives here — only additional
   database-managed admins created through /api/admin/setup."
  (:require [app.storage.interface :as storage]))

(defn- now [] (.toISOString (js/Date.)))

(defn find-by-username+
  "Resolves to the admin entity map or nil."
  [username]
  (-> (storage/find-by-attr :admin-user/username username)
      (.then (fn [eids]
               (if-let [eid (first eids)]
                 (storage/entity eid)
                 nil)))))

(defn count+ []
  (-> (storage/find-by-type "admin-user")
      (.then count)))

(defn create!+
  [{:keys [username password-hash email role]}]
  (-> (storage/transact!
       [{:db/type                  "admin-user"
         :admin-user/username      username
         :admin-user/password-hash password-hash
         :admin-user/email         (or email "")
         :admin-user/role          (or role "admin")
         :admin-user/created-at    (now)}])
      (.then (fn [r] (first (:entity-ids r))))))
