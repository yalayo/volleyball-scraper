(ns app.match.core)

;; ── regex helpers ─────────────────────────────────────────────────────────────

(defn re-find-all [pattern-src html]
  (let [re (js/RegExp. pattern-src "g")]
    (loop [acc []]
      (if-let [m (.exec re html)]
        (recur (conj acc (js->clj m)))
        acc))))

(defn re-first [pattern text]
  (when text
    (when-let [m (.match text (js/RegExp. pattern))]
      (aget m 1))))

(defn extract-series-id [url html]
  (or (re-first "LeaguePresenter\\.matchSeriesId=(\\d+)" url)
      (re-first "matchSeriesId=(\\d+)" html)
      (re-first "seriesId=(\\d+)" html)))