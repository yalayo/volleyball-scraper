(ns app.match.scraper
  "Imperative shell of the league scraper: fetches SAMS pages and persists
   what app.match.core extracts through the storage-backed domain stores.
   All parsing lives in the functional core."
  (:require [app.worker.async :refer [js-await]]
            [app.match.core :as core]
            [app.match.store :as match-store]
            [app.league.store :as league-store]
            [app.team.store :as team-store]
            [app.player.store :as player-store]))

;; ── fetch ─────────────────────────────────────────────────────────────────────

(def ^:private user-agent
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36")

(defn- fetch-html [url]
  (let [controller (js/AbortController.)
        timer      (js/setTimeout #(.abort controller) 20000)]
    (js-await [resp (js/fetch url #js {:headers #js {"User-Agent" user-agent}
                                       :signal  (.-signal controller)})]
              (js/clearTimeout timer)
              (if (.-ok resp)
                (.text resp)
                (throw (js/Error. (str "HTTP " (.-status resp) " fetching " url)))))))

;; ── promise helpers ───────────────────────────────────────────────────────────

(defn- sequentially+
  "Runs (f item) one after another (SAMS rate-limits parallel hits),
   resolving to the vector of results."
  [f items]
  (reduce (fn [acc-p item]
            (.then acc-p (fn [acc]
                           (.then (js/Promise.resolve (f item))
                                  (fn [r] (conj acc r))))))
          (js/Promise.resolve [])
          items))

;; ── scraping steps ────────────────────────────────────────────────────────────

(defn- scrape-players-for-team!
  "Fetches a team's roster page and persists its players. Resolves to the
   number of players found; roster pages that fail don't abort the league run."
  [base-url series-id team team-id->db-id]
  (-> (fetch-html (core/build-team-roster-url base-url series-id (:team-id team)))
      (.then #(core/extract-players % (get team-id->db-id (:team-id team))))
      (.then (fn [players]
               (js-await [_ (sequentially+ player-store/upsert!+ players)]
                         (count players))))
      (.catch (fn [err]
                (js/console.error "Roster scrape failed for team" (:name team) ":" (.-message err))
                0))))

;; ── main entry points ─────────────────────────────────────────────────────────

(defn scrape-league!
  "Scrapes one SAMS league page end to end: league metadata, all teams,
   every team's player roster and the full playing schedule (played and
   upcoming matches). Resolves to a summary map."
  [_env url league-name category]
  (let [start-ms (.now js/Date)]
    (->
     (js-await
      [html (fetch-html url)]
      (let [series-id   (core/extract-series-id url html)
            sams-id     (core/extract-sams-id html)
            league-name (or league-name (core/extract-league-name html))]
        (when-not series-id
          (throw (js/Error. (str "No matchSeriesId found on " url))))
        (js-await
         [league-id  (league-store/upsert!+ {:name      league-name
                                             :category  category
                                             :url       url
                                             :series-id series-id
                                             :sams-id   sams-id})
          teams-html (fetch-html (core/build-team-overview-url url series-id))]
         (let [teams (core/extract-teams teams-html league-id)]
           (js-await
            [team-db-ids (sequentially+ team-store/upsert!+ teams)]
            (let [team-id->db-id (zipmap (map :team-id teams) team-db-ids)]
              (js-await
               [player-counts (sequentially+
                               #(scrape-players-for-team! url series-id % team-id->db-id)
                               teams)
                match-html    (fetch-html (core/build-matches-url url series-id))]
               (let [matches (-> (core/extract-matches match-html series-id league-id url)
                                 (core/link-matches-to-teams team-id->db-id))
                     summary {:teams   (count teams)
                              :players (reduce + 0 player-counts)
                              :matches (count matches)}]
                 (js-await
                  [_ (sequentially+ match-store/upsert!+ matches)
                   _ (league-store/set-teams-count!+ league-id (count teams))
                   _ (match-store/log!+
                      {:operation (str "scrape:" league-name)
                       :status    "success"
                       :message   (str "Scraped " league-name ": "
                                       (:teams summary) " teams, "
                                       (:players summary) " players, "
                                       (:matches summary) " matches")
                       :details   (str "url=" url " series=" series-id)
                       :duration  (- (.now js/Date) start-ms)
                       :created   (:teams summary)
                       :updated   (:players summary)
                       :processed (+ (:teams summary) (:players summary) (:matches summary))})]
                  summary)))))))))
     (.catch
      (fn [err]
        (js/console.error "Scrape failed:" err)
        (js-await [_ (match-store/log!+
                      {:operation (str "scrape:" (or league-name url))
                       :status    "error"
                       :message   (str "Failed to scrape " (or league-name url) ": " (.-message err))
                       :details   (.-stack err)
                       :duration  (- (.now js/Date) start-ms)
                       :created   0
                       :updated   0
                       :processed 0})]
                  {:error (.-message err)}))))))

(defn scrape-all-leagues!
  "Scrapes every active league that has a URL, one after another.
   Resolves to a vector of per-league summary maps."
  [env]
  (js-await [leagues (league-store/find-all+)]
            (sequentially+
             (fn [{:keys [url name category]}]
               (js-await [summary (scrape-league! env url name category)]
                         (assoc summary :league name)))
             (filter :url leagues))))
