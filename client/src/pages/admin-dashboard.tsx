import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Shield, 
  Database, 
  Users, 
  BarChart3, 
  Download, 
  RefreshCw,
  LogOut,
  Settings,
  Activity,
  TrendingUp
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface AdminSession {
  isAuthenticated: boolean;
  user?: {
    id: number;
    username: string;
    email: string;
    role: string;
  };
}

export default function AdminDashboard() {
  const [newUrl, setNewUrl] = useState("");
  const [isScrapingAll, setIsScrapingAll] = useState(false);
  const queryClient = useQueryClient();

  // Check admin session
  const { data: session, isLoading: sessionLoading } = useQuery<AdminSession>({
    queryKey: ["/api/admin/session"],
    retry: false
  });

  // Get admin stats
  const { data: stats } = useQuery({
    queryKey: ["/api/admin/stats"],
    enabled: session?.isAuthenticated
  });

  // Get admin leagues
  const { data: leagues } = useQuery({
    queryKey: ["/api/admin/leagues"],
    enabled: session?.isAuthenticated
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: () => apiRequest("/api/admin/logout", { method: "POST" }),
    onSuccess: () => {
      window.location.href = "/";
    }
  });

  // Single URL scrape mutation
  const scrapeMutation = useMutation({
    mutationFn: (url: string) => 
      apiRequest("/api/scrape", {
        method: "POST",
        body: JSON.stringify({ url }),
        headers: { "Content-Type": "application/json" }
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/leagues"] });
      setNewUrl("");
    }
  });

  // Scrape all URLs mutation
  const scrapeAllMutation = useMutation({
    mutationFn: () => apiRequest("/api/scrape-all", { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/leagues"] });
      setIsScrapingAll(false);
    },
    onError: () => {
      setIsScrapingAll(false);
    }
  });

  // Redirect if not authenticated
  useEffect(() => {
    if (!sessionLoading && !session?.isAuthenticated) {
      window.location.href = "/admin-login";
    }
  }, [session, sessionLoading]);

  if (sessionLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!session?.isAuthenticated) {
    return null;
  }

  const handleScrapeAll = () => {
    setIsScrapingAll(true);
    scrapeAllMutation.mutate();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <Shield className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">Admin Dashboard</h1>
                <p className="text-sm text-gray-500">VolleyStats Pro Management</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant="secondary">
                <Users className="h-4 w-4 mr-1" />
                {session.user?.username}
              </Badge>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => logoutMutation.mutate()}
                disabled={logoutMutation.isPending}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Leagues</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalLeagues || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Teams</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalTeams || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Players</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalPlayers || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Matches</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalMatches || 0}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="scraping" className="space-y-6">
          <TabsList>
            <TabsTrigger value="scraping">
              <Database className="h-4 w-4 mr-2" />
              Data Scraping
            </TabsTrigger>
            <TabsTrigger value="leagues">
              <BarChart3 className="h-4 w-4 mr-2" />
              Leagues
            </TabsTrigger>
            <TabsTrigger value="settings">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="scraping" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Single URL Scraping */}
              <Card>
                <CardHeader>
                  <CardTitle>Scrape Single League</CardTitle>
                  <CardDescription>
                    Add a new volleyball league URL to scrape data from
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="url">League URL</Label>
                    <Input
                      id="url"
                      placeholder="https://example.com/league"
                      value={newUrl}
                      onChange={(e) => setNewUrl(e.target.value)}
                      disabled={scrapeMutation.isPending}
                    />
                  </div>
                  <Button 
                    onClick={() => scrapeMutation.mutate(newUrl)}
                    disabled={scrapeMutation.isPending || !newUrl.trim()}
                    className="w-full"
                  >
                    {scrapeMutation.isPending ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Scraping...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4 mr-2" />
                        Scrape League
                      </>
                    )}
                  </Button>
                  {scrapeMutation.error && (
                    <Alert variant="destructive">
                      <AlertDescription>
                        Scraping failed: {(scrapeMutation.error as any)?.message || "Unknown error"}
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>

              {/* Bulk Scraping */}
              <Card>
                <CardHeader>
                  <CardTitle>Scrape All Leagues</CardTitle>
                  <CardDescription>
                    Update all existing leagues with latest data
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-sm text-gray-600">
                    This will scrape all {leagues?.length || 0} leagues in the database.
                    This process may take several minutes.
                  </div>
                  <Button 
                    onClick={handleScrapeAll}
                    disabled={isScrapingAll || scrapeAllMutation.isPending}
                    className="w-full"
                    variant="secondary"
                  >
                    {isScrapingAll || scrapeAllMutation.isPending ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Scraping All...
                      </>
                    ) : (
                      <>
                        <Activity className="h-4 w-4 mr-2" />
                        Scrape All Leagues
                      </>
                    )}
                  </Button>
                  {scrapeAllMutation.error && (
                    <Alert variant="destructive">
                      <AlertDescription>
                        Bulk scraping failed: {(scrapeAllMutation.error as any)?.message || "Unknown error"}
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>System Status</CardTitle>
                <CardDescription>
                  Current database statistics and last update information
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Total Series:</span>
                      <span className="font-medium">{stats?.totalSeries || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Last Scrape:</span>
                      <span className="font-medium">
                        {stats?.lastScrapeTime ? new Date(stats.lastScrapeTime).toLocaleString() : 'Never'}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Database Status:</span>
                      <Badge variant="outline" className="text-green-600">
                        <TrendingUp className="h-3 w-3 mr-1" />
                        Active
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="leagues" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>League Management</CardTitle>
                <CardDescription>
                  View and manage all volleyball leagues in the system
                </CardDescription>
              </CardHeader>
              <CardContent>
                {leagues && leagues.length > 0 ? (
                  <div className="space-y-4">
                    {leagues.map((league: any) => (
                      <div key={league.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-medium">{league.name}</h3>
                            <p className="text-sm text-gray-600">{league.category}</p>
                            <p className="text-sm text-gray-500">Teams: {league.teamsCount || 0}</p>
                          </div>
                          <Badge variant={league.isActive ? "default" : "secondary"}>
                            {league.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">No leagues found</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Administrator Settings</CardTitle>
                <CardDescription>
                  Manage system configuration and admin preferences
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label>Admin Username</Label>
                      <Input value={session.user?.username || ""} disabled />
                    </div>
                    <div>
                      <Label>Admin Email</Label>
                      <Input value={session.user?.email || ""} disabled />
                    </div>
                  </div>
                  <Alert>
                    <Shield className="h-4 w-4" />
                    <AlertDescription>
                      Admin credentials are managed securely. Contact system administrator to modify access.
                    </AlertDescription>
                  </Alert>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}