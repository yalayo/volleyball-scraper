(ns app.match.core
  "Functional core of the SAMS league scraper.
   Pure functions only: HTML/URL strings in, data out. No fetching, no database.
   Patterns are validated against the live ergebnisdienst.volleyball.nrw markup
   (PrimeFaces/Jakarta-Faces pages, verified 2026-07).")

;; ── regex helpers ─────────────────────────────────────────────────────────────

(defn re-find-all
  "Returns all matches of a regex (with /g flag) as vectors of groups."
  [pattern-src html]
  (let [re (js/RegExp. pattern-src "g")]
    (loop [acc []]
      (if-let [m (.exec re html)]
        (recur (conj acc (js->clj m)))
        acc))))

(defn re-first
  "Returns first capture group of pattern in text, or nil."
  [pattern text]
  (when text
    (when-let [m (.match text (js/RegExp. pattern))]
      (aget m 1))))

(defn re-groups
  "Returns all capture groups of the first match as a vector, or nil."
  [pattern text]
  (when text
    (when-let [m (.match text (js/RegExp. pattern))]
      (vec (js->clj m)))))

(defn strip-tags [html]
  (when html
    (-> html
        (.replace (js/RegExp. "<[^>]+>" "g") " ")
        (.replace (js/RegExp. "&amp;" "g") "&")
        (.replace (js/RegExp. "&lt;" "g") "<")
        (.replace (js/RegExp. "&gt;" "g") ">")
        (.replace (js/RegExp. "&nbsp;" "g") " ")
        (.replace (js/RegExp. "\\s+" "g") " ")
        .trim
        not-empty)))

;; ── URL builders ──────────────────────────────────────────────────────────────

(defn base-page-url
  "League page URL without query string or fragment."
  [url]
  (-> url (.split "#") first (.split "?") first))

(defn page-origin
  "Scheme + host of the league page. SAMS pages carry
   <base href=\"https://<host>/\">, so all relative links (popups, servlets)
   resolve against the site root — not the page directory."
  [url]
  (re-first "^(https?://[^/]+)" url))

(defn build-matches-url
  "Full playing schedule (all matches) of a series."
  [url series-id]
  (str (base-page-url url)
       "?LeaguePresenter.matchSeriesId=" series-id
       "&LeaguePresenter.view=matches&playingScheduleMode=full"))

(defn build-team-overview-url
  "Team list (Mannschaften) view of a series."
  [url series-id]
  (str (base-page-url url)
       "?LeaguePresenter.matchSeriesId=" series-id
       "&LeaguePresenter.view=teamOverview"))

(defn build-team-roster-url
  "Single team (teamMain) view containing the player roster table."
  [url series-id team-id]
  (str (base-page-url url)
       "?LeaguePresenter.matchSeriesId=" series-id
       "&LeaguePresenter.view=teamOverview"
       "&LeaguePresenter.teamListView.view=teamMain"
       "&LeaguePresenter.teamListView.teamId=" team-id))

(defn build-match-details-url
  "Public popup URL with the details of a single match."
  [url match-id]
  (str (page-origin url)
       "/popup/matchSeries/matchDetails.xhtml?matchId=" match-id))

(defn build-roster-csv-url
  "Official roster CSV export (works even when the CMS team page does not
   render the player table)."
  [url team-id]
  (str (page-origin url)
       "/servlet/sportsclub/TeamMemberCsvExport?teamId=" team-id "&playersOnly=true"))

;; ── league extraction ─────────────────────────────────────────────────────────

(defn extract-series-id
  "Current matchSeriesId of the page. The hidden form input always carries the
   season the server actually rendered, so it wins over (possibly stale) URLs."
  [url html]
  (or (re-first "name=\"LeaguePresenter\\.matchSeriesId\"\\s+value=\"(\\d+)\"" html)
      (re-first "LeaguePresenter\\.matchSeriesId=(\\d+)" html)
      (re-first "matchSeriesId=(\\d+)" (or url ""))))

(defn extract-league-name
  "League title, e.g. \"Landesliga 3 Männer\" (first component block header)."
  [html]
  (strip-tags (re-first "samsCmsComponentBlockHeader\">([^<]+)<" html)))

