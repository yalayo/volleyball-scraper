(ns app.web.views
  (:require ["@tanstack/react-query" :refer [QueryClientProvider]]
            ["/lib/queryClient" :refer [queryClient]]))

(defn home-component [main-ui]
  [:> QueryClientProvider {:client queryClient}
   main-ui])
