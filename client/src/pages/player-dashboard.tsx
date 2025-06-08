import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Volleyball, 
  Trophy, 
  Users, 
  Calendar, 
  MapPin, 
  Clock, 
  UserPlus,
  LogOut,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import VerificationGate from "./verification-gate";

interface PlayerAccount {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  samsPlayerId: string;
  verificationStatus: string;
}

interface Match {
  id: number;
  matchDate: string;
  homeTeam: { name: string };
  awayTeam: { name: string };
  homeScore: number | null;
  awayScore: number | null;
  location?: string;
  status: string;
}

interface TrainingSession {
  id: number;
  title: string;
  description: string;
  sessionDate: string;
  location: string;
  organizer: string;
  participants: string[];
  maxParticipants: number;
  isJoined: boolean;
}

export default function PlayerDashboard() {
  const [player, setPlayer] = useState<PlayerAccount | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const sessionData = localStorage.getItem('playerSession');
    if (sessionData) {
      setPlayer(JSON.parse(sessionData));
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('playerSession');
    window.location.href = '/player-login';
  };

  // Fetch matches for the player's team
  const { data: matches = [], isLoading: matchesLoading } = useQuery({
    queryKey: ['/api/player-dashboard/matches', player?.samsPlayerId],
    enabled: !!player?.samsPlayerId && player.verificationStatus === 'verified'
  });

  // Fetch training sessions for the player's team
  const { data: trainingSessions = [], isLoading: sessionsLoading } = useQuery({
    queryKey: ['/api/player-dashboard/training-sessions', player?.samsPlayerId],
    enabled: !!player?.samsPlayerId && player.verificationStatus === 'verified'
  });

  // Join training session mutation
  const joinSessionMutation = useMutation({
    mutationFn: async (sessionId: number) => {
      return await apiRequest(`/api/player-dashboard/join-training`, {
        method: 'POST',
        body: JSON.stringify({
          sessionId,
          playerAccountId: player?.id
        })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['/api/player-dashboard/training-sessions', player?.samsPlayerId] 
      });
    }
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!player) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading player data...</p>
        </div>
      </div>
    );
  }

  // Show verification gate if player is not verified
  if (player.verificationStatus !== 'verified') {
    return (
      <VerificationGate 
        playerAccount={player} 
        onVerified={() => window.location.reload()} 
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Volleyball className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Player Dashboard
                </h1>
                <p className="text-gray-600">
                  Welcome back, {player.firstName} {player.lastName}
                </p>
              </div>
            </div>
            <Button onClick={handleLogout} variant="outline" size="sm">
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {player.verificationStatus === 'verified' && (
          <Alert className="mb-6">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Your account is verified! You have full access to team features and training sessions.
            </AlertDescription>
          </Alert>
        )}

        {player.verificationStatus !== 'verified' ? (
          // Show verification pending message for unverified players
          <Card className="border-2 border-yellow-200 bg-yellow-50">
            <CardHeader>
              <CardTitle className="flex items-center text-yellow-800">
                <Clock className="mr-2 h-5 w-5" />
                Account Verification Pending
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-yellow-700">
                <p className="mb-4">
                  Your player account is currently pending verification. To access team features, you need to be validated by:
                </p>
                <ul className="list-disc list-inside space-y-2 mb-4">
                  <li>Three or more teammates who are already verified</li>
                  <li>Your team trainer or coach</li>
                  <li>A system administrator</li>
                </ul>
                <p className="text-sm">
                  Once verified, you'll have full access to view your team's matches, organize training sessions, 
                  and connect with teammates. Please contact your team members or coach to complete the verification process.
                </p>
              </div>
              
              <div className="mt-6 p-4 bg-white rounded-lg border">
                <h4 className="font-medium text-gray-900 mb-2">Your Player Information:</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Name:</span>
                    <span className="ml-2 font-medium">{player.firstName} {player.lastName}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">SAMS Player ID:</span>
                    <span className="ml-2 font-medium">{player.samsPlayerId}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Email:</span>
                    <span className="ml-2 font-medium">{player.email}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Status:</span>
                    <Badge variant="secondary" className="ml-2">{player.verificationStatus}</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          // Show full team features for verified players
          <div className="space-y-6">
            {/* Team Information */}
            <Card className="border-2 border-green-200 bg-green-50">
              <CardHeader>
                <CardTitle className="flex items-center text-green-800">
                  <Trophy className="mr-2 h-5 w-5" />
                  Your Team Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Player:</span>
                    <span className="ml-2 font-medium">{player.firstName} {player.lastName}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">SAMS ID:</span>
                    <span className="ml-2 font-medium">{player.samsPlayerId}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Status:</span>
                    <Badge variant="default" className="ml-2">Verified Player</Badge>
                  </div>
                  <div>
                    <span className="text-gray-600">Team Access:</span>
                    <span className="ml-2 text-green-700 font-medium">Full Access</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Tabs defaultValue="matches" className="space-y-6">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="matches">Team Matches</TabsTrigger>
                <TabsTrigger value="training">Training Sessions</TabsTrigger>
                <TabsTrigger value="teammates">Teammates</TabsTrigger>
              </TabsList>

              {/* Team Matches */}
              <TabsContent value="matches">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Trophy className="mr-2 h-5 w-5" />
                      Your Team's Matches
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {matchesLoading ? (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                        <p className="mt-2 text-gray-600">Loading matches...</p>
                      </div>
                    ) : matches.length === 0 ? (
                      <div className="text-center py-8">
                        <Volleyball className="mx-auto h-12 w-12 text-gray-400" />
                        <p className="mt-2 text-gray-600">No matches found for your team</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {(matches as Match[]).map((match: Match) => (
                          <div key={match.id} className="border rounded-lg p-4 hover:bg-gray-50">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="flex items-center space-x-4">
                                  <div className="text-center">
                                    <p className="font-medium">{match.homeTeam.name}</p>
                                    <p className="text-2xl font-bold">
                                      {match.homeScore !== null ? match.homeScore : '-'}
                                    </p>
                                  </div>
                                  <div className="text-gray-500">vs</div>
                                  <div className="text-center">
                                    <p className="font-medium">{match.awayTeam.name}</p>
                                    <p className="text-2xl font-bold">
                                      {match.awayScore !== null ? match.awayScore : '-'}
                                    </p>
                                  </div>
                                </div>
                              </div>
                              <div className="text-right text-sm text-gray-600">
                                <div className="flex items-center mb-1">
                                  <Calendar className="mr-1 h-4 w-4" />
                                  {formatDate(match.matchDate)}
                                </div>
                                {match.location && (
                                  <div className="flex items-center">
                                    <MapPin className="mr-1 h-4 w-4" />
                                    {match.location}
                                  </div>
                                )}
                                <Badge 
                                  variant={match.status === 'completed' ? 'default' : 'secondary'}
                                  className="mt-2"
                                >
                                  {match.status}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Training Sessions */}
              <TabsContent value="training">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Users className="mr-2 h-5 w-5" />
                      Training Sessions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {sessionsLoading ? (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                        <p className="mt-2 text-gray-600">Loading training sessions...</p>
                      </div>
                    ) : trainingSessions.length === 0 ? (
                      <div className="text-center py-8">
                        <Users className="mx-auto h-12 w-12 text-gray-400" />
                        <p className="mt-2 text-gray-600">No training sessions scheduled</p>
                        <p className="text-sm text-gray-500">Check back later or organize your own session!</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {(trainingSessions as TrainingSession[]).map((session: TrainingSession) => (
                          <div key={session.id} className="border rounded-lg p-4">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <h3 className="font-semibold text-lg">{session.title}</h3>
                                <p className="text-gray-600 mb-2">{session.description}</p>
                                <div className="space-y-1 text-sm text-gray-600">
                                  <div className="flex items-center">
                                    <Clock className="mr-1 h-4 w-4" />
                                    {formatDate(session.sessionDate)}
                                  </div>
                                  <div className="flex items-center">
                                    <MapPin className="mr-1 h-4 w-4" />
                                    {session.location}
                                  </div>
                                  <div className="flex items-center">
                                    <Users className="mr-1 h-4 w-4" />
                                    Organized by {session.organizer}
                                  </div>
                                  <div className="flex items-center">
                                    <UserPlus className="mr-1 h-4 w-4" />
                                    {session.participants.length} / {session.maxParticipants} participants
                                  </div>
                                </div>
                              </div>
                              <div className="ml-4">
                                {session.isJoined ? (
                                  <Badge variant="default">Joined</Badge>
                                ) : (
                                  <Button
                                    onClick={() => joinSessionMutation.mutate(session.id)}
                                    disabled={
                                      joinSessionMutation.isPending ||
                                      session.participants.length >= session.maxParticipants ||
                                      player.verificationStatus !== 'verified'
                                    }
                                    size="sm"
                                  >
                                    {joinSessionMutation.isPending ? 'Joining...' : 'Join Session'}
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Teammates */}
              <TabsContent value="teammates">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Users className="mr-2 h-5 w-5" />
                      Your Teammates
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8">
                      <Users className="mx-auto h-12 w-12 text-gray-400" />
                      <p className="mt-2 text-gray-600">Teammate directory coming soon</p>
                      <p className="text-sm text-gray-500">Connect with your team members and organize training sessions</p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
    </div>
  );
}