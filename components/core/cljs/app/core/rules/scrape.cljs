(ns app.core.rules.scrape
  "Business rules deciding who may trigger scraping operations."
  (:require [odoyle.rules :as o]))

(def ^:private scrape-roles #{"admin" "superadmin"})

(def ^:private rules
  (o/ruleset
   {::allowed
    [:what
     [::request :scrape/role ?role]
     :when (contains? scrape-roles ?role)
     :then
     (o/insert! ::result ::outcome {:action :scrape-allowed})]

    ::denied
    [:what
     [::request :scrape/role ?role]
     :when (not (contains? scrape-roles ?role))
     :then
     (o/insert! ::result ::outcome {:error :unauthorized})]

    ::outcome
    [:what
     [::result ::outcome result]]}))

(defn- new-session []
  (reduce o/add-rule (o/->session) rules))

(defn authorize
  "Returns {:action :scrape-allowed} or {:error :unauthorized} for the
   requesting user's role."
  [{:keys [role]}]
  (let [session (-> (new-session)
                    (o/insert ::request :scrape/role (or role "guest")))]
    (:result (first (o/query-all (o/fire-rules session) ::outcome)))))
