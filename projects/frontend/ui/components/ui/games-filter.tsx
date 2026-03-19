import React from "react";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Filter, X } from "lucide-react";
import type { League, Team } from "@shared/schema";

interface GamesFilterProps {
  leagues: League[];
  teams: Team[];
  onFilterChange: (filters: {
    leagueId?: number;
    teamName?: string;
    homeTeam?: string;
    awayTeam?: string;
    searchTerm?: string;
  }) => void;
}

export default function GamesFilter({ leagues, teams, onFilterChange }: GamesFilterProps) {
  const [selectedLeague, setSelectedLeague] = useState<string>("");
  const [selectedTeam, setSelectedTeam] = useState<string>("");
  const [homeTeam, setHomeTeam] = useState<string>("");
  const [awayTeam, setAwayTeam] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");

  const handleFilterChange = () => {
    onFilterChange({
      leagueId: selectedLeague ? parseInt(selectedLeague) : undefined,
      teamName: selectedTeam || undefined,
      homeTeam: homeTeam || undefined,
      awayTeam: awayTeam || undefined,
      searchTerm: searchTerm || undefined,
    });
  };

  const clearFilters = () => {
    setSelectedLeague("");
    setSelectedTeam("");
    setHomeTeam("");
    setAwayTeam("");
    setSearchTerm("");
    onFilterChange({});
  };

  const hasActiveFilters = selectedLeague || selectedTeam || homeTeam || awayTeam || searchTerm;

  // Get unique team names from teams
  const teamNames = Array.from(new Set(teams.map(t => t.name))).sort();

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Filter className="w-5 h-5" />
          <span>Filter Games</span>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="ml-auto"
            >
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
            <Label htmlFor="league">League</Label>
            <Select value={selectedLeague} onValueChange={setSelectedLeague}>
              <SelectTrigger>
                <SelectValue placeholder="All leagues" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All leagues</SelectItem>
                {leagues.map((league) => (
                  <SelectItem key={league.id} value={league.id.toString()}>
                    {league.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Team Filter (Any Team) */}
          <div>
            <Label htmlFor="team">Any Team</Label>
            <Select value={selectedTeam} onValueChange={setSelectedTeam}>
              <SelectTrigger>
                <SelectValue placeholder="All teams" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All teams</SelectItem>
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
            <Label htmlFor="homeTeam">Home Team</Label>
            <Select value={homeTeam} onValueChange={setHomeTeam}>
              <SelectTrigger>
                <SelectValue placeholder="Any home team" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Any home team</SelectItem>
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
            <Label htmlFor="awayTeam">Away Team</Label>
            <Select value={awayTeam} onValueChange={setAwayTeam}>
              <SelectTrigger>
                <SelectValue placeholder="Any away team" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Any away team</SelectItem>
                {teamNames.map((teamName) => (
                  <SelectItem key={teamName} value={teamName}>
                    {teamName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Search Term */}
          <div>
            <Label htmlFor="search">Search</Label>
            <Input
              id="search"
              placeholder="Search matches..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="mt-4">
          <Button onClick={handleFilterChange} className="w-full md:w-auto">
            <Filter className="w-4 h-4 mr-2" />
            Apply Filters
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}