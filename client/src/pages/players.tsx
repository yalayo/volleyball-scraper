import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { 
  ArrowLeft, 
  Users, 
  Filter,
  Search,
  MapPin,
  Trophy,
  User,
  Flag,
  Hash
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export default function Players() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTeam, setSelectedTeam] = useState<string>("all");
  const [selectedPosition, setSelectedPosition] = useState<string>("all");
  const [selectedNationality, setSelectedNationality] = useState<string>("all");

  const { data: players, isLoading: playersLoading } = useQuery({
    queryKey: ["/api/players"],
    select: (data: any) => data || []
  });

  const { data: teams } = useQuery({
    queryKey: ["/api/teams"],
    select: (data: any) => data || []
  });

  // Get unique positions and nationalities for filters
  const positions = [...new Set(players?.map((player: any) => player.position).filter(Boolean))] || [];
  const nationalities = [...new Set(players?.map((player: any) => player.nationality).filter(Boolean))] || [];

  // Filter players based on search and filters
  const filteredPlayers = players?.filter((player: any) => {
    const matchesSearch = searchTerm === "" || 
      player.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      player.samsPlayerId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      player.jerseyNumber?.toString().includes(searchTerm);
    
    const matchesTeam = selectedTeam === "all" || player.teamId?.toString() === selectedTeam;
    const matchesPosition = selectedPosition === "all" || player.position === selectedPosition;
    const matchesNationality = selectedNationality === "all" || player.nationality === selectedNationality;
    
    return matchesSearch && matchesTeam && matchesPosition && matchesNationality;
  }) || [];

  const getPlayerInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getPositionBadge = (position: string) => {
    const positionColors: { [key: string]: string } = {
      'Libero': 'bg-purple-100 text-purple-800',
      'Zuspieler': 'bg-blue-100 text-blue-800',
      'Mittelblocker': 'bg-green-100 text-green-800',
      'Außenangreifer': 'bg-orange-100 text-orange-800',
      'Diagonalangreifer': 'bg-red-100 text-red-800',
      'Universalspieler': 'bg-gray-100 text-gray-800'
    };
    
    return (
      <Badge 
        variant="secondary" 
        className={positionColors[position] || 'bg-gray-100 text-gray-800'}
      >
        {position}
      </Badge>
    );
  };

  if (playersLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading players...</p>
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
              <h1 className="text-xl font-semibold text-gray-900">Players Management</h1>
            </div>
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-blue-600" />
              <span className="text-sm text-gray-600">{filteredPlayers.length} players</span>
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
              Filter Players
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Search</label>
                <div className="relative">
                  <Search className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
                  <Input
                    placeholder="Search name, SAMS ID, jersey..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
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
                <label className="text-sm font-medium">Position</label>
                <Select value={selectedPosition} onValueChange={setSelectedPosition}>
                  <SelectTrigger>
                    <SelectValue placeholder="All positions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Positions</SelectItem>
                    {positions.map((position: string) => (
                      <SelectItem key={position} value={position}>
                        {position}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Nationality</label>
                <Select value={selectedNationality} onValueChange={setSelectedNationality}>
                  <SelectTrigger>
                    <SelectValue placeholder="All countries" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Countries</SelectItem>
                    {nationalities.map((nationality: string) => (
                      <SelectItem key={nationality} value={nationality}>
                        {nationality}
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
                    setSelectedTeam("all");
                    setSelectedPosition("all");
                    setSelectedNationality("all");
                  }}
                  className="w-full"
                >
                  Clear Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Players Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPlayers.length > 0 ? (
            filteredPlayers.map((player: any) => (
              <Card key={player.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start space-x-4">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="bg-blue-100 text-blue-600">
                        {getPlayerInitials(player.name || "?")}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium text-gray-900 truncate">
                          {player.name || "Unknown Player"}
                        </h3>
                        {player.jerseyNumber && (
                          <Badge variant="outline" className="ml-2">
                            #{player.jerseyNumber}
                          </Badge>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        {player.position && (
                          <div className="flex items-center">
                            <User className="h-4 w-4 text-gray-400 mr-2" />
                            {getPositionBadge(player.position)}
                          </div>
                        )}
                        
                        {player.team?.name && (
                          <div className="flex items-center text-sm text-gray-600">
                            <Trophy className="h-4 w-4 mr-2" />
                            <span className="truncate">{player.team.name}</span>
                          </div>
                        )}
                        
                        {player.nationality && (
                          <div className="flex items-center text-sm text-gray-600">
                            <Flag className="h-4 w-4 mr-2" />
                            <span>{player.nationality}</span>
                          </div>
                        )}
                        
                        {player.samsPlayerId && (
                          <div className="flex items-center text-sm text-gray-600">
                            <Hash className="h-4 w-4 mr-2" />
                            <span className="font-mono text-xs">{player.samsPlayerId}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="col-span-full">
              <Card>
                <CardContent className="text-center py-12">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No players found</h3>
                  <p className="text-gray-600">
                    {searchTerm || selectedTeam !== "all" || selectedPosition !== "all" || selectedNationality !== "all"
                      ? "Try adjusting your filters to see more results."
                      : "No players have been scraped yet. Run the data scraping process to populate players."}
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Summary Stats */}
        {filteredPlayers.length > 0 && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Player Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-blue-600">{filteredPlayers.length}</div>
                  <div className="text-sm text-gray-600">Total Players</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">
                    {new Set(filteredPlayers.map((p: any) => p.teamId)).size}
                  </div>
                  <div className="text-sm text-gray-600">Teams Represented</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-600">
                    {new Set(filteredPlayers.map((p: any) => p.nationality).filter(Boolean)).size}
                  </div>
                  <div className="text-sm text-gray-600">Nationalities</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-orange-600">
                    {new Set(filteredPlayers.map((p: any) => p.position).filter(Boolean)).size}
                  </div>
                  <div className="text-sm text-gray-600">Positions</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}