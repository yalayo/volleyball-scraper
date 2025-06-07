import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useQuery } from "@tanstack/react-query";
import DataTable from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, Trophy, Calendar } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { Match } from "@shared/schema";

interface TeamGamesModalProps {
  open: boolean;
  onClose: () => void;
  teamId: number;
  teamName: string;
  onViewMatch: (match: Match) => void;
}

export default function TeamGamesModal({ open, onClose, teamId, teamName, onViewMatch }: TeamGamesModalProps) {
  const { data: teamMatches = [], isLoading } = useQuery<Match[]>({
    queryKey: ["/api/teams", teamId, "matches"],
    enabled: open && teamId > 0,
  });

  const matchColumns = [
    {
      key: "opponent",
      header: "Opponent",
      render: (match: Match) => (
        <div className="font-medium">
          {match.homeTeamName === teamName ? match.awayTeamName : match.homeTeamName}
        </div>
      ),
    },
    {
      key: "venue",
      header: "Venue",
      render: (match: Match) => (
        <Badge variant={match.homeTeamName === teamName ? "default" : "secondary"}>
          {match.homeTeamName === teamName ? "Home" : "Away"}
        </Badge>
      ),
    },
    {
      key: "result",
      header: "Result",
      render: (match: Match) => {
        const isHome = match.homeTeamName === teamName;
        const teamSets = isHome ? (match.homeSets || 0) : (match.awaySets || 0);
        const opponentSets = isHome ? (match.awaySets || 0) : (match.homeSets || 0);
        const won = teamSets > opponentSets;
        
        return (
          <div className="space-y-1">
            <div className={`font-bold ${won ? 'text-green-600' : 'text-red-600'}`}>
              {teamSets} : {opponentSets}
            </div>
            <Badge variant={won ? "default" : "destructive"} className="text-xs">
              {won ? "W" : "L"}
            </Badge>
          </div>
        );
      },
    },
    {
      key: "score",
      header: "Points",
      render: (match: Match) => {
        const isHome = match.homeTeamName === teamName;
        const teamScore = isHome ? (match.homeScore || 0) : (match.awayScore || 0);
        const opponentScore = isHome ? (match.awayScore || 0) : (match.homeScore || 0);
        
        return (
          <div className="text-sm">
            {teamScore} : {opponentScore}
          </div>
        );
      },
    },
    {
      key: "date",
      header: "Date",
      render: (match: Match) => (
        <div className="text-sm text-gray-600 flex items-center space-x-1">
          <Calendar className="w-3 h-3" />
          <span>
            {match.matchDate || match.createdAt 
              ? formatDistanceToNow(new Date(match.matchDate || match.createdAt!), { addSuffix: true })
              : "Unknown"
            }
          </span>
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
          onClick={() => onViewMatch(match)}
        >
          <Eye className="w-4 h-4 mr-1" />
          Details
        </Button>
      ),
      searchable: false,
    },
  ];

  const wins = teamMatches.filter(match => {
    const isHome = match.homeTeamName === teamName;
    const teamSets = isHome ? (match.homeSets || 0) : (match.awaySets || 0);
    const opponentSets = isHome ? (match.awaySets || 0) : (match.homeSets || 0);
    return teamSets > opponentSets;
  }).length;

  const losses = teamMatches.length - wins;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Trophy className="w-5 h-5" />
            <span>{teamName} - Match History</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Team Stats Summary */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-blue-50 p-3 rounded-lg text-center">
              <div className="text-2xl font-bold text-blue-600">{teamMatches.length}</div>
              <div className="text-xs text-blue-800">Total Games</div>
            </div>
            <div className="bg-green-50 p-3 rounded-lg text-center">
              <div className="text-2xl font-bold text-green-600">{wins}</div>
              <div className="text-xs text-green-800">Wins</div>
            </div>
            <div className="bg-red-50 p-3 rounded-lg text-center">
              <div className="text-2xl font-bold text-red-600">{losses}</div>
              <div className="text-xs text-red-800">Losses</div>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg text-center">
              <div className="text-2xl font-bold text-gray-600">
                {teamMatches.length > 0 ? Math.round((wins / teamMatches.length) * 100) : 0}%
              </div>
              <div className="text-xs text-gray-800">Win Rate</div>
            </div>
          </div>

          {/* Matches Table */}
          <DataTable 
            data={teamMatches} 
            columns={matchColumns}
            loading={isLoading}
            searchPlaceholder="Search matches..."
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}