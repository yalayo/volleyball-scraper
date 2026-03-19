import React from "react";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Award, TrendingUp, Calendar, Star, Sparkles, Target, Flame } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { formatDistanceToNow } from "date-fns";

interface Team {
  id: number;
  name: string;
  location: string | null;
  league?: {
    id: number;
    name: string;
  };
}

interface TeamHighlight {
  id: number;
  teamId: number;
  highlightType: string;
  title: string;
  description: string;
  matchId: number | null;
  value: number | null;
  dateAchieved: string;
  priority: number | null;
  isActive: boolean | null;
  team?: Team;
  match?: {
    id: number;
    homeTeamName: string;
    awayTeamName: string;
    matchDate: string;
  };
}

const highlightTypeConfig = {
  win_streak: {
    icon: Flame,
    color: "bg-red-500",
    label: "Win Streak",
    description: "Consecutive victories"
  },
  comeback: {
    icon: TrendingUp,
    color: "bg-blue-500",
    label: "Comeback Win",
    description: "Victory after losing first set"
  },
  dominant_performance: {
    icon: Target,
    color: "bg-green-500",
    label: "Dominant Win",
    description: "Straight-set victory"
  },
  milestone: {
    icon: Award,
    color: "bg-purple-500",
    label: "Milestone",
    description: "Achievement unlocked"
  }
};

