import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import DataTable from "@/components/ui/data-table";
import MatchDetailsModal from "@/components/ui/match-details-modal";
import { Eye, Filter, X, Trophy, BarChart3, Calendar } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { Match, League, Team } from "@shared/schema";

export default function GamesPage() {
  const [selectedLeague, setSelectedLeague] = useState<string>("all");
  const [selectedTeam, setSelectedTeam] = useState<string>("all");
  const [homeTeam, setHomeTeam] = useState<string>("all");
  const [awayTeam, setAwayTeam] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [matchDetailsModal, setMatchDetailsModal] = useState<{
    open: boolean;
    match: Match | null;
  }>({ open: false, match: null });

  const { data: matches = [], isLoading: matchesLoading } = useQuery<(Match & { homeTeam?: Team; awayTeam?: Team; league?: League })[]>({
    queryKey: ["/api/matches"],
  });

  // Debug: Log matches data
  console.log("Matches loaded:", matches.length);

  const { data: leagues = [] } = useQuery<League[]>({
    queryKey: ["/api/leagues"],
  });

  const { data: teams = [] } = useQuery<(Team & { league?: League })[]>({
    queryKey: ["/api/teams"],
  });

  // Filter and sort matches based on selected criteria
  const filteredMatches = matches.filter(match => {
    if (selectedLeague !== "all" && match.league?.id !== parseInt(selectedLeague)) return false;
    if (selectedTeam !== "all" && !match.homeTeam?.name.includes(selectedTeam) && !match.awayTeam?.name.includes(selectedTeam)) return false;
    if (homeTeam !== "all" && !match.homeTeam?.name.includes(homeTeam)) return false;
    if (awayTeam !== "all" && !match.awayTeam?.name.includes(awayTeam)) return false;
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return match.homeTeam?.name.toLowerCase().includes(search) || 
             match.awayTeam?.name.toLowerCase().includes(search) ||
             (match.setResults && match.setResults.toLowerCase().includes(search));
    }
    return true;
  }).sort((a, b) => {
    // Sort by actual match date if available, otherwise by scrape date (most recent first)
    const getDisplayDate = (match: Match) => match.matchDate || match.createdAt || 0;
    const dateA = new Date(getDisplayDate(a));
    const dateB = new Date(getDisplayDate(b));
    return dateB.getTime() - dateA.getTime();
  });

  const clearFilters = () => {
    setSelectedLeague("all");
    setSelectedTeam("all");
    setHomeTeam("all");
    setAwayTeam("all");
    setSearchTerm("");
  };

  const hasActiveFilters = selectedLeague !== "all" || selectedTeam !== "all" || homeTeam !== "all" || awayTeam !== "all" || searchTerm;

  // Get unique team names
  const teamNames = Array.from(new Set([
    ...matches.map(m => m.homeTeam?.name || m.homeTeamName).filter(Boolean),
    ...matches.map(m => m.awayTeam?.name || m.awayTeamName).filter(Boolean)
  ])).filter((name): name is string => Boolean(name)).sort();

  // Calculate statistics
  const totalMatches = filteredMatches.length;
  const completedMatches = filteredMatches.filter(m => m.homeSets !== null && m.awaySets !== null).length;
  const averageSetsPerMatch = filteredMatches.length > 0 ? 
    filteredMatches.reduce((sum, m) => sum + ((m.homeSets || 0) + (m.awaySets || 0)), 0) / filteredMatches.length : 0;
  
  // Date-based statistics  
  const getDisplayDate = (match: Match) => match.matchDate || match.createdAt;
  const matchesWithDates = filteredMatches.filter(m => getDisplayDate(m));
  const recentMatches = matchesWithDates.filter(m => {
    const date = new Date(getDisplayDate(m)!);
    return Date.now() - date.getTime() < 7 * 24 * 60 * 60 * 1000; // Within 7 days
  }).length;
  
  const dateRange = matchesWithDates.length > 0 ? (() => {
    const dates = matchesWithDates.map(m => new Date(getDisplayDate(m)!));
    const earliest = new Date(Math.min(...dates.map(d => d.getTime())));
    const latest = new Date(Math.max(...dates.map(d => d.getTime())));
    const hasActualDates = filteredMatches.some(m => m.matchDate);
    return { earliest, latest, hasActualDates };
  })() : null;

  const matchColumns = [
    {
      key: "teams",
      header: "Match",
      render: (match: Match & { homeTeam?: Team; awayTeam?: Team; league?: League }) => (
        <div className="space-y-1">
          <div className="font-medium text-gray-900">
            {match.homeTeam?.name || match.homeTeamName} vs {match.awayTeam?.name || match.awayTeamName}
          </div>
          <div className="text-sm text-gray-500">
            {match.league?.name || "Unknown League"}
          </div>
        </div>
      ),
    },
    {
      key: "result",
      header: "Result",
      render: (match: Match) => {
        const homeSets = match.homeSets || 0;
        const awaySets = match.awaySets || 0;
        const homeWon = homeSets > awaySets;
        
        return (
          <div className="space-y-1">
            <div className="font-bold text-lg">
              <span className={homeWon ? "text-green-600" : "text-gray-600"}>{homeSets}</span>
              {" : "}
              <span className={!homeWon ? "text-green-600" : "text-gray-600"}>{awaySets}</span>
            </div>
            <div className="text-sm text-gray-500">
              {(() => {
                const homeSets = match.homeSets || 0;
                const awaySets = match.awaySets || 0;
                let homePoints = 0;
                let awayPoints = 0;
                
                if (homeSets > awaySets) {
                  // Home team won
                  if (homeSets === 3 && awaySets === 2) {
                    homePoints = 2; // Tie break win
                    awayPoints = 1;
                  } else {
                    homePoints = 3; // Regular win (3-0 or 3-1)
                    awayPoints = 0;
                  }
                } else if (awaySets > homeSets) {
                  // Away team won
                  if (awaySets === 3 && homeSets === 2) {
                    awayPoints = 2; // Tie break win
                    homePoints = 1;
                  } else {
                    awayPoints = 3; // Regular win (3-0 or 3-1)
                    homePoints = 0;
                  }
                }
                
                return `Sets (${homePoints} : ${awayPoints} pts)`;
              })()}
            </div>
          </div>
        );
      },
    },
    {
      key: "sets",
      header: "Set Details",
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
      key: "winner",
      header: "Winner",
      render: (match: Match) => {
        const homeSets = match.homeSets || 0;
        const awaySets = match.awaySets || 0;
        if (homeSets === awaySets) return <Badge variant="outline">Tie</Badge>;
        const winner = homeSets > awaySets ? match.homeTeamName : match.awayTeamName;
        return (
          <Badge variant="default" className="text-xs">
            <Trophy className="w-3 h-3 mr-1" />
            {winner}
          </Badge>
        );
      },
    },
    {
      key: "date",
      header: "Date",
      render: (match: Match) => {
        // Prioritize actual match date, fall back to scrape date if needed
        const hasActualDate = match.matchDate && match.matchDate !== null;
        const displayDate = hasActualDate ? match.matchDate : match.createdAt;
        
        if (!displayDate) return <span className="text-gray-400">-</span>;
        
        const date = new Date(displayDate);
        const isToday = new Date().toDateString() === date.toDateString();
        const isRecent = Date.now() - date.getTime() < 7 * 24 * 60 * 60 * 1000; // Within 7 days
        
        return (
          <div className="text-sm">
            <div className={`font-medium ${isToday ? 'text-green-600' : isRecent ? 'text-blue-600' : 'text-gray-700'}`}>
              {date.toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric',
                year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
              })}
            </div>
            <div className="text-xs text-gray-500">
              {hasActualDate ? formatDistanceToNow(date, { addSuffix: true }) : `Scraped ${formatDistanceToNow(date, { addSuffix: true })}`}
            </div>
          </div>
        );
      },
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Volleyball Games Database</h1>
        <p className="text-gray-600 mt-2">
          Complete database of extracted volleyball matches with detailed set scores and team statistics
        </p>
        {dateRange && (
          <div className="mt-3 flex items-center space-x-2 text-sm text-blue-600">
            <Calendar className="w-4 h-4" />
            <span>
              Matches from {dateRange.earliest.toLocaleDateString()} to {dateRange.latest.toLocaleDateString()}
            </span>
          </div>
        )}
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              <div>
                <div className="text-2xl font-bold">{totalMatches}</div>
                <div className="text-sm text-gray-600">Total Matches</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Trophy className="w-5 h-5 text-green-600" />
              <div>
                <div className="text-2xl font-bold">{completedMatches}</div>
                <div className="text-sm text-gray-600">Completed</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <BarChart3 className="w-5 h-5 text-purple-600" />
              <div>
                <div className="text-2xl font-bold">{leagues.length}</div>
                <div className="text-sm text-gray-600">Leagues</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-orange-600" />
              <div>
                <div className="text-2xl font-bold">{recentMatches}</div>
                <div className="text-sm text-gray-600">Recent (7 days)</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Filter className="w-5 h-5" />
              <span>Filter Games</span>
            </div>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="w-4 h-4 mr-1" />
                Clear All
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* League Filter */}
            <div>
              <Label>League</Label>
              <Select value={selectedLeague} onValueChange={setSelectedLeague}>
                <SelectTrigger>
                  <SelectValue placeholder="All leagues" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All leagues</SelectItem>
                  {leagues.map((league) => (
                    <SelectItem key={league.id} value={league.id.toString()}>
                      {league.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Team Filter */}
            <div>
              <Label>Any Team</Label>
              <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                <SelectTrigger>
                  <SelectValue placeholder="All teams" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All teams</SelectItem>
                  {teamNames.map((teamName) => (
                    <SelectItem key={teamName} value={teamName}>
                      {teamName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Home Team Filter */}
            <div>
              <Label>Home Team</Label>
              <Select value={homeTeam} onValueChange={setHomeTeam}>
                <SelectTrigger>
                  <SelectValue placeholder="Any home team" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any home team</SelectItem>
                  {teamNames.map((teamName) => (
                    <SelectItem key={teamName} value={teamName}>
                      {teamName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Away Team Filter */}
            <div>
              <Label>Away Team</Label>
              <Select value={awayTeam} onValueChange={setAwayTeam}>
                <SelectTrigger>
                  <SelectValue placeholder="Any away team" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any away team</SelectItem>
                  {teamNames.map((teamName) => (
                    <SelectItem key={teamName} value={teamName}>
                      {teamName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Search */}
            <div>
              <Label>Search</Label>
              <Input
                placeholder="Search matches..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Games Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Volleyball Matches ({filteredMatches.length} of {matches.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable 
            data={filteredMatches} 
            columns={matchColumns}
            loading={matchesLoading}
            searchPlaceholder="Search matches by team names or set scores..."
          />
        </CardContent>
      </Card>

      {/* Match Details Modal */}
      <MatchDetailsModal
        open={matchDetailsModal.open}
        onClose={() => setMatchDetailsModal({ open: false, match: null })}
        match={matchDetailsModal.match}
      />
    </div>
  );
}