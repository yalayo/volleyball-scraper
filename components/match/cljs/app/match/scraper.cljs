(ns app.match.scraper
  (:require [app.worker.async :refer [js-await]]
            [app.worker.db :as db]))

;; ── fetch helpers ─────────────────────────────────────────────────────────────

(def ^:private user-agent
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36")

(defn- fetch-html [url]
  (js-await [resp (js/fetch url #js {:headers #js {"User-Agent" user-agent}
                                     :signal   (.-signal (doto (js/AbortController.)
                                                           (#(js/setTimeout (fn [] (.abort %)) 20000))))})]
            (if (.-ok resp)
              (.text resp)
              (throw (js/Error. (str "HTTP " (.-status resp) " fetching " url))))))

;; ── regex helpers ─────────────────────────────────────────────────────────────

(defn- re-find-all
  "Returns all matches of a regex (with /g flag) as vectors of groups."
  [pattern-src html]
  (let [re (js/RegExp. pattern-src "g")]
    (loop [acc []]
      (if-let [m (.exec re html)]
        (recur (conj acc (js->clj m)))
        acc))))

(defn- re-first
  "Returns first capture group of pattern in text, or nil."
  [pattern text]
  (when text
    (when-let [m (.match text (js/RegExp. pattern))]
      (aget m 1))))

;; ── HTML text helpers ─────────────────────────────────────────────────────────

(defn- strip-tags [html]
  (when html
    (-> html
        (.replace (js/RegExp. "<[^>]+>" "g") " ")
        (.replace (js/RegExp. "&amp;" "g") "&")
        (.replace (js/RegExp. "&lt;" "g") "<")
        (.replace (js/RegExp. "&gt;" "g") ">")
        (.replace (js/RegExp. "&nbsp;" "g") " ")
        (.replace (js/RegExp. "\\s+" "g") " ")
        .trim)))

(defn- valid-player-name? [text]
  (when (and text (>= (.-length text) 3) (<= (.-length text) 50))
    (let [t (.trim text)]
      (and (re-find #" " t)                           ; must have a space
           (not (re-find #"\d" t))                    ; no numbers
           (not (re-find #"(?i)^(name|spieler|player|position|nummer|trainer|coach|betreuer|datum|date)$" t))))))

;; ── series ID extraction ──────────────────────────────────────────────────────

(defn- extract-series-id [url html]
  (or (re-first "LeaguePresenter\\.matchSeriesId=(\\d+)" url)
      (re-first "matchSeriesId=(\\d+)" html)
      (re-first "seriesId=(\\d+)" html)))

;; ── team extraction ───────────────────────────────────────────────────────────

(defn- extract-teams-from-html [html league-id]
  ;; Primary: samsCmsTeamListComponentBlock pattern
  (let [block-re "samsCmsComponentBlock[^>]*samsCmsTeamListComponentBlock[\\s\\S]*?</div>\\s*</div>\\s*</div>"
        blocks   (re-find-all block-re html)
        teams    (atom [])]

    ;; Try primary block extraction
    (doseq [block blocks]
      (let [block-html (first block)
            team-name  (strip-tags (re-first "samsCmsComponentBlockHeader[^>]*>([^<]+)<" block-html))
            href-match (re-first "href=\"([^\"]*LeaguePresenter\\.teamListView\\.teamId=(\\d+)[^\"]*)\"" block-html)
            team-id    (re-first "LeaguePresenter\\.teamListView\\.teamId=(\\d+)" (or href-match ""))
            homepage   (re-first "samsExternalLink[^>]*href=\"([^\"]+)\"" block-html)
            logo-url   (re-first "samsCmsTeamListComponentLogoImage[\\s\\S]*?src=\"([^\"]+)\"" block-html)]
        (when (and team-name team-id (not= team-name ""))
          (swap! teams conj {:name      team-name
                             :team-id   team-id
                             :homepage  homepage
                             :logo-url  logo-url
                             :league-id league-id
                             :is-active 1}))))

    ;; Fallback: any link with teamListView.teamId
    (when (empty? @teams)
      (let [link-matches (re-find-all "href=\"([^\"]*LeaguePresenter\\.teamListView\\.teamId=(\\d+)[^\"]*)\"[^>]*>([^<]+)<" html)]
        (doseq [m link-matches]
          (let [team-name (strip-tags (nth m 3 nil))
                team-id   (nth m 2 nil)]
            (when (and team-name team-id (> (.-length team-name) 1))
              (swap! teams conj {:name      team-name
                                 :team-id   team-id
                                 :homepage  nil
                                 :logo-url  nil
                                 :league-id league-id
                                 :is-active 1}))))))

    ;; Deduplicate by team-id
    (->> @teams
         (group-by :team-id)
         vals
         (map first))))

;; ── player extraction ─────────────────────────────────────────────────────────

(defn- build-team-player-url [base-url team-id]
  (.replace base-url
            (js/RegExp. "(&LeaguePresenter\\.view=[^&]*)?$")
            (str "&LeaguePresenter.teamListView.view=teamMain"
                 "&LeaguePresenter.view=teamOverview"
                 "&LeaguePresenter.teamListView.teamId=" team-id)))

(defn- extract-players-from-html [html team-db-id]
  (let [players     (atom [])
        seen-ids    (atom #{})]

    ;; Method 1: links with teamMemberId (most reliable)
    (doseq [m (re-find-all "href=\"[^\"]*teamMemberId[=:]?(\\d+)[^\"]*\"[^>]*>([^<]+)<" html)]
      (let [member-id   (nth m 1)
            player-name (.trim (strip-tags (nth m 2 "")))]
        (when (and member-id player-name
                   (valid-player-name? player-name)
                   (not (@seen-ids member-id)))
          (swap! seen-ids conj member-id)
          ;; Look for jersey number near the player link (simple heuristic)
          (let [jersey (re-first "(?:^|\\s)(\\d{1,2})(?:\\s|$)" player-name)]
            (swap! players conj {:name          player-name
                                 :player-id     member-id
                                 :jersey-number jersey
                                 :position      nil
                                 :nationality   nil
                                 :team-id       team-db-id
                                 :is-active     1})))))

    ;; Method 2: table rows with name + number pattern (fallback)
    (when (empty? @players)
      (doseq [m (re-find-all "<tr[^>]*>[\\s\\S]*?</tr>" html)]
        (let [row-html (first m)
              cells    (re-find-all "<td[^>]*>([\\s\\S]*?)</td>" row-html)]
          (when (>= (count cells) 2)
            (let [first-cell  (strip-tags (nth (nth cells 0 []) 1 ""))
                  second-cell (strip-tags (nth (nth cells 1 []) 1 ""))]
              (when (valid-player-name? first-cell)
                (let [player-key (str first-cell "_" team-db-id)]
                  (when (not (@seen-ids player-key))
                    (swap! seen-ids conj player-key)
                    (swap! players conj {:name          first-cell
                                         :player-id     nil
                                         :jersey-number (when (re-find #"^\d+$" second-cell) second-cell)
                                         :position      nil
                                         :nationality   nil
                                         :team-id       team-db-id
                                         :is-active     1})))))))))

    @players))

;; ── match extraction ──────────────────────────────────────────────────────────

(defn- build-matches-url [base-url series-id]
  (str (first (.split base-url "?"))
       "?LeaguePresenter.matchSeriesId=" series-id
       "&LeaguePresenter.view=matches&playingScheduleMode=full"))

(defn- parse-german-date [date-text]
  (when date-text
    (when-let [m (.match date-text (js/RegExp. "(\\d{1,2})\\.(\\d{1,2})\\.(\\d{2,4})"))]
      (let [day   (js/parseInt (aget m 1) 10)
            month (js/parseInt (aget m 2) 10)
            year  (let [y (js/parseInt (aget m 3) 10)]
                    (cond (< y 50)  (+ y 2000)
                          (< y 100) (+ y 1900)
                          :else     y))]
        (str year "-" (.padStart (.toString month) 2 "0") "-" (.padStart (.toString day) 2 "0"))))))

(defn- parse-match-result [home-team away-team result-text date-text series-id league-id]
  (when (and home-team away-team result-text (.includes result-text ":"))
    (let [home-sets  (atom 0)
          away-sets  (atom 0)
          set-results (atom result-text)]
      (if (.includes result-text ",")
        ;; Detailed: "25:23, 25:20, 20:25"
        (doseq [part (.split result-text ",")]
          (when-let [sm (.match (.trim part) (js/RegExp. "(\\d+):(\\d+)"))]
            (let [h (js/parseInt (aget sm 1) 10)
                  a (js/parseInt (aget sm 2) 10)]
              (if (> h a) (swap! home-sets inc) (swap! away-sets inc)))))
        ;; Simple: "3:1"
        (when-let [sm (.match result-text (js/RegExp. "(\\d+):(\\d+)"))]
          (reset! home-sets (js/parseInt (aget sm 1) 10))
          (reset! away-sets (js/parseInt (aget sm 2) 10))))
      {:match-id         (-> (str series-id "_" home-team "_" away-team)
                             (.replace (js/RegExp. "[^a-zA-Z0-9_]" "g") "_"))
       :home-team-name   home-team
       :away-team-name   away-team
       :home-score       (if (> @home-sets @away-sets) 1 0)
       :away-score       (if (> @away-sets @home-sets) 1 0)
       :home-sets        @home-sets
       :away-sets        @away-sets
       :set-results      @set-results
       :match-date       (parse-german-date date-text)
       :status           "completed"
       :league-id        league-id
       :series-id        series-id
       :home-team-id     nil
       :away-team-id     nil})))

(defn- extract-matches-from-html [html series-id league-id]
  (let [matches (atom [])
        seen    (atom #{})]
    ;; Find every <tr> that contains .samsMatchResultSetPoints
    (doseq [row-m (re-find-all "<tr[^>]*>([\\s\\S]*?)</tr>" html)]
      (let [row-html (nth row-m 1 "")]
        (when (.includes row-html "samsMatchResultSetPoints")
          ;; Extract result text
          (let [result-text (strip-tags (re-first "samsMatchResultSetPoints[^>]*>([^<]+)<" row-html))
                ;; Prefer detailed set scores from samsMatchResultBallPoints
                detailed    (when-let [d (re-first "\\(([^)]+)\\)" (or (re-first "samsMatchResultBallPoints[^>]*>([^<]+)<" row-html) ""))]
                              (.replace d (js/RegExp. "\\s+" "g") ", "))]
            (when (and result-text (.includes result-text ":"))
              ;; Extract all td text values
              (let [cells (->> (re-find-all "<td[^>]*>([\\s\\S]*?)</td>" row-html)
                               (map #(strip-tags (nth % 1 "")))
                               (filter #(and (not= % "")
                                             (not (.includes % ":"))
                                             (> (.-length %) 2)
                                             (< (.-length %) 50)
                                             (not (re-find #"^\d{1,2}\.\d{1,2}" %)))))
                    ;; Extract date separately (has period-separated numbers like DD.MM.YYYY)
                    date-text (->> (re-find-all "<td[^>]*>([\\s\\S]*?)</td>" row-html)
                                   (map #(strip-tags (nth % 1 "")))
                                   (filter #(re-find #"\d{1,2}\.\d{1,2}\.\d{2,4}" (or % "")))
                                   first)]
                (when (>= (count cells) 2)
                  (let [home-team (first cells)
                        away-team (last cells)
                        key       (str home-team "|" away-team)]
                    (when (and (not= home-team away-team)
                               (not (@seen key)))
                      (swap! seen conj key)
                      (when-let [m (parse-match-result home-team away-team
                                                       (or detailed result-text)
                                                       date-text series-id league-id)]
                        (swap! matches conj m)))))))))))
    @matches))

;; ── DB save helpers ───────────────────────────────────────────────────────────

(defn- upsert-league! [env {:keys [name category url series-id sams-id]}]
  (js-await [{:keys [results]} (db/query+ {:select [:id]
                                            :from   [:volley_leagues]
                                            :where  [:and [:= :name name] [:= :category category]]})]
            (if-let [existing (first results)]
              (js-await [_ (db/run+ env {:update :volley_leagues
                                         :set    {:url url :series_id series-id :sams_id sams-id
                                                  :updated_at [:raw "datetime('now')"]}
                                         :where  [:= :id (:id existing)]})]
                        (:id existing))
              (js-await [r (db/run+ env {:insert-into :volley_leagues
                                         :columns     [:name :category :url :series_id :sams_id :is_active]
                                         :values      [[name category url series-id sams-id 1]]})]
                        (-> r :meta :last_row_id)))))

(defn- upsert-team! [env {:keys [name team-id league-id homepage logo-url]}]
  (js-await [{:keys [results]} (db/query+ {:select [:id]
                                            :from   [:volley_teams]
                                            :where  [:= :team_id team-id]})]
            (if-let [existing (first results)]
              (js-await [_ (db/run+ env {:update :volley_teams
                                         :set    {:name name :league_id league-id
                                                  :homepage homepage :logo_url logo-url
                                                  :updated_at [:raw "datetime('now')"]}
                                         :where  [:= :id (:id existing)]})]
                        (:id existing))
              (js-await [r (db/run+ env {:insert-into :volley_teams
                                         :columns     [:name :team_id :league_id :homepage :logo_url :is_active]
                                         :values      [[name team-id league-id homepage logo-url 1]]})]
                        (-> r :meta :last_row_id)))))

(defn- upsert-player! [env {:keys [name player-id jersey-number position nationality team-id]}]
  (js-await [{:keys [results]} (db/query+ (cond-> {:select [:id] :from [:volley_players]
                                                    :where  [:and [:= :team_id team-id] [:= :name name]]}
                                             player-id (assoc :where [:and [:= :player_id player-id] [:= :team_id team-id]])))]
            (if-let [existing (first results)]
              (do (db/run+ env {:update :volley_players
                                :set    {:jersey_number jersey-number :position position
                                         :nationality nationality :updated_at [:raw "datetime('now')"]}
                                :where  [:= :id (:id existing)]})
                  (:id existing))
              (js-await [r (db/run+ env {:insert-into :volley_players
                                         :columns     [:name :player_id :jersey_number :position :nationality :team_id :is_active]
                                         :values      [[name player-id jersey-number position nationality team-id 1]]})]
                        (-> r :meta :last_row_id)))))

(defn- insert-match! [env {:keys [match-id home-team-name away-team-name home-team-id away-team-id
                                   home-score away-score home-sets away-sets set-results
                                   match-date status league-id series-id]}]
  ;; Skip if this exact match already exists
  (js-await [{:keys [results]} (db/query+ {:select [:id]
                                            :from   [:volley_matches]
                                            :where  [:and [:= :home_team_name home-team-name]
                                                          [:= :away_team_name away-team-name]
                                                          [:= :home_sets home-sets]
                                                          [:= :away_sets away-sets]
                                                          [:= :league_id league-id]]})]
            (when (empty? results)
              (db/run+ env {:insert-into :volley_matches
                             :columns     [:match_id :home_team_id :away_team_id
                                           :home_team_name :away_team_name
                                           :home_score :away_score :home_sets :away_sets
                                           :set_results :match_date :status :league_id :series_id]
                             :values      [[match-id home-team-id away-team-id
                                            home-team-name away-team-name
                                            home-score away-score home-sets away-sets
                                            set-results match-date status league-id series-id]]}))))

(defn- log-scrape! [env operation status message details duration created updated processed]
  (db/run+ env {:insert-into :volley_scrape_logs
                :columns     [:operation :status :message :details
                               :duration :records_created :records_updated :records_processed]
                :values      [[operation status message details
                               duration created updated processed]]}))

;; ── main scraper ──────────────────────────────────────────────────────────────

(defn scrape-league! [env url league-name category]
  (let [start-ms (.now js/Date)]
    (.catch
     (js-await
      [html (fetch-html url)]
      (let [series-id (extract-series-id url html)
            sams-id   (re-first "samsCmsComponent_(\\d+)" html)]
        (js-await
         [league-id (upsert-league! env {:name      league-name
                                         :category  category
                                         :url       url
                                         :series-id series-id
                                         :sams-id   sams-id})]
         (let [raw-teams (extract-teams-from-html html league-id)
               teams-arr (into-array raw-teams)]
           (js-await
            [team-id-map
             (.reduce teams-arr
                      (fn [acc-p team]
                        (.then acc-p
                               (fn [acc]
                                 (.then (upsert-team! env team)
                                        (fn [db-id]
                                          (aset acc (:team-id team) db-id)
                                          acc)))))
                      (js/Promise.resolve #js {}))]
            (let [n-teams     (count raw-teams)
                  team-id-map (js->clj team-id-map)]
              (js-await
               [total-players
                (.reduce teams-arr
                         (fn [cnt-p team]
                           (.then cnt-p
                                  (fn [cnt]
                                    (let [team-id (get team :team-id)
                                          db-id   (get team-id-map team-id)]
                                      (if-not db-id
                                        cnt
                                        (-> (fetch-html (build-team-player-url url team-id))
                                            (.then #(extract-players-from-html % db-id))
                                            (.then (fn [players]
                                                     (.reduce (into-array players)
                                                              (fn [p player]
                                                                (.then p (fn [_] (upsert-player! env player))))
                                                              (js/Promise.resolve nil))
                                                     (count players)))
                                            (.then #(+ cnt %))
                                            (.catch (fn [_] cnt))))))))
                (js/Promise.resolve 0))]
               (js-await
                [n-matches
                 (if series-id
                   (-> (fetch-html (build-matches-url url series-id))
                       (.then (fn [match-html]
                                (let [raw-matches (extract-matches-from-html match-html series-id league-id)
                                      linked      (map (fn [m]
                                                         (assoc m
                                                                :home-team-id (some (fn [[k v]]
                                                                                      (when (.includes (.toLowerCase (:home-team-name m))
                                                                                                       (.toLowerCase k))
                                                                                        v))
                                                                                    team-id-map)
                                                                :away-team-id (some (fn [[k v]]
                                                                                      (when (.includes (.toLowerCase (:away-team-name m))
                                                                                                       (.toLowerCase k))
                                                                                        v))
                                                                                    team-id-map)))
                                                       raw-matches)]
                                  (.reduce (into-array linked)
                                           (fn [p m]
                                             (.then p (fn [_] (insert-match! env m))))
                                           (js/Promise.resolve nil))
                                  (count linked))))
                       (.catch (fn [_] 0)))
                   (js/Promise.resolve 0))]
                (js-await
                 [_ (db/run+ env {:update :volley_leagues
                                  :set    {:teams_count n-teams :updated_at [:raw "datetime('now')"]}
                                  :where  [:= :id league-id]})
                  _ (log-scrape! env
                                 (str "scrape:" league-name)
                                 "success"
                                 (str "Scraped " league-name ": "
                                      n-teams " teams, "
                                      total-players " players, "
                                      n-matches " matches")
                                 (str "url=" url " series=" series-id)
                                 (- (.now js/Date) start-ms)
                                 n-teams total-players
                                 (+ n-teams total-players n-matches))]
                 {:teams n-teams :players total-players :matches n-matches})))))))))
     (fn [err]
       (-> (log-scrape! env
                        (str "scrape:" league-name)
                        "error"
                        (str "Failed to scrape " league-name ": " (.-message err))
                        (.-stack err)
                        (- (.now js/Date) start-ms)
                        0 0 0)
           (.then (fn [_] (js/console.error "Scrape failed:" err))))))))
