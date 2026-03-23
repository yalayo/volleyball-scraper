(ns app.match.rules
  (:require [app.match.core :as core]
            [odoyle.rules :as o]))

(def rules
  (o/ruleset
   {    
    ;; ── 1. HTML fetched → extract & save league ──────────────────────────────
    :scrape/html-fetched
    [:what
     [scrape-id :scrape/id _]
     [scrape-id :html/body html]
     [scrape-id :html/url  url]
     [scrape-id :scrape/league-name league-name]
     [scrape-id :scrape/category    category]
     [scrape-id :scrape/league-saved? false]
     :then
     (let [series-id (core/extract-series-id url html)
           sams-id   (core/re-first "samsCmsComponent_(\\d+)" html)]
       (o/insert! scrape-id :scrape/league-saved? true)
       (o/insert! scrape-id :scrape/league-data
                  {:name      league-name
                   :category  category
                   :url       url
                   :series-id series-id
                   :sams-id   sams-id}))]

    }))

;; create session and add rule
(def *session
  (atom (reduce o/add-rule (o/->session) rules)))