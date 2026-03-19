(ns app.auth-ui.config
  (:require [clojure.string :as str]))

(defn cloudflare-dev? []
  (str/includes? (.-host js/window.location) "localhost:8081"))

(defn get-api-url []
  (if goog.DEBUG
    (if (cloudflare-dev?)
      "http://localhost:8787"
      "http://localhost:8787")
    "https://leagues-api.busqandote.com"))
