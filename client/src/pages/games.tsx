import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { 
  ArrowLeft, 
  Calendar, 
  MapPin, 
  Trophy, 
  Users,
  Filter,
  Search,
  ExternalLink
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Games() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLeague, setSelectedLeague] = useState<string>("all");
  const [selectedTeam, setSelectedTeam] = useState<string>("all");

  const { data: matches, isLoading: matchesLoading } = useQuery({
    queryKey: ["/api/matches"],
  });

  const { data: leagues } = useQuery({
    queryKey: ["/api/leagues"],
  });

  const { data: teams } = useQuery({
    queryKey: ["/api/teams"],
  });

  // Filter matches based on search and filters
  const filteredMatches = matches?.filter((match: any) => {
    const matchesSearch = searchTerm === "" || 
      match.homeTeam?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      match.awayTeam?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      match.matchId?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesLeague = selectedLeague === "all" || match.leagueId?.toString() === selectedLeague;
    
    const matchesTeam = selectedTeam === "all" || 
      match.homeTeamId?.toString() === selectedTeam || 
      match.awayTeamId?.toString() === selectedTeam;
    
    return matchesSearch && matchesLeague && matchesTeam;
  }) || [];

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return "TBD";
    }
  };

  const getMatchStatus = (match: any) => {
    if (match.homeScore !== null && match.awayScore !== null) {
      return "completed";
    }
    const matchDate = new Date(match.date);
    const now = new Date();
    return matchDate > now ? "upcoming" : "live";
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge variant="default">Completed</Badge>;
      case "upcoming":
        return <Badge variant="secondary">Upcoming</Badge>;
      case "live":
        return <Badge variant="destructive">Live</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  if (matchesLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading games...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link href="/admin" className="text-gray-600 hover:text-gray-900">
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <h1 className="text-xl font-semibold text-gray-900">Games Management</h1>
            </div>
            <div className="flex items-center space-x-2">
              <Trophy className="h-5 w-5 text-blue-600" />
              <span className="text-sm text-gray-600">{filteredMatches.length} games</span>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Filter className="h-5 w-5 mr-2" />
              Filter Games
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Search</label>
                <div className="relative">
                  <Search className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
                  <Input
                    placeholder="Search teams or match ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">League</label>
                <Select value={selectedLeague} onValueChange={setSelectedLeague}>
                  <SelectTrigger>
                    <SelectValue placeholder="All leagues" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Leagues</SelectItem>
                    {leagues?.map((league: any) => (
                      <SelectItem key={league.id} value={league.id.toString()}>
                        {league.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Team</label>
                <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                  <SelectTrigger>
                    <SelectValue placeholder="All teams" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Teams</SelectItem>
                    {teams?.map((team: any) => (
                      <SelectItem key={team.id} value={team.id.toString()}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Actions</label>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setSearchTerm("");
                    setSelectedLeague("all");
                    setSelectedTeam("all");
                  }}
                  className="w-full"
                >
                  Clear Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Games List */}
        <div className="space-y-4">
          {filteredMatches.length > 0 ? (
            filteredMatches.map((match: any) => {
              const status = getMatchStatus(match);
              return (
                <Card key={match.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-4 mb-3">
                          <div className="flex items-center space-x-2">
                            <Users className="h-4 w-4 text-gray-400" />
                            <span className="font-medium">{match.homeTeam?.name || "Unknown Team"}</span>
                            <span className="text-gray-400">vs</span>
                            <span className="font-medium">{match.awayTeam?.name || "Unknown Team"}</span>
                          </div>
                          {getStatusBadge(status)}
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 mr-2" />
                            {formatDate(match.date)}
                          </div>
                          <div className="flex items-center">
                            <MapPin className="h-4 w-4 mr-2" />
                            {match.location || "TBD"}
                          </div>
                          <div className="flex items-center">
                            <Trophy className="h-4 w-4 mr-2" />
                            {match.league?.name || "Unknown League"}
                          </div>
                        </div>
                        
                        {status === "completed" && (
                          <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                            <div className="text-center">
                              <span className="text-lg font-bold">
                                {match.homeScore} - {match.awayScore}
                              </span>
                              <div className="text-sm text-gray-600 mt-1">
                                Final Score
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex flex-col items-end space-y-2">
                        {match.samsUrl && (
                          <Button variant="outline" size="sm" asChild>
                            <a href={match.samsUrl} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-4 w-4 mr-2" />
                              View in SAMS
                            </a>
                          </Button>
                        )}
                        <div className="text-xs text-gray-500">
                          ID: {match.matchId}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <Trophy className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No games found</h3>
                <p className="text-gray-600">
                  {searchTerm || selectedLeague !== "all" || selectedTeam !== "all"
                    ? "Try adjusting your filters to see more results."
                    : "No games have been scraped yet. Run the data scraping process to populate games."}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}