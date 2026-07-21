import React from "react";
import { useState } from "react";
import Sidebar from "@/components/layout/sidebar";
import StatsCard from "@/components/ui/stats-card";
import DataTable from "@/components/ui/data-table";
import ScrapingModal from "@/components/ui/scraping-modal";
import MatchDetailsModal from "@/components/ui/match-details-modal";
import TeamDetailModal from "@/components/ui/team-detail-modal";
import LeagueDetailModal from "@/components/ui/league-detail-modal";
import PlayerDetailModal from "@/components/ui/player-detail-modal";
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
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Eye,
  ExternalLink,
  UserIcon
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { League, Team, Player, ScrapeLog, Match } from "@shared/schema";

interface Stats {
  totalLeagues: number;
  totalTeams: number;
  totalPlayers: number;
  totalMatches: number;
  totalSeries: number;
  lastScrapeTime: string | null;
}

interface DashboardProps {
  stats?: Stats;
  leagues?: League[];
  teams?: (Team & { league?: League })[];
  players?: (Player & { team?: Team })[];
  matches?: (Match & { homeTeam?: Team; awayTeam?: Team; league?: League })[];
  scrapeLogs?: ScrapeLog[];
  isLoading?: boolean;
  authToken?: string;
  apiBaseUrl?: string;
  onRefresh?: () => void;
  onLogout?: () => void;
  onOpenTracker?: (matchId?: string) => void;
}

