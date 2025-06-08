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
  Globe,
  ExternalLink,
  Building
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function Teams() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLeague, setSelectedLeague] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  const { data: teams, isLoading: teamsLoading } = useQuery({
    queryKey: ["/api/teams"],
  });

  const { data: leagues } = useQuery({
    queryKey: ["/api/leagues"],
  });

  // Filter teams based on search and filters
  const filteredTeams = teams?.filter((team: any) => {
    const matchesSearch = searchTerm === "" || 
      team.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      team.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      team.teamId?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesLeague = selectedLeague === "all" || team.leagueId?.toString() === selectedLeague;
    
    const matchesStatus = selectedStatus === "all" || 
      (selectedStatus === "active" && team.isActive) ||
      (selectedStatus === "inactive" && !team.isActive);
    
    return matchesSearch && matchesLeague && matchesStatus;
  }) || [];

  const getTeamInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getStatusBadge = (isActive: boolean) => {
    return isActive ? 
      <Badge variant="default">Active</Badge> : 
      <Badge variant="secondary">Inactive</Badge>;
  };

  if (teamsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading teams...</p>
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
              <h1 className="text-xl font-semibold text-gray-900">Teams Management</h1>
            </div>
            <div className="flex items-center space-x-2">
              <Building className="h-5 w-5 text-blue-600" />
              <span className="text-sm text-gray-600">{filteredTeams.length} teams</span>
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
              Filter Teams
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Search</label>
                <div className="relative">
                  <Search className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
                  <Input
                    placeholder="Search name, location, ID..."
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
                <label className="text-sm font-medium">Status</label>
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
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
                    setSelectedStatus("all");
                  }}
                  className="w-full"
                >
                  Clear Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Teams Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTeams.length > 0 ? (
            filteredTeams.map((team: any) => (
              <Card key={team.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start space-x-4">
                    <Avatar className="h-16 w-16">
                      {team.logoUrl ? (
                        <AvatarImage src={team.logoUrl} alt={team.name} />
                      ) : (
                        <AvatarFallback className="bg-blue-100 text-blue-600 text-lg">
                          {getTeamInitials(team.name || "?")}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium text-gray-900 truncate">
                          {team.name || "Unknown Team"}
                        </h3>
                        {getStatusBadge(team.isActive)}
                      </div>
                      
                      <div className="space-y-2">
                        {team.location && (
                          <div className="flex items-center text-sm text-gray-600">
                            <MapPin className="h-4 w-4 mr-2" />
                            <span className="truncate">{team.location}</span>
                          </div>
                        )}
                        
                        {team.league?.name && (
                          <div className="flex items-center text-sm text-gray-600">
                            <Trophy className="h-4 w-4 mr-2" />
                            <span className="truncate">{team.league.name}</span>
                          </div>
                        )}
                        
                        {team.teamId && (
                          <div className="flex items-center text-sm text-gray-600">
                            <Building className="h-4 w-4 mr-2" />
                            <span className="font-mono text-xs">{team.teamId}</span>
                          </div>
                        )}
                      </div>

                      <div className="mt-4 flex space-x-2">
                        {team.homepage && (
                          <Button variant="outline" size="sm" asChild>
                            <a href={team.homepage} target="_blank" rel="noopener noreferrer">
                              <Globe className="h-4 w-4 mr-1" />
                              Website
                            </a>
                          </Button>
                        )}
                        {team.samsId && (
                          <Button variant="outline" size="sm" asChild>
                            <a 
                              href={`https://www.volleyball-verband.de/vereine/${team.samsId}`} 
                              target="_blank" 
                              rel="noopener noreferrer"
                            >
                              <ExternalLink className="h-4 w-4 mr-1" />
                              SAMS
                            </a>
                          </Button>
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
                  <Building className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No teams found</h3>
                  <p className="text-gray-600">
                    {searchTerm || selectedLeague !== "all" || selectedStatus !== "all"
                      ? "Try adjusting your filters to see more results."
                      : "No teams have been scraped yet. Run the data scraping process to populate teams."}
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Summary Stats */}
        {filteredTeams.length > 0 && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Team Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-blue-600">{filteredTeams.length}</div>
                  <div className="text-sm text-gray-600">Total Teams</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">
                    {filteredTeams.filter((t: any) => t.isActive).length}
                  </div>
                  <div className="text-sm text-gray-600">Active Teams</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-600">
                    {new Set(filteredTeams.map((t: any) => t.leagueId)).size}
                  </div>
                  <div className="text-sm text-gray-600">Leagues Represented</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-orange-600">
                    {new Set(filteredTeams.map((t: any) => t.location).filter(Boolean)).size}
                  </div>
                  <div className="text-sm text-gray-600">Locations</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}