import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Users, Trophy, Clock, MapPin, FileText, RefreshCw } from "lucide-react";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface MatchSet {
  id: number;
  setNumber: number;
  homeScore: number;
  awayScore: number;
  duration: number | null;
  pointSequence: string | null;
}

interface MatchLineup {
  id: number;
  setNumber: number;
  teamId: number;
  position1: string | null;
  position2: string | null;
  position3: string | null;
  position4: string | null;
  position5: string | null;
  position6: string | null;
  libero: string | null;
  substitutes: string | null;
}

interface MatchDetails {
  id: number;
  homeTeamName: string;
  awayTeamName: string;
  homeScore: number;
  awayScore: number;
  homeSets: number;
  awaySets: number;
  setResults: string | null;
  matchDate: string | null;
  status: string;
  location: string | null;
  scoresheetPdfUrl: string | null;
  sets: MatchSet[];
  lineups: MatchLineup[];
}

export default function MatchDetails() {
  const [, params] = useRoute("/match/:id");
  const matchId = params?.id;
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: match, isLoading } = useQuery<MatchDetails>({
    queryKey: [`/api/matches/${matchId}/details`],
    enabled: !!matchId,
  });

  // Debug logging when match data changes
  React.useEffect(() => {
    if (match) {
      console.log('Match details loaded:', match);
      console.log('Sets count:', match.sets?.length || 0);
      console.log('Lineups count:', match.lineups?.length || 0);
    }
  }, [match]);

  const processPdfMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/matches/${matchId}/process-pdf`),
    onSuccess: (data: any) => {
      toast({
        title: "PDF Processed Successfully",
        description: `Extracted ${data.setsExtracted} sets and ${data.lineupsExtracted} lineups`,
      });
      queryClient.invalidateQueries({ queryKey: [`/api/matches/${matchId}/details`] });
    },
    onError: (error: any) => {
      toast({
        title: "PDF Processing Failed",
        description: error.message || "Failed to process PDF scoresheet",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Match Not Found</h1>
          <Link href="/games">
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Games
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Date TBD";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatDuration = (minutes: number | null) => {
    if (!minutes) return "N/A";
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const getSetsByNumber = (setNumber: number) => {
    return match.sets.filter(set => set.setNumber === setNumber);
  };

  const getLineupsBySet = (setNumber: number, teamId?: number) => {
    return match.lineups.filter(lineup => 
      lineup.setNumber === setNumber && 
      (teamId ? lineup.teamId === teamId : true)
    );
  };

  const renderPointSequence = (pointSequence: string | null) => {
    let parsedSequence: any[] = [];
    
    if (pointSequence) {
      try {
        parsedSequence = JSON.parse(pointSequence);
      } catch (error) {
        console.error("Failed to parse point sequence:", error);
      }
    }
    
    if (!parsedSequence || parsedSequence.length === 0) {
      return <p className="text-gray-500">No point sequence data available</p>;
    }

    return (
      <div className="space-y-2">
        <h4 className="font-semibold">Point-by-Point Analysis</h4>
        <div className="grid gap-2 max-h-64 overflow-y-auto">
          {parsedSequence.map((point, index) => (
            <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
              <div className="flex items-center gap-2">
                <Badge variant={point.team === 'home' ? 'default' : 'secondary'}>
                  Point {point.point}
                </Badge>
                <span className="font-medium">{point.action}</span>
                {point.player && <span className="text-gray-600">by {point.player}</span>}
              </div>
              <div className="font-mono">
                {point.score.home} - {point.score.away}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderLineup = (lineups: MatchLineup[], teamName: string) => {
    if (lineups.length === 0) {
      return <p className="text-gray-500">No lineup data available for {teamName}</p>;
    }

    const lineup = lineups[0]; // Take the first lineup record for this team
    const positions = [
      { pos: 1, player: lineup.position1 },
      { pos: 2, player: lineup.position2 },
      { pos: 3, player: lineup.position3 },
      { pos: 4, player: lineup.position4 },
      { pos: 5, player: lineup.position5 },
      { pos: 6, player: lineup.position6 }
    ].filter(p => p.player);

    return (
      <div className="space-y-2">
        <h4 className="font-semibold">{teamName} Lineup</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {positions.map((position) => (
            <div key={position.pos} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-bold">
                {position.pos}
              </div>
              <div>
                <p className="font-medium text-sm">{position.player}</p>
              </div>
            </div>
          ))}
        </div>
        {lineup.libero && (
          <div className="mt-2">
            <div className="flex items-center gap-2 p-2 bg-yellow-50 rounded">
              <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center text-sm font-bold">
                L
              </div>
              <div>
                <p className="font-medium text-sm">{lineup.libero}</p>
                <p className="text-xs text-gray-600">Libero</p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <Link href="/games">
          <Button variant="outline" className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Games
          </Button>
        </Link>
        
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {match.homeTeamName} vs {match.awayTeamName}
            </h1>
            <div className="flex items-center gap-4 mt-2 text-gray-600">
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {formatDate(match.matchDate)}
              </div>
              {match.location && (
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {match.location}
                </div>
              )}
            </div>
          </div>
          
          {match.scoresheetPdfUrl && (
            <Button asChild>
              <a href={match.scoresheetPdfUrl} target="_blank" rel="noopener noreferrer">
                <Download className="w-4 h-4 mr-2" />
                Download Scoresheet
              </a>
            </Button>
          )}
        </div>
      </div>

      {/* Match Score Summary */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            Match Result
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <h3 className="text-lg font-semibold">{match.homeTeamName}</h3>
              <div className="text-3xl font-bold text-blue-600">{match.homeSets}</div>
            </div>
            <div className="flex items-center justify-center">
              <Badge variant="outline" className="text-lg px-4 py-2">
                {match.status}
              </Badge>
            </div>
            <div>
              <h3 className="text-lg font-semibold">{match.awayTeamName}</h3>
              <div className="text-3xl font-bold text-red-600">{match.awaySets}</div>
            </div>
          </div>
          
          {match.setResults && (
            <div className="mt-4 text-center">
              <p className="text-gray-600">Set Results: {match.setResults}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detailed Set Analysis */}
      {match.sets && match.sets.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Detailed Set Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="set-1" className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                {[1, 2, 3, 4, 5].map((setNum) => {
                  const setData = getSetsByNumber(setNum);
                  return (
                    <TabsTrigger 
                      key={setNum} 
                      value={`set-${setNum}`}
                      disabled={setData.length === 0}
                    >
                      Set {setNum}
                      {setData.length > 0 && (
                        <div className="ml-2 text-xs">
                          {setData[0].homeScore}-{setData[0].awayScore}
                        </div>
                      )}
                    </TabsTrigger>
                  );
                })}
              </TabsList>
              
              {[1, 2, 3, 4, 5].map((setNum) => {
                const setData = getSetsByNumber(setNum);
                const allLineups = getLineupsBySet(setNum);
                const teamIds = [...new Set(allLineups.map(l => l.teamId))];
                const homeLineups = allLineups.filter(lineup => lineup.teamId === teamIds[0]);
                const awayLineups = allLineups.filter(lineup => lineup.teamId === teamIds[1]);
                
                if (setData.length === 0) return null;

                return (
                  <TabsContent key={setNum} value={`set-${setNum}`} className="space-y-6">
                    {/* Set Score */}
                    <div className="text-center">
                      <h3 className="text-xl font-bold mb-2">Set {setNum}</h3>
                      <div className="text-2xl font-bold">
                        {match.homeTeamName} {setData[0].homeScore} - {setData[0].awayScore} {match.awayTeamName}
                      </div>
                      {setData[0].duration && (
                        <p className="text-gray-600 mt-1">
                          Duration: {formatDuration(setData[0].duration)}
                        </p>
                      )}
                    </div>

                    {/* Lineups */}
                    <div className="grid md:grid-cols-2 gap-6">
                      {renderLineup(homeLineups, match.homeTeamName)}
                      {renderLineup(awayLineups, match.awayTeamName)}
                    </div>

                    {/* Point Sequence */}
                    {setData[0].pointSequence && (
                      <div>
                        {renderPointSequence(setData[0].pointSequence)}
                      </div>
                    )}
                  </TabsContent>
                );
              })}
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Debug info */}
      {console.log('Rendering match details. Sets length:', match?.sets?.length, 'Lineups length:', match?.lineups?.length)}
      
      {/* No detailed data message */}
      {(!match.sets || match.sets.length === 0) && (
        <Card>
          <CardContent className="text-center py-8">
            <div className="space-y-4">
              <p className="text-gray-500">
                No detailed match data available. Detailed analysis is extracted from official scoresheets.
              </p>
              {match.scoresheetPdfUrl && (
                <div className="space-y-2">
                  <p className="text-sm text-gray-400">
                    PDF scoresheet available but not yet processed.
                  </p>
                  <Button 
                    onClick={() => processPdfMutation.mutate()}
                    disabled={processPdfMutation.isPending}
                    size="sm"
                    variant="outline"
                  >
                    {processPdfMutation.isPending ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Processing PDF...
                      </>
                    ) : (
                      <>
                        <FileText className="h-4 w-4 mr-2" />
                        Extract Analytics from PDF
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}