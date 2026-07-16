(ns app.auth-ui.config)

(defn get-api-url []
  (if goog.DEBUG
    "http://localhost:8787"
    "https://leagues-api.busqandote.com"))
