import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  const [leagueName, setLeagueName] = useState("");
  const [category, setCategory] = useState("");
  const [isScrapingAll, setIsScrapingAll] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [playerAccountId, setPlayerAccountId] = useState("");
  const [playerToVerify, setPlayerToVerify] = useState(null);
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
    enabled: session?.isAuthenticated,
    select: (data: any) => data || {}
  });

  // Get admin leagues
  const { data: leagues } = useQuery({
    queryKey: ["/api/admin/leagues"],
    enabled: session?.isAuthenticated,
    select: (data: any) => data || []
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
    mutationFn: (data: { url: string; leagueName?: string; category?: string }) => 
      apiRequest("POST", "/api/scrape", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/leagues"] });
      setNewUrl("");
      setLeagueName("");
      setCategory("");
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

  // Fetch player account details for verification
  const fetchPlayerMutation = useMutation({
    mutationFn: async (playerAccountId: string) => {
      const response = await fetch(`/api/player-accounts/${playerAccountId}`, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Player account not found');
      }
      return response.json();
    },
    onSuccess: (data) => {
      setPlayerToVerify(data);
    },
    onError: () => {
      setPlayerToVerify(null);
    }
  });

  // Admin verification mutation
  const adminVerifyMutation = useMutation({
    mutationFn: async (playerAccountId: number) => {
      const response = await fetch('/api/admin/verify-player', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          playerAccountId,
          adminId: session.user?.id
        }),
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to verify player');
      }
      
      return response.json();
    },
    onSuccess: () => {
      setPlayerToVerify(null);
      setPlayerAccountId("");
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
      case 'leagues':
        setLocation('/leagues');
        break;
      case 'teams':
        setLocation('/teams');
        break;
      case 'players':
        setLocation('/players');
        break;
      case 'matches':
        setLocation('/games');
        break;
    }
  };

  const handlePasswordChange = () => {
    if (newPassword !== confirmPassword) {
      return;
    }
    changePasswordMutation.mutate({ newPassword });
  };

  const handleFetchPlayer = () => {
    if (playerAccountId.trim()) {
      fetchPlayerMutation.mutate(playerAccountId.trim());
    }
  };

  const handleAdminVerify = () => {
    if (playerToVerify) {
      adminVerifyMutation.mutate(playerToVerify.id);
    }
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
            <TabsTrigger value="verification">
              <Shield className="h-4 w-4 mr-2" />
              Player Verification
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
                  
                  <div className="space-y-2">
                    <Label htmlFor="leagueName">League Name</Label>
                    <Input
                      id="leagueName"
                      placeholder="e.g., Verbandsliga Herren 2024/25"
                      value={leagueName}
                      onChange={(e) => setLeagueName(e.target.value)}
                      disabled={scrapeMutation.isPending}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Select value={category} onValueChange={setCategory} disabled={scrapeMutation.isPending}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select league category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Oberliga">Oberliga</SelectItem>
                        <SelectItem value="Verbandsliga">Verbandsliga</SelectItem>
                        <SelectItem value="Landesliga">Landesliga</SelectItem>
                        <SelectItem value="Bezirksliga">Bezirksliga</SelectItem>
                        <SelectItem value="Kreisliga">Kreisliga</SelectItem>
                        <SelectItem value="Regionalliga">Regionalliga</SelectItem>
                        <SelectItem value="Bundesliga">Bundesliga</SelectItem>
                        <SelectItem value="1. Liga">1. Liga</SelectItem>
                        <SelectItem value="2. Liga">2. Liga</SelectItem>
                        <SelectItem value="3. Liga">3. Liga</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <Button 
                    onClick={() => scrapeMutation.mutate({ 
                      url: newUrl, 
                      leagueName: leagueName || undefined, 
                      category: category || undefined 
                    })}
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

          <TabsContent value="verification" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Admin Player Verification
                </CardTitle>
                <CardDescription>
                  Verify players by their Player Account ID. Admin verification immediately marks the player as fully verified.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex gap-4">
                  <div className="flex-1">
                    <Label htmlFor="playerAccountId">Player Account ID</Label>
                    <Input
                      id="playerAccountId"
                      placeholder="Enter player account ID (e.g., 123)"
                      value={playerAccountId}
                      onChange={(e) => setPlayerAccountId(e.target.value)}
                      disabled={fetchPlayerMutation.isPending}
                    />
                  </div>
                  <div className="flex items-end">
                    <Button 
                      onClick={handleFetchPlayer}
                      disabled={!playerAccountId.trim() || fetchPlayerMutation.isPending}
                    >
                      {fetchPlayerMutation.isPending ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        <>
                          <Users className="h-4 w-4 mr-2" />
                          Find Player
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {fetchPlayerMutation.isError && (
                  <Alert variant="destructive">
                    <AlertDescription>
                      Player account not found. Please check the ID and try again.
                    </AlertDescription>
                  </Alert>
                )}

                {playerToVerify && (
                  <Card className="border-green-200 bg-green-50">
                    <CardHeader>
                      <CardTitle className="text-lg">Player Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm font-medium">Email</Label>
                          <p className="text-sm">{playerToVerify.email || 'Not provided'}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium">SAMS ID</Label>
                          <p className="text-sm">{playerToVerify.samsId || 'Not provided'}</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm font-medium">Current Status</Label>
                          <Badge variant={playerToVerify.verificationStatus === 'verified' ? 'default' : 'secondary'}>
                            {playerToVerify.verificationStatus || 'Unverified'}
                          </Badge>
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Verification Count</Label>
                          <p className="text-sm">{playerToVerify.verificationCount || 0} verifications</p>
                        </div>
                      </div>

                      {playerToVerify.player && (
                        <div>
                          <Label className="text-sm font-medium">Associated Player</Label>
                          <div className="flex items-center gap-2 mt-1">
                            <p className="text-sm font-medium">{playerToVerify.player.name}</p>
                            {playerToVerify.player.team && (
                              <Badge variant="outline">
                                {playerToVerify.player.team.name}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-gray-600">
                            Jersey #{playerToVerify.player.jerseyNumber} • {playerToVerify.player.position}
                          </p>
                        </div>
                      )}

                      <div className="border-t pt-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">Admin Verification</p>
                            <p className="text-sm text-gray-600">
                              This will immediately mark the player as fully verified
                            </p>
                          </div>
                          <Button 
                            onClick={handleAdminVerify}
                            disabled={adminVerifyMutation.isPending || playerToVerify.verificationStatus === 'verified'}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            {adminVerifyMutation.isPending ? (
                              <>
                                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                Verifying...
                              </>
                            ) : playerToVerify.verificationStatus === 'verified' ? (
                              <>
                                <Shield className="h-4 w-4 mr-2" />
                                Already Verified
                              </>
                            ) : (
                              <>
                                <Shield className="h-4 w-4 mr-2" />
                                Verify Player
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {adminVerifyMutation.isSuccess && (
                  <Alert className="border-green-200 bg-green-50">
                    <Shield className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800">
                      Player has been successfully verified by admin. They now have full access to all features.
                    </AlertDescription>
                  </Alert>
                )}

                {adminVerifyMutation.isError && (
                  <Alert variant="destructive">
                    <AlertDescription>
                      Failed to verify player. Please try again or check the console for details.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      

    </div>
  );
}