export default function Dashboard(props: DashboardProps) {
  const leagues = props.leagues ?? [];
  const teams = props.teams ?? [];
  const players = props.players ?? [];
  const matches = props.matches ?? [];
  const scrapeLogs = props.scrapeLogs ?? [];
  const stats = props.stats;
  const isLoading = props.isLoading ?? false;

  const [showScrapingModal, setShowScrapingModal] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");

  const [teamDetailModal, setTeamDetailModal] = useState<{
    open: boolean;
    team: (Team & { league?: League }) | null;
    initialTab: "roster" | "matches";
  }>({ open: false, team: null, initialTab: "roster" });

  const [leagueDetailModal, setLeagueDetailModal] = useState<{
    open: boolean;
    league: League | null;
  }>({ open: false, league: null });

  const [playerDetailModal, setPlayerDetailModal] = useState<{
    open: boolean;
    player: (Player & { team?: Team }) | null;
  }>({ open: false, player: null });

  const [matchDetailsModal, setMatchDetailsModal] = useState<{
    open: boolean;
    match: Match | null;
  }>({ open: false, match: null });

  const handleTrackMatch = (match: Match) => {
    setMatchDetailsModal({ open: false, match: null });
    // match.id is typed as number (stale Drizzle-era schema) but is really a
    // storage UUID string at runtime — see TeamDetailModal etc. for the same.
    props.onOpenTracker?.(String(match.id));
  };

  // Drill-down navigation: any click into a related entity closes whatever
  // detail modal is currently open and opens the destination, so the user
  // never has more than one entity-detail dialog stacked at a time.
  const closeDetailModals = () => {
    setTeamDetailModal((prev) => ({ ...prev, open: false }));
    setLeagueDetailModal((prev) => ({ ...prev, open: false }));
    setPlayerDetailModal((prev) => ({ ...prev, open: false }));
  };

  const handleViewTeam = (team: Team & { league?: League }, tab: "roster" | "matches" = "roster") => {
    closeDetailModals();
    setTeamDetailModal({ open: true, team, initialTab: tab });
  };

  const handleViewLeague = (league: League) => {
    // Some callers only have a partial league ({id, name} nested on a team
    // or player) — always resolve the full record from the loaded list so
    // the modal's category/series/url/updatedAt fields are never blank.
    const fullLeague = leagues.find((l) => l.id === league.id) ?? league;
    closeDetailModals();
    setLeagueDetailModal({ open: true, league: fullLeague });
  };

  const handleViewPlayer = (player: Player & { team?: Team }) => {
    closeDetailModals();
    setPlayerDetailModal({ open: true, player });
  };

  const handleStartScraping = () => {
    setShowScrapingModal(true);
  };

  const handleRefreshData = () => {
    if (props.onRefresh) props.onRefresh();
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
        <button
          className="font-medium text-blue-600 hover:text-blue-800 hover:underline whitespace-nowrap text-left"
          onClick={() => handleViewLeague(league)}
        >
          {league.name}
        </button>
      ),
    },
    {
      key: "category",
      header: "Category",
      className: "hidden sm:table-cell",
      render: (league: League) => (
        <Badge variant="outline" className="whitespace-nowrap">{league.category || "Unknown"}</Badge>
      ),
    },
    {
      key: "seriesId",
      header: "Series ID",
      className: "hidden lg:table-cell",
      render: (league: League) => (
        <span className="text-gray-600">{league.seriesId || "-"}</span>
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
      className: "hidden xl:table-cell",
      render: (league: League) => (
        <span className="text-sm text-gray-500 whitespace-nowrap">
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
        <button
          className="flex items-center space-x-3 text-left"
          onClick={() => handleViewTeam(team, "roster")}
        >
          {team.logoUrl && (
            <img src={team.logoUrl} alt={`${team.name} logo`} className="w-8 h-8 rounded shrink-0" />
          )}
          <span className="font-medium text-blue-600 hover:text-blue-800 hover:underline whitespace-nowrap">
            {team.name}
          </span>
        </button>
      ),
    },
    {
      key: "league",
      header: "League",
      className: "hidden md:table-cell",
      render: (team: Team & { league?: League }) =>
        team.league ? (
          <button
            className="whitespace-nowrap text-blue-600 hover:text-blue-800 hover:underline text-left"
            onClick={() => handleViewLeague(team.league!)}
          >
            {team.league.name}
          </button>
        ) : "-",
    },
    {
      key: "players",
      header: "Players",
      render: (team: Team) => {
        const playerCount = players.filter(p => p.teamId === team.id).length;
        return playerCount > 0 ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleViewTeam(team, "roster")}
            className="h-6 px-2"
          >
            <UserIcon className="w-3 h-3 mr-1" />
            {playerCount}
          </Button>
        ) : (
          <span className="text-gray-400">0</span>
        );
      },
      searchable: false,
    },
    {
      key: "homepage",
      header: "Homepage",
      className: "hidden lg:table-cell",
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
      className: "hidden xl:table-cell",
      render: (team: Team) =>
        team.teamId ? (
          <code className="bg-gray-100 px-2 py-1 rounded text-sm">{team.teamId}</code>
        ) : "-",
    },
    {
      key: "games",
      header: "Games",
      render: (team: Team) => {
        const teamMatches = matches.filter(match =>
          match.homeTeamId === team.id || match.awayTeamId === team.id
        );
        return teamMatches.length > 0 ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleViewTeam(team, "matches")}
            className="h-6 px-2"
          >
            <Trophy className="w-3 h-3 mr-1" />
            {teamMatches.length}
          </Button>
        ) : (
          <span className="text-gray-400">0</span>
        );
      },
      searchable: false,
    },
    {
      key: "updatedAt",
      header: "Last Updated",
      className: "hidden xl:table-cell",
      render: (team: Team) => (
        <span className="whitespace-nowrap">
          {team.updatedAt ? formatDistanceToNow(new Date(team.updatedAt), { addSuffix: true }) : "-"}
        </span>
      ),
    },
  ];

  const playerColumns = [
    {
      key: "name",
      header: "Player Name",
      render: (player: Player & { team?: Team }) => (
        <button
          className="font-medium text-blue-600 hover:text-blue-800 hover:underline whitespace-nowrap text-left"
          onClick={() => handleViewPlayer(player)}
        >
          {player.name}
        </button>
      ),
    },
    {
      key: "team",
      header: "Team",
      render: (player: Player & { team?: Team }) => {
        const fullTeam = teams.find((t) => t.id === player.teamId);
        return fullTeam ? (
          <button
            className="whitespace-nowrap text-blue-600 hover:text-blue-800 hover:underline text-left"
            onClick={() => handleViewTeam(fullTeam, "roster")}
          >
            {fullTeam.name}
          </button>
        ) : (
          <span className="whitespace-nowrap">{player.team ? player.team.name : "-"}</span>
        );
      },
    },
    {
      key: "nationality",
      header: "Nationality",
      className: "hidden lg:table-cell",
      render: (player: Player) =>
        player.nationality ? (
          <Badge variant="secondary">{player.nationality}</Badge>
        ) : (
          <span className="text-gray-400">-</span>
        ),
    },
    {
      key: "position",
      header: "Position",
      render: (player: Player) =>
        player.position ? (
          <Badge variant="outline" className="whitespace-nowrap">{player.position}</Badge>
        ) : (
          <span className="text-gray-400">-</span>
        ),
    },
    {
      key: "jerseyNumber",
      header: "Jersey #",
      className: "hidden sm:table-cell",
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
      className: "hidden xl:table-cell",
      render: (player: Player) => (
        <span className="whitespace-nowrap">
          {player.updatedAt ? formatDistanceToNow(new Date(player.updatedAt), { addSuffix: true }) : "-"}
        </span>
      ),
    },
  ];

  const matchColumns = [
    {
      key: "teams",
      header: "Match",
      render: (match: Match) => {
        const homeTeam = teams.find((t) => t.id === match.homeTeamId);
        const awayTeam = teams.find((t) => t.id === match.awayTeamId);
        const league = leagues.find((l) => l.id === match.leagueId);
        const teamLink = (team: (Team & { league?: League }) | undefined, name: string | null) =>
          team ? (
            <button
              className="text-blue-600 hover:text-blue-800 hover:underline"
              onClick={() => handleViewTeam(team, "matches")}
            >
              {name}
            </button>
          ) : (
            <span>{name}</span>
          );
        return (
          <div className="space-y-1 whitespace-nowrap">
            <div className="font-medium text-gray-900">
              {teamLink(homeTeam, match.homeTeamName)} vs {teamLink(awayTeam, match.awayTeamName)}
            </div>
            {league ? (
              <button
                className="text-sm text-gray-500 hover:text-gray-700 hover:underline"
                onClick={() => handleViewLeague(league)}
              >
                {league.name}
              </button>
            ) : (
              <div className="text-sm text-gray-500">Unknown League</div>
            )}
          </div>
        );
      },
    },
    {
      key: "result",
      header: "Result",
      render: (match: Match) => (
        <div className="space-y-1 whitespace-nowrap">
          <div className="font-bold text-lg">
            {match.homeSets || 0} : {match.awaySets || 0}
          </div>
          <div className="text-sm text-gray-500">
            Sets ({match.homeScore || 0} : {match.awayScore || 0} pts)
          </div>
        </div>
      ),
    },
    {
      key: "details",
      header: "Set Details",
      className: "hidden lg:table-cell",
      render: (match: Match) => (
        <div className="text-sm">
          {match.setResults ? (
            <code className="bg-gray-100 px-2 py-1 rounded text-xs">
              {match.setResults}
            </code>
          ) : (
            <span className="text-gray-400">-</span>
          )}
        </div>
      ),
    },
    {
      key: "date",
      header: "Date",
      className: "hidden sm:table-cell",
      render: (match: Match) => (
        <div className="text-sm text-gray-600 whitespace-nowrap">
          {match.matchDate || match.createdAt
            ? formatDistanceToNow(new Date(match.matchDate || match.createdAt!), { addSuffix: true })
            : "-"
          }
        </div>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (match: Match) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setMatchDetailsModal({ open: true, match })}
        >
          <Eye className="w-4 h-4 mr-1" />
          View
        </Button>
      ),
      searchable: false,
    },
  ];

  const logColumns = [
    {
      key: "operation",
      header: "Operation",
      render: (log: ScrapeLog) => (
        <div className="font-medium whitespace-nowrap">{log.operation}</div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (log: ScrapeLog) => getStatusBadge(log.status),
    },
    {
      key: "message",
      header: "Message",
      className: "hidden md:table-cell",
      render: (log: ScrapeLog) => (
        <div className="text-sm text-gray-600 min-w-[16rem]">{log.message || "-"}</div>
      ),
    },
    {
      key: "createdAt",
      header: "Started",
      render: (log: ScrapeLog) => (
        <span className="text-sm text-gray-500 whitespace-nowrap">
          {log.createdAt ? formatDistanceToNow(new Date(log.createdAt), { addSuffix: true }) : "-"}
        </span>
      ),
    },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 md:gap-6 mb-6 md:mb-8">
              <StatsCard
                title="Total Leagues"
                value={isLoading ? "..." : stats?.totalLeagues.toString() || "0"}
                icon={<Trophy className="w-5 h-5 text-blue-600" />}
                loading={isLoading}
              />
              <StatsCard
                title="Total Teams"
                value={isLoading ? "..." : stats?.totalTeams.toString() || "0"}
                icon={<Users className="w-5 h-5 text-green-600" />}
                loading={isLoading}
              />
              <StatsCard
                title="Total Players"
                value={isLoading ? "..." : stats?.totalPlayers.toString() || "0"}
                icon={<UserIcon className="w-5 h-5 text-purple-600" />}
                loading={isLoading}
              />
              <StatsCard
                title="Series Found"
                value={isLoading ? "..." : stats?.totalSeries.toString() || "0"}
                icon={<BarChart3 className="w-5 h-5 text-orange-600" />}
                loading={isLoading}
              />
              <StatsCard
                title="Last Scrape"
                value={isLoading ? "..." : stats?.lastScrapeTime ? formatDistanceToNow(new Date(stats.lastScrapeTime), { addSuffix: true }) : "Never"}
                icon={<Clock className="w-5 h-5 text-red-600" />}
                loading={isLoading}
              />
            </div>

            <Tabs defaultValue="leagues" className="w-full">
              <TabsList className="grid grid-cols-5 w-full max-w-lg sm:w-fit">
                <TabsTrigger value="leagues">Leagues</TabsTrigger>
                <TabsTrigger value="teams">Teams</TabsTrigger>
                <TabsTrigger value="players">Players</TabsTrigger>
                <TabsTrigger value="games">Games</TabsTrigger>
                <TabsTrigger value="logs">Logs</TabsTrigger>
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
                      loading={isLoading}
                      searchPlaceholder="Search leagues..."
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
                      loading={isLoading}
                      searchPlaceholder="Search teams..."
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
                      loading={isLoading}
                      searchPlaceholder="Search players..."
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="games">
                <Card>
                  <CardHeader>
                    <CardTitle>Games Overview</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <DataTable
                      data={matches}
                      columns={matchColumns}
                      loading={isLoading}
                      searchPlaceholder="Search games..."
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
                      loading={isLoading}
                      searchPlaceholder="Search logs..."
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
                loading={isLoading}
                searchPlaceholder="Search leagues..."
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
                loading={isLoading}
                searchPlaceholder="Search teams..."
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
                loading={isLoading}
                searchPlaceholder="Search players..."
              />
            </CardContent>
          </Card>
        );
      case "games":
        return (
          <Card>
            <CardHeader>
              <CardTitle>Games Management</CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable
                data={matches}
                columns={matchColumns}
                loading={isLoading}
                searchPlaceholder="Search games..."
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
                loading={isLoading}
                searchPlaceholder="Search logs..."
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
        onLogout={props.onLogout}
        onOpenTracker={props.onOpenTracker}
      />

      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="px-4 md:px-6 py-3 md:py-4">
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
              <div className="min-w-0">
                <h2 className="text-xl md:text-2xl font-bold text-gray-900 truncate">
                  {activeTab === "dashboard" ? "Dashboard" :
                   activeTab === "leagues" ? "Leagues" :
                   activeTab === "teams" ? "Teams" :
                   activeTab === "players" ? "Players" :
                   activeTab === "games" ? "Games" : "Logs"}
                </h2>
                <p className="hidden md:block text-sm text-gray-600">
                  {activeTab === "dashboard" ? "Monitor and manage volleyball data scraping operations" :
                   activeTab === "leagues" ? "Manage volleyball leagues and competitions" :
                   activeTab === "teams" ? "View and organize team information" :
                   activeTab === "players" ? "Browse player rosters and details" :
                   activeTab === "games" ? "Browse match results and schedules" : "Track scraping activity and performance"}
                </p>
              </div>
              <div className="flex items-center gap-2 md:gap-4 ml-auto">
                {stats?.lastScrapeTime && (
                  <div className="hidden xl:block text-sm text-gray-500 whitespace-nowrap">
                    Last scrape: <span className="font-medium">
                      {formatDistanceToNow(new Date(stats.lastScrapeTime), { addSuffix: true })}
                    </span>
                  </div>
                )}
                <Button onClick={handleRefreshData} variant="outline" className="flex items-center gap-2" title="Refresh">
                  <RefreshCw className="w-4 h-4" />
                  <span className="hidden sm:inline">Refresh</span>
                </Button>
                <Button onClick={handleStartScraping} className="flex items-center gap-2" title="Start Scraping">
                  <Play className="w-4 h-4" />
                  <span className="hidden sm:inline">Start Scraping</span>
                </Button>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50">
          <div className="p-4 md:p-6">
            {renderContent()}
          </div>
        </main>
      </div>

      <ScrapingModal
        open={showScrapingModal}
        onOpenChange={setShowScrapingModal}
        authToken={props.authToken}
        apiBaseUrl={props.apiBaseUrl}
        onSuccess={props.onRefresh}
      />

      <TeamDetailModal
        open={teamDetailModal.open}
        onClose={() => setTeamDetailModal(prev => ({ ...prev, open: false }))}
        team={teamDetailModal.team}
        initialTab={teamDetailModal.initialTab}
        teams={teams}
        onViewMatch={(match) => setMatchDetailsModal({ open: true, match })}
        onViewLeague={handleViewLeague}
        onViewTeam={(team) => handleViewTeam(team, "roster")}
        onViewPlayer={handleViewPlayer}
      />

      <LeagueDetailModal
        open={leagueDetailModal.open}
        onClose={() => setLeagueDetailModal(prev => ({ ...prev, open: false }))}
        league={leagueDetailModal.league}
        teams={teams}
        players={players}
        matches={matches}
        onViewTeam={(team) => handleViewTeam(team, "roster")}
      />

      <PlayerDetailModal
        open={playerDetailModal.open}
        onClose={() => setPlayerDetailModal(prev => ({ ...prev, open: false }))}
        player={playerDetailModal.player}
        teams={teams}
        onViewTeam={(team) => handleViewTeam(team, "roster")}
      />

      <MatchDetailsModal
        open={matchDetailsModal.open}
        onClose={() => setMatchDetailsModal({ open: false, match: null })}
        match={matchDetailsModal.match}
        teams={teams}
        leagues={leagues}
        onViewTeam={(team) => {
          setMatchDetailsModal({ open: false, match: null });
          handleViewTeam(team, "roster");
        }}
        onViewLeague={(league) => {
          setMatchDetailsModal({ open: false, match: null });
          handleViewLeague(league);
        }}
        onTrackMatch={handleTrackMatch}
      />
    </div>
  );
}
