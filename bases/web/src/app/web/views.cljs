(ns app.web.views
  (:require [app.main-ui.views :as main]
            ["@tanstack/react-query" :refer [QueryClientProvider]]
            ["/lib/queryClient" :refer [queryClient]]))

(defn home-component []
  [:> QueryClientProvider {:client queryClient}
   [main/component]])