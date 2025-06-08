import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { 
  ArrowLeft, 
  Filter,
  Search,
  MapPin,
  Trophy,
  Calendar,
  Users,
  Target,
  BarChart3
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Leagues() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  const { data: leagues, isLoading: leaguesLoading } = useQuery({
    queryKey: ["/api/leagues"],
    select: (data: any) => data || []
  });

  const { data: teams } = useQuery({
    queryKey: ["/api/teams"],
    select: (data: any) => data || []
  });

  const { data: matches } = useQuery({
    queryKey: ["/api/matches"],
    select: (data: any) => data || []
  });

  // Filter leagues based on search and filters
  const filteredLeagues = leagues?.filter((league: any) => {
    const matchesSearch = searchTerm === "" || 
      league.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      league.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      league.location?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = selectedCategory === "all" || 
      league.category?.toLowerCase() === selectedCategory.toLowerCase();
    
    const matchesStatus = selectedStatus === "all" || 
      (selectedStatus === "active" && league.isActive) ||
      (selectedStatus === "inactive" && !league.isActive);
    
    return matchesSearch && matchesCategory && matchesStatus;
  }) || [];

  // Calculate league statistics
  const getLeagueStats = (leagueId: number) => {
    const leagueTeams = teams?.filter((team: any) => team.leagueId === leagueId) || [];
    const leagueMatches = matches?.filter((match: any) => match.leagueId === leagueId) || [];
    
    return {
      teamCount: leagueTeams.length,
      matchCount: leagueMatches.length,
      completedMatches: leagueMatches.filter((match: any) => match.status === 'completed').length
    };
  };

  const getCategoryBadge = (category: string) => {
    const categoryColors: { [key: string]: string } = {
      'männer': 'bg-blue-100 text-blue-800',
      'frauen': 'bg-pink-100 text-pink-800',
      'mixed': 'bg-purple-100 text-purple-800',
      'jugend': 'bg-green-100 text-green-800',
      'default': 'bg-gray-100 text-gray-800'
    };
    
    const colorClass = categoryColors[category?.toLowerCase()] || categoryColors.default;
    
    return (
      <Badge variant="secondary" className={colorClass}>
        {category || "Unknown"}
      </Badge>
    );
  };

  const getStatusBadge = (isActive: boolean) => {
    return isActive ? 
      <Badge variant="default">Active</Badge> : 
      <Badge variant="secondary">Inactive</Badge>;
  };

  if (leaguesLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading leagues...</p>
        </div>
      </div>
    );
  }

  // Get unique categories for filter
  const categories = [...new Set(leagues?.map((league: any) => league.category).filter(Boolean))] || [];

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
              <h1 className="text-xl font-semibold text-gray-900">Leagues Management</h1>
            </div>
            <div className="flex items-center space-x-2">
              <Trophy className="h-5 w-5 text-blue-600" />
              <span className="text-sm text-gray-600">{filteredLeagues.length} leagues</span>
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
              Filter Leagues
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Search</label>
                <div className="relative">
                  <Search className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
                  <Input
                    placeholder="Search name, category, location..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Category</label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="All categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((category: string) => (
                      <SelectItem key={category} value={category}>
                        {category}
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
                    setSelectedCategory("all");
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

        {/* Leagues Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredLeagues.length > 0 ? (
            filteredLeagues.map((league: any) => {
              const stats = getLeagueStats(league.id);
              return (
                <Card key={league.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      {/* Header */}
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-gray-900 mb-2 line-clamp-2">
                            {league.name || "Unknown League"}
                          </h3>
                          <div className="flex items-center space-x-2 mb-2">
                            {getCategoryBadge(league.category)}
                            {getStatusBadge(league.isActive)}
                          </div>
                        </div>
                      </div>

                      {/* Details */}
                      <div className="space-y-2">
                        {league.location && (
                          <div className="flex items-center text-sm text-gray-600">
                            <MapPin className="h-4 w-4 mr-2" />
                            <span className="truncate">{league.location}</span>
                          </div>
                        )}
                        
                        {league.season && (
                          <div className="flex items-center text-sm text-gray-600">
                            <Calendar className="h-4 w-4 mr-2" />
                            <span>Season {league.season}</span>
                          </div>
                        )}
                      </div>

                      {/* Statistics */}
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="grid grid-cols-3 gap-3 text-center">
                          <div>
                            <div className="flex items-center justify-center mb-1">
                              <Users className="h-4 w-4 text-blue-600" />
                            </div>
                            <div className="text-lg font-semibold text-gray-900">{stats.teamCount}</div>
                            <div className="text-xs text-gray-600">Teams</div>
                          </div>
                          <div>
                            <div className="flex items-center justify-center mb-1">
                              <Target className="h-4 w-4 text-green-600" />
                            </div>
                            <div className="text-lg font-semibold text-gray-900">{stats.matchCount}</div>
                            <div className="text-xs text-gray-600">Matches</div>
                          </div>
                          <div>
                            <div className="flex items-center justify-center mb-1">
                              <BarChart3 className="h-4 w-4 text-purple-600" />
                            </div>
                            <div className="text-lg font-semibold text-gray-900">
                              {stats.matchCount > 0 ? Math.round((stats.completedMatches / stats.matchCount) * 100) : 0}%
                            </div>
                            <div className="text-xs text-gray-600">Complete</div>
                          </div>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      {stats.matchCount > 0 && (
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs text-gray-600">
                            <span>Season Progress</span>
                            <span>{stats.completedMatches}/{stats.matchCount}</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                              style={{ 
                                width: `${stats.matchCount > 0 ? (stats.completedMatches / stats.matchCount) * 100 : 0}%` 
                              }}
                            ></div>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <div className="col-span-full">
              <Card>
                <CardContent className="text-center py-12">
                  <Trophy className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No leagues found</h3>
                  <p className="text-gray-600">
                    {searchTerm || selectedCategory !== "all" || selectedStatus !== "all"
                      ? "Try adjusting your filters to see more results."
                      : "No leagues have been scraped yet. Run the data scraping process to populate leagues."}
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Summary Stats */}
        {filteredLeagues.length > 0 && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>League Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-blue-600">{filteredLeagues.length}</div>
                  <div className="text-sm text-gray-600">Total Leagues</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">
                    {filteredLeagues.filter((l: any) => l.isActive).length}
                  </div>
                  <div className="text-sm text-gray-600">Active Leagues</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-600">
                    {new Set(filteredLeagues.map((l: any) => l.category)).size}
                  </div>
                  <div className="text-sm text-gray-600">Categories</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-orange-600">
                    {filteredLeagues.reduce((total: number, league: any) => {
                      return total + getLeagueStats(league.id).teamCount;
                    }, 0)}
                  </div>
                  <div className="text-sm text-gray-600">Total Teams</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}