export default function HighlightsPage() {
  const [selectedTeam, setSelectedTeam] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all");
  const queryClient = useQueryClient();

  // Fetch teams
  const { data: teams = [] } = useQuery<Team[]>({
    queryKey: ["/api/teams"],
  });

  // Fetch highlights
  const { data: highlights = [], isLoading: highlightsLoading, refetch: refetchHighlights } = useQuery<TeamHighlight[]>({
    queryKey: ["/api/team-highlights"],
  });

  // Generate highlights mutation
  const generateHighlightsMutation = useMutation({
    mutationFn: async (teamId: number) => {
      const response = await fetch(`/api/team-highlights/${teamId}/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
      if (!response.ok) {
        throw new Error(`Failed to generate highlights: ${response.statusText}`);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/team-highlights"] });
      refetchHighlights();
    },
  });

  // Filter highlights based on selected team and type
  const filteredHighlights = highlights.filter(highlight => {
    if (selectedTeam !== "all" && highlight.teamId !== parseInt(selectedTeam)) {
      return false;
    }
    if (selectedType !== "all" && highlight.highlightType !== selectedType) {
      return false;
    }
    return highlight.isActive;
  }).sort((a, b) => {
    // Sort by priority (highest first), then by date (most recent first)
    const priorityDiff = (b.priority || 0) - (a.priority || 0);
    if (priorityDiff !== 0) return priorityDiff;
    return new Date(b.dateAchieved).getTime() - new Date(a.dateAchieved).getTime();
  });

  const generateAllHighlights = async () => {
    const activeTeams = teams.filter(team => team.id);
    for (const team of activeTeams) {
      await generateHighlightsMutation.mutateAsync(team.id);
    }
  };

  const getHighlightIcon = (type: string) => {
    const config = highlightTypeConfig[type as keyof typeof highlightTypeConfig];
    return config ? config.icon : Star;
  };

  const getHighlightColor = (type: string) => {
    const config = highlightTypeConfig[type as keyof typeof highlightTypeConfig];
    return config ? config.color : "bg-gray-500";
  };

  const getPriorityBadge = (priority: number | null) => {
    if (!priority) return null;
    
    if (priority >= 5) return <Badge variant="destructive">High Priority</Badge>;
    if (priority >= 4) return <Badge variant="default">Medium Priority</Badge>;
    if (priority >= 3) return <Badge variant="secondary">Normal</Badge>;
    return <Badge variant="outline">Low Priority</Badge>;
  };

  const highlightsByTeam = filteredHighlights.reduce((acc, highlight) => {
    const teamName = highlight.team?.name || `Team ${highlight.teamId}`;
    if (!acc[teamName]) {
      acc[teamName] = [];
    }
    acc[teamName].push(highlight);
    return acc;
  }, {} as Record<string, TeamHighlight[]>);

  const highlightsByType = filteredHighlights.reduce((acc, highlight) => {
    if (!acc[highlight.highlightType]) {
      acc[highlight.highlightType] = [];
    }
    acc[highlight.highlightType].push(highlight);
    return acc;
  }, {} as Record<string, TeamHighlight[]>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Team Highlight Reel Generator</h1>
        <p className="text-gray-600 mt-2">
          Personalized team highlights showcasing key achievements, win streaks, and outstanding performances
        </p>
      </div>

      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-5 h-5" />
              <span>Highlight Controls</span>
            </div>
            <Button 
              onClick={generateAllHighlights}
              disabled={generateHighlightsMutation.isPending}
              size="sm"
            >
              {generateHighlightsMutation.isPending ? "Generating..." : "Generate All Highlights"}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Team Filter */}
            <div>
              <label className="text-sm font-medium mb-2 block">Filter by Team</label>
              <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                <SelectTrigger>
                  <SelectValue placeholder="All teams" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Teams</SelectItem>
                  {teams.map((team) => (
                    <SelectItem key={team.id} value={team.id.toString()}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Type Filter */}
            <div>
              <label className="text-sm font-medium mb-2 block">Filter by Type</label>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {Object.entries(highlightTypeConfig).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      {config.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Highlight Views */}
      <Tabs defaultValue="grid" className="space-y-4">
        <TabsList>
          <TabsTrigger value="grid">Grid View</TabsTrigger>
          <TabsTrigger value="teams">By Team</TabsTrigger>
          <TabsTrigger value="types">By Type</TabsTrigger>
        </TabsList>

        {/* Grid View */}
        <TabsContent value="grid">
          {highlightsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="h-4 bg-gray-200 rounded mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded mb-4"></div>
                    <div className="h-8 bg-gray-200 rounded"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredHighlights.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Trophy className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Highlights Found</h3>
                <p className="text-gray-600 mb-4">
                  Generate highlights to see team achievements and outstanding performances
                </p>
                <Button onClick={generateAllHighlights} disabled={generateHighlightsMutation.isPending}>
                  {generateHighlightsMutation.isPending ? "Generating..." : "Generate Highlights"}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredHighlights.map((highlight) => {
                const IconComponent = getHighlightIcon(highlight.highlightType);
                const colorClass = getHighlightColor(highlight.highlightType);
                
                return (
                  <Card key={highlight.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className={`p-2 rounded-lg ${colorClass} text-white`}>
                          <IconComponent className="w-5 h-5" />
                        </div>
                        {getPriorityBadge(highlight.priority)}
                      </div>
                      
                      <h3 className="font-semibold text-lg mb-2">{highlight.title}</h3>
                      <p className="text-gray-600 text-sm mb-3">{highlight.description}</p>
                      
                      <div className="flex items-center justify-between text-sm text-gray-500">
                        <span className="font-medium">{highlight.team?.name}</span>
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-4 h-4" />
                          <span>{formatDistanceToNow(new Date(highlight.dateAchieved), { addSuffix: true })}</span>
                        </div>
                      </div>
                      
                      {highlight.value && (
                        <div className="mt-3 p-2 bg-gray-50 rounded-lg">
                          <span className="text-2xl font-bold text-gray-900">{highlight.value}</span>
                          <span className="text-sm text-gray-600 ml-1">
                            {highlight.highlightType === 'win_streak' ? 'wins' : 
                             highlight.highlightType === 'comeback' ? 'comebacks' :
                             highlight.highlightType === 'dominant_performance' ? 'wins' : 'points'}
                          </span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* By Team View */}
        <TabsContent value="teams">
          <div className="space-y-6">
            {Object.entries(highlightsByTeam).map(([teamName, teamHighlights]) => (
              <Card key={teamName}>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Trophy className="w-5 h-5" />
                    <span>{teamName}</span>
                    <Badge variant="outline">{teamHighlights.length} highlights</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {teamHighlights.map((highlight) => {
                      const IconComponent = getHighlightIcon(highlight.highlightType);
                      const colorClass = getHighlightColor(highlight.highlightType);
                      
                      return (
                        <div key={highlight.id} className="flex items-start space-x-3 p-4 border rounded-lg">
                          <div className={`p-2 rounded-lg ${colorClass} text-white flex-shrink-0`}>
                            <IconComponent className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium">{highlight.title}</h4>
                            <p className="text-sm text-gray-600">{highlight.description}</p>
                            <div className="flex items-center justify-between mt-2">
                              {getPriorityBadge(highlight.priority)}
                              <span className="text-xs text-gray-500">
                                {formatDistanceToNow(new Date(highlight.dateAchieved), { addSuffix: true })}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* By Type View */}
        <TabsContent value="types">
          <div className="space-y-6">
            {Object.entries(highlightsByType).map(([type, typeHighlights]) => {
              const config = highlightTypeConfig[type as keyof typeof highlightTypeConfig];
              const IconComponent = config?.icon || Star;
              
              return (
                <Card key={type}>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <IconComponent className="w-5 h-5" />
                      <span>{config?.label || type}</span>
                      <Badge variant="outline">{typeHighlights.length} highlights</Badge>
                    </CardTitle>
                    {config && (
                      <p className="text-sm text-gray-600">{config.description}</p>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {typeHighlights.map((highlight) => (
                        <div key={highlight.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <h4 className="font-medium">{highlight.title}</h4>
                            <p className="text-sm text-gray-600">{highlight.team?.name}</p>
                          </div>
                          <div className="text-right">
                            {getPriorityBadge(highlight.priority)}
                            <div className="text-xs text-gray-500 mt-1">
                              {formatDistanceToNow(new Date(highlight.dateAchieved), { addSuffix: true })}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}