(ns app.main-ui.db)

(def ls-key "volley-state")

(defn db->local-store [db]
  (.setItem js/localStorage ls-key (str db)))