(ns app.match.scraper
  "Imperative shell of the league scraper: fetches SAMS pages and persists
   what app.match.core extracts through the storage-backed domain stores.
   All parsing lives in the functional core."
  (:require [clojure.string :as str]
            [app.worker.async :refer [js-await]]
            [app.match.core :as core]
            [app.match.store :as match-store]
            [app.league.store :as league-store]
            [app.team.store :as team-store]
            [app.player.store :as player-store]))

;; ── fetch ─────────────────────────────────────────────────────────────────────

(def ^:private user-agent
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36")

(defn- decode-body+
  "Decodes the response body honoring the Content-Type charset — the roster
   CSV export is served as windows-1252, the CMS pages as UTF-8. Falls back to
   a manual latin1 decode when the runtime lacks the charset label."
  [^js resp]
  (let [ct      (or (.get (.-headers resp) "content-type") "")
        charset (or (second (re-find #"charset=([\w-]+)" ct)) "utf-8")]
    (if (= (.toLowerCase charset) "utf-8")
      (.text resp)
      (js-await [buf (.arrayBuffer resp)]
                (try
                  (.decode (js/TextDecoder. charset) buf)
                  (catch :default _
                    (let [bytes (js/Uint8Array. buf)]
                      (loop [i 0 acc ""]
                        (if (< i (.-length bytes))
                          (recur (inc i) (str acc (js/String.fromCharCode (aget bytes i))))
                          acc)))))))))

(defn- fetch-once [url]
  (let [controller (js/AbortController.)
        timer      (js/setTimeout #(.abort controller) 20000)]
    (js-await [resp (js/fetch url #js {:headers #js {"User-Agent" user-agent}
                                       :signal  (.-signal controller)})]
              (js/clearTimeout timer)
              (if (.-ok resp)
                (decode-body+ resp)
                (throw (js/Error. (str "HTTP " (.-status resp) " fetching " url)))))))

(defn- fetch-html
  "Fetches with one retry after a short pause — SAMS occasionally serves
   errors under load, and a scrape run issues many requests in sequence."
  [url]
  (.catch (fetch-once url)
          (fn [_]
            (js/Promise.
             (fn [resolve reject]
               (js/setTimeout
                #(-> (fetch-once url) (.then resolve) (.catch reject))
                1500))))))

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

(defn- fetch-roster-csv-players+
  "Fallback roster source: the servlet CSV export, which clubs sometimes
   publish even when the CMS team page renders no player table."
  [base-url team team-db-id]
  (-> (fetch-html (core/build-roster-csv-url base-url (:team-id team)))
      (.then #(core/parse-roster-csv % team-db-id))
      (.catch (fn [_] []))))

(defn- scrape-players-for-team!
  "Fetches a team's roster (CMS page first, CSV export as fallback) and
   persists its players. Resolves to {:team :count :source}, where :source
   is :page, :csv, or :none — clubs that haven't published a roster yet are
   common preseason and are distinguishable in the log from a real failure."
  [base-url series-id team team-id->db-id]
  (let [team-db-id (get team-id->db-id (:team-id team))]
    (-> (fetch-html (core/build-team-roster-url base-url series-id (:team-id team)))
        (.then #(core/extract-players % team-db-id))
        (.catch (fn [err]
                  (js/console.error "Roster page failed for team" (:name team) ":" (.-message err))
                  []))
        (.then (fn [players]
                 (if (seq players)
                   (js/Promise.resolve [players :page])
                   (.then (fetch-roster-csv-players+ base-url team team-db-id)
                          (fn [csv-players] [csv-players :csv])))))
        (.then (fn [[players source]]
                 (js-await [_ (sequentially+ player-store/upsert!+ players)]
                           {:team   (:name team)
                            :count  (count players)
                            :source (if (seq players) source :none)})))
        (.catch (fn [err]
                  (js/console.error "Roster scrape failed for team" (:name team) ":" (.-message err))
                  {:team (:name team) :count 0 :source :error})))))

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
      ;; The page's own title is canonical — caller-supplied names are only a
      ;; fallback (they may be stale or badly encoded and would fork the league).
      (let [series-id   (core/extract-series-id url html)
            sams-id     (core/extract-sams-id html)
            league-name (or (core/extract-league-name html) league-name)]
        (when-not series-id
          (throw (js/Error. (str "No matchSeriesId found on " url))))
        (js-await
         ;; The query-string-free page URL is the league's stable identity —
         ;; the same league reached via different views must not fork.
         [league-id  (league-store/upsert!+ {:name      league-name
                                             :category  category
                                             :url       (core/base-page-url url)
                                             :series-id series-id
                                             :sams-id   sams-id})
          teams-html (fetch-html (core/build-team-overview-url url series-id))]
         (let [teams (core/extract-teams teams-html league-id)]
           (js-await
            [team-db-ids (sequentially+ team-store/upsert!+ teams)]
            (let [team-id->db-id (zipmap (map :team-id teams) team-db-ids)]
              (js-await
               [roster-results (sequentially+
                                #(scrape-players-for-team! url series-id % team-id->db-id)
                                teams)
                match-html     (fetch-html (core/build-matches-url url series-id))]
               (let [matches       (-> (core/extract-matches match-html series-id league-id url)
                                       (core/link-matches-to-teams team-id->db-id))
                     rostered      (filter #(pos? (:count %)) roster-results)
                     unpublished   (filter #(= :none (:source %)) roster-results)
                     failed        (filter #(= :error (:source %)) roster-results)
                     summary       {:teams   (count teams)
                                    :players (reduce + 0 (map :count roster-results))
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
                       :details   (str "url=" url " series=" series-id
                                       " | rosters published: " (count rostered) "/" (:teams summary)
                                       " (" (str/join ", " (map #(str (:team %) "=" (:count %)) rostered)) ")"
                                       (when (seq unpublished)
                                         (str " | not yet published: " (str/join ", " (map :team unpublished))))
                                       (when (seq failed)
                                         (str " | roster fetch FAILED: " (str/join ", " (map :team failed)))))
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
