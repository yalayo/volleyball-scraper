import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import Sidebar from "@/components/layout/sidebar";
import StatsCard from "@/components/ui/stats-card";
import DataTable from "@/components/ui/data-table";
import ScrapingModal from "@/components/ui/scraping-modal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BarChart3, 
  Users, 
  Trophy, 
  Clock, 
  Play, 
  Download,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Eye,
  RotateCcw,
  ExternalLink,
  UserIcon
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { League, Team, Player, ScrapeLog } from "@shared/schema";

interface Stats {
  totalLeagues: number;
  totalTeams: number;
  totalPlayers: number;
  totalSeries: number;
  lastScrapeTime: string | null;
}

export default function Dashboard() {
  const [showScrapingModal, setShowScrapingModal] = useState(false);

  const { data: stats, isLoading: statsLoading } = useQuery<Stats>({
    queryKey: ["/api/stats"],
  });

  const { data: leagues = [], isLoading: leaguesLoading, refetch: refetchLeagues } = useQuery<League[]>({
    queryKey: ["/api/leagues"],
  });

  const { data: teams = [], isLoading: teamsLoading, refetch: refetchTeams } = useQuery<(Team & { league?: League })[]>({
    queryKey: ["/api/teams"],
  });

  const { data: players = [], isLoading: playersLoading, refetch: refetchPlayers } = useQuery<(Player & { team?: Team })[]>({
    queryKey: ["/api/players"],
  });

  const { data: logs = [], isLoading: logsLoading } = useQuery<ScrapeLog[]>({
    queryKey: ["/api/scrape-logs"],
  });

  const handleStartScraping = () => {
    setShowScrapingModal(true);
  };

  const handleRefreshData = () => {
    refetchLeagues();
    refetchTeams();
    refetchPlayers();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge variant="default" className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Success</Badge>;
      case 'error':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Error</Badge>;
      case 'warning':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800"><AlertTriangle className="w-3 h-3 mr-1" />Warning</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const leagueColumns = [
    {
      key: "name",
      header: "League Name",
      render: (league: League) => (
        <div>
          <div className="font-medium text-gray-900">{league.name}</div>
          <div className="text-sm text-gray-500">{league.url}</div>
        </div>
      ),
    },
    {
      key: "category",
      header: "Category",
      render: (league: League) => (
        <Badge variant="secondary">{league.category}</Badge>
      ),
    },
    {
      key: "seriesId",
      header: "Series ID",
      render: (league: League) => (
        league.seriesId ? (
          <code className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">{league.seriesId}</code>
        ) : (
          <span className="text-gray-400">-</span>
        )
      ),
    },
    {
      key: "teamsCount",
      header: "Teams",
      render: (league: League) => league.teamsCount || 0,
    },
    {
      key: "updatedAt",
      header: "Last Updated",
      render: (league: League) => 
        league.updatedAt ? formatDistanceToNow(new Date(league.updatedAt), { addSuffix: true }) : "-",
    },
    {
      key: "actions",
      header: "Actions",
      render: (league: League) => (
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="sm">
            <Eye className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm">
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ];

  const teamColumns = [
    {
      key: "name",
      header: "Team Name",
      render: (team: Team & { league?: League }) => (
        <div className="flex items-center space-x-3">
          {team.logoUrl && (
            <img src={team.logoUrl} alt={`${team.name} logo`} className="w-8 h-8 rounded object-cover" />
          )}
          <div>
            <div className="font-medium text-gray-900">{team.name}</div>
            {team.location && <div className="text-sm text-gray-500">{team.location}</div>}
          </div>
        </div>
      ),
    },
    {
      key: "league",
      header: "League",
      render: (team: Team & { league?: League }) => 
        team.league ? team.league.name : "-",
    },
    {
      key: "homepage",
      header: "Homepage",
      render: (team: Team) => 
        team.homepage ? (
          <a 
            href={team.homepage} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center space-x-1 text-blue-600 hover:text-blue-800"
          >
            <ExternalLink className="w-4 h-4" />
            <span className="text-sm">Visit</span>
          </a>
        ) : (
          <span className="text-gray-400">-</span>
        ),
    },
    {
      key: "teamId",
      header: "Team ID",
      render: (team: Team) => (
        <code className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">{team.teamId}</code>
      ),
    },
    {
      key: "players",
      header: "Players",
      render: (team: Team) => {
        const teamPlayers = players.filter(p => p.teamId === team.id);
        return (
          <div className="flex items-center space-x-1">
            <UserIcon className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium">{teamPlayers.length}</span>
          </div>
        );
      },
    },
    {
      key: "updatedAt",
      header: "Last Updated",
      render: (team: Team) => 
        team.updatedAt ? formatDistanceToNow(new Date(team.updatedAt), { addSuffix: true }) : "-",
    },
  ];

  const playerColumns = [
    {
      key: "name",
      header: "Player Name",
      render: (player: Player & { team?: Team }) => (
        <div className="font-medium text-gray-900">{player.name}</div>
      ),
    },
    {
      key: "team",
      header: "Team",
      render: (player: Player & { team?: Team }) => 
        player.team ? player.team.name : "-",
    },
    {
      key: "position",
      header: "Position",
      render: (player: Player) => 
        player.position ? (
          <Badge variant="secondary">{player.position}</Badge>
        ) : (
          <span className="text-gray-400">-</span>
        ),
    },
    {
      key: "jerseyNumber",
      header: "Jersey #",
      render: (player: Player) => 
        player.jerseyNumber ? (
          <div className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-800 rounded-full text-sm font-bold">
            {player.jerseyNumber}
          </div>
        ) : (
          <span className="text-gray-400">-</span>
        ),
    },
    {
      key: "updatedAt",
      header: "Last Updated",
      render: (player: Player) => 
        player.updatedAt ? formatDistanceToNow(new Date(player.updatedAt), { addSuffix: true }) : "-",
    },
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar onStartScraping={handleStartScraping} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
                <p className="text-sm text-gray-600">Monitor and manage volleyball data scraping operations</p>
              </div>
              <div className="flex items-center space-x-4">
                {stats?.lastScrapeTime && (
                  <div className="text-sm text-gray-500">
                    Last scrape: <span className="font-medium">
                      {formatDistanceToNow(new Date(stats.lastScrapeTime), { addSuffix: true })}
                    </span>
                  </div>
                )}
                <Button onClick={handleStartScraping} className="flex items-center space-x-2">
                  <Play className="w-4 h-4" />
                  <span>Start Scraping</span>
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50">
          <div className="p-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
              <StatsCard
                title="Total Leagues"
                value={statsLoading ? "..." : stats?.totalLeagues.toString() || "0"}
                icon={<Trophy className="w-5 h-5 text-blue-600" />}
                loading={statsLoading}
              />
              <StatsCard
                title="Total Teams"
                value={statsLoading ? "..." : stats?.totalTeams.toString() || "0"}
                icon={<Users className="w-5 h-5 text-green-600" />}
                loading={statsLoading}
              />
              <StatsCard
                title="Total Players"
                value={statsLoading ? "..." : stats?.totalPlayers.toString() || "0"}
                icon={<Users className="w-5 h-5 text-orange-600" />}
                loading={statsLoading}
              />
              <StatsCard
                title="Active Series"
                value={statsLoading ? "..." : stats?.totalSeries.toString() || "0"}
                icon={<BarChart3 className="w-5 h-5 text-yellow-600" />}
                loading={statsLoading}
              />
              <StatsCard
                title="Last Scrape"
                value={
                  statsLoading 
                    ? "..." 
                    : stats?.lastScrapeTime 
                      ? formatDistanceToNow(new Date(stats.lastScrapeTime), { addSuffix: true })
                      : "Never"
                }
                icon={<Clock className="w-5 h-5 text-purple-600" />}
                loading={statsLoading}
              />
            </div>

            {/* Action Bar */}
            <Card className="mb-8">
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-1">Data Management</h3>
                    <p className="text-sm text-gray-600">Manage scraped volleyball league data</p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Button variant="outline" className="flex items-center space-x-2">
                      <Download className="w-4 h-4" />
                      <span>Export</span>
                    </Button>
                    <Button onClick={handleRefreshData} className="flex items-center space-x-2">
                      <RefreshCw className="w-4 h-4" />
                      <span>RefreshCw</span>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Data Tables */}
            <Tabs defaultValue="leagues" className="space-y-6">
              <TabsList>
                <TabsTrigger value="leagues">Leagues</TabsTrigger>
                <TabsTrigger value="teams">Teams</TabsTrigger>
                <TabsTrigger value="players">Players</TabsTrigger>
                <TabsTrigger value="logs">Scrape Logs</TabsTrigger>
              </TabsList>

              <TabsContent value="leagues">
                <Card>
                  <CardHeader>
                    <CardTitle>Leagues Overview</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <DataTable 
                      data={leagues} 
                      columns={leagueColumns}
                      loading={leaguesLoading}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="teams">
                <Card>
                  <CardHeader>
                    <CardTitle>Teams Overview</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <DataTable 
                      data={teams} 
                      columns={teamColumns}
                      loading={teamsLoading}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="players">
                <Card>
                  <CardHeader>
                    <CardTitle>Players Overview</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <DataTable 
                      data={players} 
                      columns={playerColumns}
                      loading={playersLoading}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="logs">
                <Card>
                  <CardHeader>
                    <CardTitle>Scraping Activity Log</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {logsLoading ? (
                      <div className="text-center py-8">Loading logs...</div>
                    ) : (
                      <div className="space-y-4">
                        {logs.length === 0 ? (
                          <div className="text-center py-8 text-gray-500">
                            No scraping logs found
                          </div>
                        ) : (
                          logs.map((log) => (
                            <div key={log.id} className="border border-gray-200 rounded-lg p-4">
                              <div className="flex items-start space-x-3">
                                <div className="flex-1">
                                  <div className="flex items-center justify-between">
                                    <p className="text-sm font-medium text-gray-900">
                                      {log.operation}
                                    </p>
                                    <div className="flex items-center space-x-2">
                                      {getStatusBadge(log.status)}
                                      <p className="text-sm text-gray-500">
                                        {log.createdAt ? formatDistanceToNow(new Date(log.createdAt), { addSuffix: true }) : ""}
                                      </p>
                                    </div>
                                  </div>
                                  <p className="text-sm text-gray-600 mt-1">{log.message}</p>
                                  {log.details && (
                                    <p className="text-xs text-gray-500 mt-1">{log.details}</p>
                                  )}
                                  <div className="mt-2 flex items-center space-x-4 text-xs text-gray-500">
                                    {log.duration && <span>Duration: {log.duration}ms</span>}
                                    {log.recordsProcessed !== undefined && <span>•</span>}
                                    {log.recordsProcessed !== undefined && (
                                      <span>Records: {log.recordsCreated} new, {log.recordsUpdated} updated</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>

      <ScrapingModal 
        open={showScrapingModal} 
        onOpenChange={setShowScrapingModal}
      />
    </div>
  );
}
