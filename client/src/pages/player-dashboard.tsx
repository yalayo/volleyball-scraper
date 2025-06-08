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
  AlertCircle,
  Mail,
  Sun,
  Plus
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import VerificationGate from "./verification-gate";

// Training Invitations Component
function TrainingInvitationsTab({ playerAccountId }: { playerAccountId: number }) {
  const queryClient = useQueryClient();
  
  const { data: invitations, isLoading } = useQuery({
    queryKey: ["/api/training-invitations", playerAccountId],
    retry: false,
  });

  const acceptInvitationMutation = useMutation({
    mutationFn: async (invitationId: number) => {
      return await apiRequest(`/api/training-invitations/${invitationId}/accept`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/training-invitations"] });
    },
  });

  const declineInvitationMutation = useMutation({
    mutationFn: async (invitationId: number) => {
      return await apiRequest(`/api/training-invitations/${invitationId}/decline`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/training-invitations"] });
    },
  });

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-2 text-gray-600">Loading invitations...</p>
      </div>
    );
  }

  if (!invitations || invitations.length === 0) {
    return (
      <div className="text-center py-8">
        <Mail className="mx-auto h-12 w-12 text-gray-400" />
        <p className="mt-2 text-gray-600">No training invitations</p>
        <p className="text-sm text-gray-500">Check back later for training opportunities!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {invitations.map((invitation: any) => (
        <div key={invitation.id} className="border rounded-lg p-4">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <h3 className="font-semibold text-lg">{invitation.session.title}</h3>
              <p className="text-gray-600 mb-2">{invitation.session.description}</p>
              <div className="space-y-1 text-sm text-gray-600">
                <div className="flex items-center">
                  <Calendar className="mr-1 h-4 w-4" />
                  {new Date(invitation.session.sessionDate).toLocaleDateString()}
                </div>
                <div className="flex items-center">
                  <MapPin className="mr-1 h-4 w-4" />
                  {invitation.session.location}
                </div>
                <div className="flex items-center">
                  <Users className="mr-1 h-4 w-4" />
                  Invited by {invitation.inviterName}
                </div>
              </div>
            </div>
            <div className="ml-4 space-x-2">
              {invitation.status === 'pending' ? (
                <>
                  <Button
                    onClick={() => acceptInvitationMutation.mutate(invitation.id)}
                    disabled={acceptInvitationMutation.isPending}
                    size="sm"
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {acceptInvitationMutation.isPending ? 'Accepting...' : 'Accept'}
                  </Button>
                  <Button
                    onClick={() => declineInvitationMutation.mutate(invitation.id)}
                    disabled={declineInvitationMutation.isPending}
                    size="sm"
                    variant="outline"
                  >
                    {declineInvitationMutation.isPending ? 'Declining...' : 'Decline'}
                  </Button>
                </>
              ) : (
                <Badge variant={invitation.status === 'accepted' ? 'default' : 'secondary'}>
                  {invitation.status}
                </Badge>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Summer League Management Component
function SummerLeagueManagementTab({ playerAccountId }: { playerAccountId: number }) {
  const [showCreateLeague, setShowCreateLeague] = useState(false);
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const queryClient = useQueryClient();

  const { data: summerLeagues, isLoading } = useQuery({
    queryKey: ["/api/summer-leagues"],
    retry: false,
  });

  const { data: myTeams } = useQuery({
    queryKey: ["/api/summer-teams/my-teams", playerAccountId],
    retry: false,
  });

  const createLeagueMutation = useMutation({
    mutationFn: async (leagueData: any) => {
      return await apiRequest("/api/summer-leagues", {
        method: "POST",
        body: JSON.stringify(leagueData),
        headers: { "Content-Type": "application/json" },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/summer-leagues"] });
      setShowCreateLeague(false);
    },
  });

  const createTeamMutation = useMutation({
    mutationFn: async (teamData: any) => {
      return await apiRequest("/api/summer-teams", {
        method: "POST",
        body: JSON.stringify(teamData),
        headers: { "Content-Type": "application/json" },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/summer-teams"] });
      setShowCreateTeam(false);
    },
  });

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-2 text-gray-600">Loading summer leagues...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Action Buttons */}
      <div className="flex space-x-4">
        <Button 
          onClick={() => setShowCreateLeague(true)}
          className="flex items-center"
        >
          <Plus className="mr-2 h-4 w-4" />
          Create Summer League
        </Button>
        <Button 
          onClick={() => setShowCreateTeam(true)}
          variant="outline"
          className="flex items-center"
        >
          <Plus className="mr-2 h-4 w-4" />
          Create Team
        </Button>
      </div>

      {/* My Teams */}
      {myTeams && myTeams.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3">My Teams</h3>
          <div className="grid gap-4">
            {myTeams.map((team: any) => (
              <div key={team.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-medium">{team.name}</h4>
                    <p className="text-sm text-gray-600">{team.league?.name}</p>
                    <p className="text-sm text-gray-500">{team.playerCount} players</p>
                  </div>
                  <Badge variant={team.status === 'active' ? 'default' : 'secondary'}>
                    {team.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Available Summer Leagues */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Available Summer Leagues</h3>
        {!summerLeagues || summerLeagues.length === 0 ? (
          <div className="text-center py-8">
            <Sun className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-2 text-gray-600">No summer leagues available</p>
            <p className="text-sm text-gray-500">Create the first summer league!</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {summerLeagues.map((league: any) => (
              <div key={league.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-medium">{league.name}</h4>
                    <p className="text-sm text-gray-600">{league.description}</p>
                    <p className="text-sm text-gray-500">
                      Season: {league.season} • {league.teamCount || 0} teams
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge variant={league.registrationOpen ? 'default' : 'secondary'}>
                      {league.registrationOpen ? 'Open' : 'Closed'}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create League Modal */}
      {showCreateLeague && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Create Summer League</h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target as HTMLFormElement);
              createLeagueMutation.mutate({
                name: formData.get('name'),
                season: formData.get('season'),
                description: formData.get('description'),
                location: formData.get('location'),
                creatorId: playerAccountId,
                registrationOpen: true,
                maxTeams: parseInt(formData.get('maxTeams') as string) || 8,
              });
            }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">League Name</label>
                  <input
                    name="name"
                    type="text"
                    required
                    className="w-full border rounded-md px-3 py-2"
                    placeholder="Summer Volleyball League 2024"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Season</label>
                  <input
                    name="season"
                    type="text"
                    required
                    className="w-full border rounded-md px-3 py-2"
                    placeholder="Summer 2024"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <textarea
                    name="description"
                    className="w-full border rounded-md px-3 py-2"
                    rows={3}
                    placeholder="Competitive summer volleyball league..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Location</label>
                  <input
                    name="location"
                    type="text"
                    className="w-full border rounded-md px-3 py-2"
                    placeholder="Sports Complex"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Max Teams</label>
                  <input
                    name="maxTeams"
                    type="number"
                    min="4"
                    max="16"
                    defaultValue="8"
                    className="w-full border rounded-md px-3 py-2"
                  />
                </div>
              </div>
              <div className="flex space-x-3 mt-6">
                <Button
                  type="submit"
                  disabled={createLeagueMutation.isPending}
                  className="flex-1"
                >
                  {createLeagueMutation.isPending ? 'Creating...' : 'Create League'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateLeague(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Team Modal */}
      {showCreateTeam && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Create Summer Team</h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target as HTMLFormElement);
              createTeamMutation.mutate({
                name: formData.get('name'),
                leagueId: parseInt(formData.get('leagueId') as string),
                description: formData.get('description'),
                captainId: playerAccountId,
              });
            }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Team Name</label>
                  <input
                    name="name"
                    type="text"
                    required
                    className="w-full border rounded-md px-3 py-2"
                    placeholder="Thunder Strikers"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">League</label>
                  <select
                    name="leagueId"
                    required
                    className="w-full border rounded-md px-3 py-2"
                  >
                    <option value="">Select a league</option>
                    {summerLeagues && summerLeagues
                      .filter((league: any) => league.registrationOpen)
                      .map((league: any) => (
                        <option key={league.id} value={league.id}>
                          {league.name}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <textarea
                    name="description"
                    className="w-full border rounded-md px-3 py-2"
                    rows={3}
                    placeholder="Competitive team looking for skilled players..."
                  />
                </div>
              </div>
              <div className="flex space-x-3 mt-6">
                <Button
                  type="submit"
                  disabled={createTeamMutation.isPending}
                  className="flex-1"
                >
                  {createTeamMutation.isPending ? 'Creating...' : 'Create Team'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateTeam(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

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
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="matches">Team Matches</TabsTrigger>
                <TabsTrigger value="training">Training Sessions</TabsTrigger>
                <TabsTrigger value="teammates">Teammates</TabsTrigger>
                <TabsTrigger value="invitations">Training Invitations</TabsTrigger>
                <TabsTrigger value="summer">Summer Leagues</TabsTrigger>
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

              {/* Training Invitations */}
              <TabsContent value="invitations">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Mail className="mr-2 h-5 w-5" />
                      Training Invitations
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <TrainingInvitationsTab playerAccountId={player.id} />
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Summer Leagues */}
              <TabsContent value="summer">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Sun className="mr-2 h-5 w-5" />
                      Summer Leagues & Teams
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <SummerLeagueManagementTab playerAccountId={player.id} />
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