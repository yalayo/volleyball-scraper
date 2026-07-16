(ns app.worker.auth
  (:require ["jsonwebtoken" :as jwt]))

(defn base64url->uint8 [s]
  (let [pad (case (mod (count s) 4)
              2 "=="
              3 "="
              "")
        s (.replace (.replace (str s pad) "-" "+") "_" "/")]
    (js/Uint8Array. (js/atob s))))

(defn verify-jwt [token secret]
  (try
    (jwt/verify token secret)
    (catch :default _
      nil)))

(defn hash-password
  "Salted SHA-256 hex digest, resolved as a promise."
  [password]
  (let [salt    "volleyball-admin-salt"
        input   (str salt ":" password)
        encoder (js/TextEncoder.)
        data    (.encode encoder input)]
    (-> (js/Promise.resolve (.digest js/crypto.subtle "SHA-256" data))
        (.then (fn [hash-buffer]
                 (let [hash-array (js/Uint8Array. hash-buffer)]
                   (->> hash-array
                        (map (fn [b] (.padStart (.toString b 16) 2 "0")))
                        (apply str))))))))