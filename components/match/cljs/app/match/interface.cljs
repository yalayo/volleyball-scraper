(ns app.match.interface
  (:require [integrant.core :as ig]
            [app.match.routes :as routes]
            [app.match.scraper :as scraper]))

(defn get-routes [] routes/routes)

(defmethod ig/init-key ::routes [_ _] routes/routes)

(defn scrape-league!
  "Scrapes one league page (teams, rosters, matches). Resolves to a summary map."
  [env url league-name category]
  (scraper/scrape-league! env url league-name category))

(defn scrape-all-leagues!
  "Scrapes every active league that has a URL. Resolves to summaries."
  [env]
  (scraper/scrape-all-leagues! env))
