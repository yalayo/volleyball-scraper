import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Landing from "@/pages/landing";
import Dashboard from "@/pages/dashboard";
import GamesPage from "@/pages/games";
import PlayersPage from "@/pages/players";
import HighlightsPage from "@/pages/highlights";
import PlayerRegister from "@/pages/player-register";
import PlayerLogin from "@/pages/player-login";
import PlayerDashboard from "@/pages/player-dashboard";
import AdminLogin from "@/pages/admin-login";
import AdminDashboard from "@/pages/admin-dashboard";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      {/* Public landing page */}
      <Route path="/" component={Landing}/>
      
      {/* Player routes */}
      <Route path="/player-register" component={PlayerRegister}/>
      <Route path="/player-login" component={PlayerLogin}/>
      <Route path="/player-dashboard" component={PlayerDashboard}/>
      
      {/* Admin routes */}
      <Route path="/admin-login" component={AdminLogin}/>
      <Route path="/admin" component={AdminDashboard}/>
      
      {/* Legacy routes (admin-protected) */}
      <Route path="/dashboard" component={Dashboard}/>
      <Route path="/games" component={GamesPage}/>
      <Route path="/players" component={PlayersPage}/>
      <Route path="/highlights" component={HighlightsPage}/>
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
