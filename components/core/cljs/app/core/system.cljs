(ns app.core.system
  "Pure domain core: business rules evaluated by odoyle, no I/O.
   The controller gathers facts (database rows, env checks, hashes) and calls
   `process`; the result tells it what side effect to run."
  (:require [app.core.rules.admin-sign-in :as admin-sign-in]
            [app.core.rules.scrape :as scrape]))

(def command->fn
  {})

(defn run [state commands]
  (reduce
   (fn [state {:keys [command args]}]
     (if-let [fn (get command->fn command)]
       (apply fn state args)
       (throw
        (ex-info (str "Unknown command: " command ", args:" args)
                 {:command command :arg args}))))
   state commands))

(defn process
  "Pure command dispatcher. Takes {:command <kw> :data <facts>} and returns a
   result map ({:action ...} or {:error ...}); no side effects."
  [{:keys [command data]}]
  (case command
    :admin-sign-in (admin-sign-in/validate data)
    :scrape        (scrape/authorize data)
    {:error :unknown-command}))

(defn init []
  (let [state (atom {})]
    {:state    state
     :dispatch (fn [cmd args]
                 (swap! state
                        #(run % [{:command cmd :args args}])))
     :run      (fn [commands]
                 (swap! state run commands))
     :process  process}))

(defn stop [state]
  (reset! state {})
  nil)
