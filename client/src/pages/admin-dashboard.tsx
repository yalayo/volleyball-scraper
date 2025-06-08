import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
  TrendingUp,
  Eye,
  Key
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
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [, setLocation] = useLocation();
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

  // No longer needed - navigation replaces dialogs

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/admin/logout"),
    onSuccess: () => {
      window.location.href = "/";
    }
  });

  // Single URL scrape mutation
  const scrapeMutation = useMutation({
    mutationFn: (url: string) => apiRequest("POST", "/api/scrape", { url }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/leagues"] });
      setNewUrl("");
    }
  });

  // Scrape all URLs mutation
  const scrapeAllMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/scrape-all"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/leagues"] });
      setIsScrapingAll(false);
    },
    onError: () => {
      setIsScrapingAll(false);
    }
  });

  // Password change mutation
  const changePasswordMutation = useMutation({
    mutationFn: (data: { newPassword: string }) => 
      apiRequest("POST", "/api/admin/change-password", data),
    onSuccess: () => {
      setShowPasswordDialog(false);
      setNewPassword("");
      setConfirmPassword("");
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

  const handleStatClick = (type: 'leagues' | 'teams' | 'players' | 'matches') => {
    switch (type) {
      case 'matches':
        setLocation('/games');
        break;
      case 'players':
        setLocation('/players');
        break;
      case 'teams':
      case 'leagues':
        // These stay on the dashboard for now, could add dedicated pages later
        break;
    }
  };

  const handlePasswordChange = () => {
    if (newPassword !== confirmPassword) {
      return;
    }
    changePasswordMutation.mutate({ newPassword });
  };

  const renderDataDialog = () => {
    let data: any[] = [];
    let title = "";
    
    switch (dataType) {
      case 'leagues':
        data = leagues || [];
        title = "All Leagues";
        break;
      case 'teams':
        data = teams || [];
        title = "All Teams";
        break;
      case 'players':
        data = players || [];
        title = "All Players";
        break;
      case 'matches':
        data = matches || [];
        title = "All Matches";
        break;
    }

    return (
      <Dialog open={showDataDialog} onOpenChange={setShowDataDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>
              Complete list of {dataType} in the system
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {data.length > 0 ? (
              <div className="grid gap-3">
                {data.map((item: any, index: number) => (
                  <div key={item.id || index} className="border rounded-lg p-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium">{item.name || item.title}</h4>
                        {item.category && <p className="text-sm text-gray-600">{item.category}</p>}
                        {item.location && <p className="text-sm text-gray-500">{item.location}</p>}
                        {item.team?.name && <p className="text-sm text-gray-500">Team: {item.team.name}</p>}
                        {item.homeTeam?.name && <p className="text-sm text-gray-500">{item.homeTeam.name} vs {item.awayTeam?.name}</p>}
                      </div>
                      {item.isActive !== undefined && (
                        <Badge variant={item.isActive ? "default" : "secondary"}>
                          {item.isActive ? "Active" : "Inactive"}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500 py-8">No {dataType} found</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    );
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
          <Card 
            className="cursor-pointer hover:shadow-lg transition-shadow" 
            onClick={() => handleStatClick('leagues')}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                Total Leagues
                <Eye className="h-4 w-4 ml-auto" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalLeagues || 0}</div>
            </CardContent>
          </Card>
          <Card 
            className="cursor-pointer hover:shadow-lg transition-shadow" 
            onClick={() => handleStatClick('teams')}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                Total Teams
                <Eye className="h-4 w-4 ml-auto" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalTeams || 0}</div>
            </CardContent>
          </Card>
          <Card 
            className="cursor-pointer hover:shadow-lg transition-shadow" 
            onClick={() => handleStatClick('players')}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                Total Players
                <Eye className="h-4 w-4 ml-auto" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalPlayers || 0}</div>
            </CardContent>
          </Card>
          <Card 
            className="cursor-pointer hover:shadow-lg transition-shadow" 
            onClick={() => handleStatClick('matches')}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                Total Matches
                <Eye className="h-4 w-4 ml-auto" />
              </CardTitle>
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
                  
                  <div className="border-t pt-4">
                    <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
                      <DialogTrigger asChild>
                        <Button variant="outline" className="w-full md:w-auto">
                          <Key className="h-4 w-4 mr-2" />
                          Change Password
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Change Admin Password</DialogTitle>
                          <DialogDescription>
                            Enter a new password for the admin account
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="newPassword">New Password</Label>
                            <Input
                              id="newPassword"
                              type="password"
                              value={newPassword}
                              onChange={(e) => setNewPassword(e.target.value)}
                              placeholder="Enter new password"
                            />
                          </div>
                          <div>
                            <Label htmlFor="confirmPassword">Confirm Password</Label>
                            <Input
                              id="confirmPassword"
                              type="password"
                              value={confirmPassword}
                              onChange={(e) => setConfirmPassword(e.target.value)}
                              placeholder="Confirm new password"
                            />
                          </div>
                          {newPassword !== confirmPassword && confirmPassword && (
                            <Alert variant="destructive">
                              <AlertDescription>
                                Passwords do not match
                              </AlertDescription>
                            </Alert>
                          )}
                          {changePasswordMutation.error && (
                            <Alert variant="destructive">
                              <AlertDescription>
                                Failed to change password: {(changePasswordMutation.error as any)?.message || "Unknown error"}
                              </AlertDescription>
                            </Alert>
                          )}
                        </div>
                        <DialogFooter>
                          <Button 
                            variant="outline" 
                            onClick={() => setShowPasswordDialog(false)}
                          >
                            Cancel
                          </Button>
                          <Button 
                            onClick={handlePasswordChange}
                            disabled={!newPassword || !confirmPassword || newPassword !== confirmPassword || changePasswordMutation.isPending}
                          >
                            {changePasswordMutation.isPending ? (
                              <>
                                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                Changing...
                              </>
                            ) : (
                              "Change Password"
                            )}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>

                  <Alert>
                    <Shield className="h-4 w-4" />
                    <AlertDescription>
                      Admin credentials are managed securely. Changes take effect immediately.
                    </AlertDescription>
                  </Alert>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Render data dialog */}
      {renderDataDialog()}
    </div>
  );
}