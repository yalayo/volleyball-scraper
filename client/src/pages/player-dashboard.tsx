import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Calendar, 
  Users, 
  Trophy, 
  Clock, 
  MapPin, 
  UserPlus, 
  LogOut,
  AlertCircle,
  CheckCircle,
  Volleyball
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";

interface Player {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  samsPlayerId: string;
  verificationStatus: string;
}

interface Match {
  id: number;
  homeTeam: { name: string; id: number };
  awayTeam: { name: string; id: number };
  homeScore: number | null;
  awayScore: number | null;
  matchDate: string;
  location: string | null;
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
  const [, setLocation] = useLocation();
  const [player, setPlayer] = useState<Player | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const storedPlayer = localStorage.getItem('playerSession');
    if (storedPlayer) {
      setPlayer(JSON.parse(storedPlayer));
    } else {
      setLocation('/player-login');
    }
  }, [setLocation]);

  // Fetch player's team matches
  const { data: matches = [], isLoading: matchesLoading } = useQuery({
    queryKey: ['/api/player-dashboard/matches', player?.samsPlayerId],
    enabled: !!player?.samsPlayerId,
  });

  // Fetch training sessions
  const { data: trainingSessions = [], isLoading: sessionsLoading } = useQuery({
    queryKey: ['/api/player-dashboard/training-sessions', player?.samsPlayerId],
    enabled: !!player?.samsPlayerId,
  });

  // Join training session mutation
  const joinSessionMutation = useMutation({
    mutationFn: async (sessionId: number) => {
      const response = await fetch('/api/player-dashboard/join-training', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          sessionId, 
          playerId: player?.id 
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to join session');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['/api/player-dashboard/training-sessions'] 
      });
    }
  });

  const handleLogout = () => {
    localStorage.removeItem('playerSession');
    setLocation('/player-login');
  };

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
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Welcome back, {player.firstName}!
            </h1>
            <p className="text-gray-600">
              Player ID: {player.samsPlayerId} • Status: {' '}
              <Badge variant={player.verificationStatus === 'verified' ? 'default' : 'secondary'}>
                {player.verificationStatus}
              </Badge>
            </p>
          </div>
          <Button onClick={handleLogout} variant="outline">
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>

        {/* Verification Status Alert */}
        {player.verificationStatus === 'pending' && (
          <Alert className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Your account is pending verification. Contact your teammates or team management to verify your identity.
            </AlertDescription>
          </Alert>
        )}

        {player.verificationStatus === 'verified' && (
          <Alert className="mb-6 border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Your account is verified! You have full access to team features and training sessions.
            </AlertDescription>
          </Alert>
        )}

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
                    {matches.map((match: Match) => (
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
                    {trainingSessions.map((session: TrainingSession) => (
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
    </div>
  );
}