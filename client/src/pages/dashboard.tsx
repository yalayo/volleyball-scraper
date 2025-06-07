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
  const [activeTab, setActiveTab] = useState("dashboard");

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

  const { data: scrapeLogs = [], isLoading: scrapeLogsLoading, refetch: refetchScrapeLogs } = useQuery<ScrapeLog[]>({
    queryKey: ["/api/scrape-logs"],
  });

  const handleStartScraping = () => {
    setShowScrapingModal(true);
  };

  const handleRefreshData = () => {
    refetchLeagues();
    refetchTeams();
    refetchPlayers();
    refetchScrapeLogs();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "success":
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Success</Badge>;
      case "error":
        return <Badge className="bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1" />Error</Badge>;
      case "running":
        return <Badge className="bg-blue-100 text-blue-800"><RefreshCw className="w-3 h-3 mr-1 animate-spin" />Running</Badge>;
      default:
        return <Badge variant="secondary"><AlertTriangle className="w-3 h-3 mr-1" />Unknown</Badge>;
    }
  };

  const leagueColumns = [
    {
      key: "name",
      header: "League Name",
      render: (league: League) => (
        <div className="font-medium text-gray-900">{league.name}</div>
      ),
    },
    {
      key: "category",
      header: "Category",
      render: (league: League) => (
        <Badge variant="outline">{league.category || "Unknown"}</Badge>
      ),
    },
    {
      key: "season",
      header: "Season",
      render: (league: League) => (
        <span className="text-gray-600">{league.season || "-"}</span>
      ),
    },
    {
      key: "teamsCount",
      header: "Teams",
      render: (league: League) => league.teamsCount || 0,
    },
    {
      key: "url",
      header: "Source",
      render: (league: League) => 
        league.url ? (
          <a 
            href={league.url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        ) : "-",
    },
    {
      key: "updatedAt",
      header: "Last Updated",
      render: (league: League) => (
        <span className="text-sm text-gray-500">
          {league.updatedAt ? formatDistanceToNow(new Date(league.updatedAt), { addSuffix: true }) : "-"}
        </span>
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
            <img src={team.logoUrl} alt={`${team.name} logo`} className="w-8 h-8 rounded" />
          )}
          <div className="font-medium text-gray-900">{team.name}</div>
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
      key: "playersCount",
      header: "Players",
      render: (team: Team) => 
        team.playersCount ? (
          <Badge variant="secondary">{team.playersCount}</Badge>
        ) : (
          <span className="text-gray-400">0</span>
        ),
    },
    {
      key: "homepage",
      header: "Homepage",
      render: (team: Team) => {
        if (!team.homepage) return <span className="text-gray-400">-</span>;
        return (
          <a 
            href={team.homepage} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 flex items-center space-x-1"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Visit</span>
          </a>
        );
      },
    },
    {
      key: "teamId",
      header: "Team ID",
      render: (team: Team) => 
        team.teamId ? (
          <code className="bg-gray-100 px-2 py-1 rounded text-sm">{team.teamId}</code>
        ) : "-",
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

  const logColumns = [
    {
      key: "operation",
      header: "Operation",
      render: (log: ScrapeLog) => (
        <div className="font-medium">{log.operation}</div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (log: ScrapeLog) => getStatusBadge(log.status),
    },
    {
      key: "result",
      header: "Result",
      render: (log: ScrapeLog) => (
        <div className="text-sm text-gray-600">{log.result || "-"}</div>
      ),
    },
    {
      key: "createdAt",
      header: "Started",
      render: (log: ScrapeLog) => (
        <span className="text-sm text-gray-500">
          {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
        </span>
      ),
    },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return (
          <>
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
                icon={<UserIcon className="w-5 h-5 text-purple-600" />}
                loading={statsLoading}
              />
              <StatsCard
                title="Series Found"
                value={statsLoading ? "..." : stats?.totalSeries.toString() || "0"}
                icon={<BarChart3 className="w-5 h-5 text-orange-600" />}
                loading={statsLoading}
              />
              <StatsCard
                title="Last Scrape"
                value={statsLoading ? "..." : stats?.lastScrapeTime ? formatDistanceToNow(new Date(stats.lastScrapeTime), { addSuffix: true }) : "Never"}
                icon={<Clock className="w-5 h-5 text-red-600" />}
                loading={statsLoading}
              />
            </div>

            {/* Tabbed Content */}
            <Tabs defaultValue="leagues" className="w-full">
              <TabsList className="grid grid-cols-4 w-fit">
                <TabsTrigger value="leagues">Leagues</TabsTrigger>
                <TabsTrigger value="teams">Teams</TabsTrigger>
                <TabsTrigger value="players">Players</TabsTrigger>
                <TabsTrigger value="logs">Activity Logs</TabsTrigger>
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
                    <DataTable 
                      data={scrapeLogs} 
                      columns={logColumns}
                      loading={scrapeLogsLoading}
                    />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        );
      case "leagues":
        return (
          <Card>
            <CardHeader>
              <CardTitle>Leagues Management</CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable 
                data={leagues} 
                columns={leagueColumns}
                loading={leaguesLoading}
              />
            </CardContent>
          </Card>
        );
      case "teams":
        return (
          <Card>
            <CardHeader>
              <CardTitle>Teams Management</CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable 
                data={teams} 
                columns={teamColumns}
                loading={teamsLoading}
              />
            </CardContent>
          </Card>
        );
      case "players":
        return (
          <Card>
            <CardHeader>
              <CardTitle>Players Management</CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable 
                data={players} 
                columns={playerColumns}
                loading={playersLoading}
              />
            </CardContent>
          </Card>
        );
      case "logs":
        return (
          <Card>
            <CardHeader>
              <CardTitle>Scraping Activity Logs</CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable 
                data={scrapeLogs} 
                columns={logColumns}
                loading={scrapeLogsLoading}
              />
            </CardContent>
          </Card>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar 
        onStartScraping={handleStartScraping}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {activeTab === "dashboard" ? "Dashboard" : 
                   activeTab === "leagues" ? "Leagues" :
                   activeTab === "teams" ? "Teams" :
                   activeTab === "players" ? "Players" : "Logs"}
                </h2>
                <p className="text-sm text-gray-600">
                  {activeTab === "dashboard" ? "Monitor and manage volleyball data scraping operations" :
                   activeTab === "leagues" ? "Manage volleyball leagues and competitions" :
                   activeTab === "teams" ? "View and organize team information" :
                   activeTab === "players" ? "Browse player rosters and details" : "Track scraping activity and performance"}
                </p>
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
            {renderContent()}
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