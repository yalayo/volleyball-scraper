import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Trophy, Users, Calendar, MapPin } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { Match } from "@shared/schema";

interface MatchDetailsModalProps {
  open: boolean;
  onClose: () => void;
  match: Match | null;
}

export default function MatchDetailsModal({ open, onClose, match }: MatchDetailsModalProps) {
  if (!match) return null;

  const parseSetResults = (setResults: string | null) => {
    if (!setResults) return [];
    
    // Parse set results like "25:23, 25:20, 25:18" or "3:0 / 75:47"
    const sets = setResults.split(',').map(set => set.trim());
    return sets.map(set => {
      const [home, away] = set.split(':').map(s => s.trim());
      return { home: parseInt(home) || 0, away: parseInt(away) || 0 };
    });
  };

  const setResults = parseSetResults(match.setResults);
  const homeSets = match.homeSets || 0;
  const awaySets = match.awaySets || 0;
  const homeScore = match.homeScore || 0;
  const awayScore = match.awayScore || 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Trophy className="w-5 h-5" />
            <span>Match Details</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Match Header */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-center text-xl">
                {match.homeTeamName} vs {match.awayTeamName}
              </CardTitle>
              <div className="text-center text-sm text-gray-500">
                League {match.leagueId} • Match ID: {match.matchId || "Unknown"}
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <div className="text-4xl font-bold mb-2">
                  {homeSets} : {awaySets}
                </div>
                <Badge variant={homeSets > awaySets ? "default" : awaySets > homeSets ? "secondary" : "outline"}>
                  {homeSets > awaySets ? match.homeTeamName : awaySets > homeSets ? match.awayTeamName : "Tie"} Wins
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Match Statistics */}
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-center">{match.homeTeamName}</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <div className="text-2xl font-bold">{homeSets}</div>
                <div className="text-sm text-gray-500">Sets Won</div>
                <div className="text-lg font-semibold mt-2">{homeScore}</div>
                <div className="text-xs text-gray-500">Total Points</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-center">{match.awayTeamName}</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <div className="text-2xl font-bold">{awaySets}</div>
                <div className="text-sm text-gray-500">Sets Won</div>
                <div className="text-lg font-semibold mt-2">{awayScore}</div>
                <div className="text-xs text-gray-500">Total Points</div>
              </CardContent>
            </Card>
          </div>

          {/* Set-by-Set Results */}
          {setResults.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center space-x-2">
                  <Users className="w-4 h-4" />
                  <span>Set-by-Set Results</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {setResults.map((set, index) => (
                    <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <span className="text-sm font-medium">Set {index + 1}</span>
                      <span className="font-bold">
                        {set.home} : {set.away}
                      </span>
                      <Badge variant={set.home > set.away ? "default" : "secondary"} className="text-xs">
                        {set.home > set.away ? "H" : "A"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Match Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Match Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center space-x-2 text-sm">
                <Calendar className="w-4 h-4 text-gray-500" />
                <span className="text-gray-600">Date:</span>
                <span>
                  {match.matchDate || match.createdAt 
                    ? formatDistanceToNow(new Date(match.matchDate || match.createdAt!), { addSuffix: true })
                    : "Unknown"
                  }
                </span>
              </div>
              
              <Separator />
              
              <div className="flex items-center space-x-2 text-sm">
                <Trophy className="w-4 h-4 text-gray-500" />
                <span className="text-gray-600">Status:</span>
                <Badge variant="outline">{match.status || "Completed"}</Badge>
              </div>

              {match.setResults && (
                <>
                  <Separator />
                  <div className="text-sm">
                    <span className="text-gray-600">Raw Result:</span>
                    <code className="ml-2 bg-gray-100 px-2 py-1 rounded text-xs">
                      {match.setResults}
                    </code>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}