(defn extract-sams-id [html]
  (re-first "samsCmsComponent_(\\d+)" html))

;; ── team extraction (teamOverview view) ───────────────────────────────────────

(defn extract-teams
  "Teams from the teamOverview view. Each team renders as a
   `samsCmsComponentBlock samsCmsTeamListComponentBlock` div holding the name
   header, the teamId link, an optional logo and an optional external homepage."
  [html league-id]
  (->> (.split html "samsCmsComponentBlock samsCmsTeamListComponentBlock")
       rest
       (map #(first (.split % "class=\"clear\"")))
       (keep (fn [seg]
               (let [team-id (re-first "LeaguePresenter\\.teamListView\\.teamId=(\\d+)" seg)
                     name    (strip-tags (re-first "samsCmsComponentBlockHeader\">([^<]+)<" seg))]
                 (when (and team-id name)
                   {:name      name
                    :team-id   team-id
                    :logo-url  (re-first "samsCmsTeamListComponentLogoImage[\\s\\S]*?src=\"([^\"]+)\"" seg)
                    :homepage  (re-first "<a[^>]*href=\"([^\"]+)\"[^>]*samsExternalLink" seg)
                    :league-id league-id
                    :is-active 1}))))
       (group-by :team-id)
       vals
       (map first)))

;; ── player extraction (teamMain view) ─────────────────────────────────────────

(defn format-player-name
  "SAMS lists players as \"Last, First\" — flip to \"First Last\"."
  [raw]
  (let [parts (.split raw ", ")]
    (if (= 2 (.-length parts))
      (str (aget parts 1) " " (aget parts 0))
      raw)))

(defn extract-players
  "Roster from the teamMain view's PrimeFaces teamPlayerTable.
   Row cells: player link (teamMemberId), jersey number, position, status."
  [html team-db-id]
  (if-let [table (second (.split html "teamPlayerTable_data"))]
    (->> (.split table "<tr data-ri")
         rest
         (map #(first (.split % "</tr>")))
         (keep (fn [row]
                 (let [member-id (re-first "teamMemberId=(\\d+)" row)
                       raw-name  (strip-tags (re-first "teamMemberId=\\d+[^\"]*\"[^>]*>([^<]+)</a>" row))
                       cells     (re-find-all "<td[^>]*role=\"gridcell\"[^>]*>([\\s\\S]*?)</td>" row)
                       jersey    (strip-tags (nth (nth cells 1 []) 1 nil))
                       pos-cell  (nth (nth cells 2 []) 1 nil)
                       position  (or (re-first "hideLeSmall\">([^<]+)<" (or pos-cell ""))
                                     (strip-tags pos-cell))]
                   (when (and member-id raw-name)
                     {:name          (format-player-name raw-name)
                      :player-id     member-id
                      :jersey-number (when (and jersey (re-find #"^\d+$" jersey)) jersey)
                      :position      position
                      :nationality   nil
                      :team-id       team-db-id
                      :is-active     1})))))
    []))

;; ── roster CSV export ─────────────────────────────────────────────────────────
;; Some clubs publish their roster only through the servlet CSV export, and
;; the CMS teamMain view stays empty. Columns (windows-1252, all quoted):
;; Nachname;Vorname;Titel;"Titel Vorname Nachname";"Titel Nachname, Vorname";
;; Größe;Geschlecht;Trikot;Position/Funktion Offizieller;spielberechtigt

(defn- csv-line-fields
  "Fields of one export line — every field is double-quoted."
  [line]
  (mapv #(nth % 1) (re-find-all "\"([^\"]*)\"" line)))

(defn parse-roster-csv
  "Players from the TeamMemberCsvExport payload. These rows carry no SAMS
   teamMemberId, so :player-id stays nil and upserts match on name+team."
  [csv team-db-id]
  (->> (.split (or csv "") (js/RegExp. "\\r?\\n"))
       rest                                            ; header line
       (map csv-line-fields)
       (keep (fn [fields]
               (let [[last-name first-name _ _ _ _ _ jersey position _] fields
                     name (str first-name " " last-name)]
                 (when (and last-name first-name
                            (not= "" last-name) (not= "" first-name))
                   {:name          (.trim name)
                    :player-id     nil
                    :jersey-number (not-empty jersey)
                    :position      (not-empty position)
                    :nationality   nil
                    :team-id       team-db-id
                    :is-active     1}))))))

;; ── match extraction (matches view, playingScheduleMode=full) ─────────────────

(defn parse-german-date
  "\"26.09.26\" → \"2026-09-26\""
  [date-text]
  (when date-text
    (when-let [[_ d m y] (re-groups "(\\d{1,2})\\.(\\d{1,2})\\.(\\d{2,4})" date-text)]
      (let [year (let [y (js/parseInt y 10)]
                   (cond (< y 50)  (+ y 2000)
                         (< y 100) (+ y 1900)
                         :else     y))]
        (str year "-" (.padStart (str m) 2 "0") "-" (.padStart (str d) 2 "0"))))))

(defn parse-result
  "Set score of a finished match from its schedule row, e.g. `>3:1<` plus the
   optional detailed ball points `(25:20, 25:15, 22:25, 25:18)`.
   Returns nil for matches that have not been played yet."
  [row]
  (when-let [[_ home away] (re-groups ">(\\d)\\s*:\\s*(\\d)<" row)]
    (let [home-sets (js/parseInt home 10)
          away-sets (js/parseInt away 10)]
      {:home-sets   home-sets
       :away-sets   away-sets
       :home-score  (if (> home-sets away-sets) 1 0)
       :away-score  (if (> away-sets home-sets) 1 0)
       :set-results (re-first "\\((\\d+:\\d+(?:\\s*,\\s*\\d+:\\d+)*)\\)" row)})))

(defn extract-matches
  "All matches (played and scheduled) from the playing-schedule table.
   Each row carries `id=\"match_<id>\"`, both teams as teamDetails links with
   their SAMS teamIds, date/time, the venue and the officiating team."
  [html series-id league-id base-url]
  (->> (re-find-all "<tr[^>]*>([\\s\\S]*?)</tr>" html)
       (keep (fn [[_ row]]
               (when-let [match-id (re-first "id=\"match_(\\d+)\"" row)]
                 (let [[home away] (re-find-all "teamDetails\\.xhtml\\?teamId=(\\d+)[^\"]*\"[^>]*>([\\s\\S]*?)</a>" row)
                       home-name   (strip-tags (nth home 2 nil))
                       away-name   (strip-tags (nth away 2 nil))
                       date        (parse-german-date (re-first "(\\d{1,2}\\.\\d{1,2}\\.\\d{2,4})" row))
                       time        (re-first "\\d{1,2}\\.\\d{1,2}\\.\\d{2,4},\\s*(\\d{1,2}:\\d{2})" row)
                       result      (parse-result row)]
                   (when (and home-name away-name)
                     (merge
                      {:match-id          match-id
                       :home-sams-team-id (nth home 1 nil)
                       :away-sams-team-id (nth away 1 nil)
                       :home-team-name    home-name
                       :away-team-name    away-name
                       :home-team-id      nil
                       :away-team-id      nil
                       :home-score        nil
                       :away-score        nil
                       :home-sets         nil
                       :away-sets         nil
                       :set-results       nil
                       :match-date        (when date (str date (when time (str " " time))))
                       :location          (strip-tags (re-first "locationDetails\\.xhtml[^>]*>[\\s\\S]*?hideLeSmall\">([^<]*)<" row))
                       :sams-url          (build-match-details-url base-url match-id)
                       :status            (if result "completed" "scheduled")
                       :league-id         league-id
                       :series-id         series-id}
                      result))))))))

(defn link-matches-to-teams
  "Fills :home-team-id/:away-team-id from a {sams-team-id → db-id} map.
   Falls back to nil when a team is unknown (e.g. withdrawn during season)."
  [matches team-id->db-id]
  (map (fn [m]
         (assoc m
                :home-team-id (get team-id->db-id (:home-sams-team-id m))
                :away-team-id (get team-id->db-id (:away-sams-team-id m))))
       matches))
