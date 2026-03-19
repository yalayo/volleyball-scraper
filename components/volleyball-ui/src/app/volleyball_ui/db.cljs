(ns app.volleyball-ui.db)

(def ls-key "volleyball-state")

(defn db->local-store [db]
  (.setItem js/localStorage ls-key (str db)))
