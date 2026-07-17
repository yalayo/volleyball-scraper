import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import DataTable from "@/components/ui/data-table";
import { Eye, Trophy, Users, ExternalLink, Calendar } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { Team, Player, Match, League } from "@shared/schema";

type TeamWithLeague = Team & { league?: League };

interface TeamDetailModalProps {
  open: boolean;
  onClose: () => void;
  team: TeamWithLeague | null;
  initialTab?: "roster" | "matches";
  teams: TeamWithLeague[];
  onViewMatch: (match: Match) => void;
  onViewLeague?: (league: League) => void;
  onViewTeam?: (team: TeamWithLeague) => void;
  onViewPlayer?: (player: Player & { team?: Team }) => void;
}

export default function TeamDetailModal({
  open, onClose, team, initialTab = "roster", teams,
  onViewMatch, onViewLeague, onViewTeam, onViewPlayer,
}: TeamDetailModalProps) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [playersLoading, setPlayersLoading] = useState(false);
  const [matchesLoading, setMatchesLoading] = useState(false);

  useEffect(() => {
    if (!open || !team) return;
    setPlayersLoading(true);
    fetch(`/api/teams/${team.id}/players`)
      .then((r) => r.json())
      .then((data) => setPlayers(Array.isArray(data) ? data : []))
      .catch(() => setPlayers([]))
      .finally(() => setPlayersLoading(false));

    setMatchesLoading(true);
    fetch(`/api/teams/${team.id}/matches`)
      .then((r) => r.json())
      .then((data) => setMatches(Array.isArray(data) ? data : []))
      .catch(() => setMatches([]))
      .finally(() => setMatchesLoading(false));
  }, [open, team?.id]);

  if (!team) return null;

  // Resolves an opponent's name (from the match) to a full team object, so
  // clicking it can drill into that team's own detail modal.
  const findOpponentTeam = (match: Match, isHome: boolean): TeamWithLeague | undefined => {
    const opponentId = isHome ? match.awayTeamId : match.homeTeamId;
    const opponentName = isHome ? match.awayTeamName : match.homeTeamName;
    return teams.find((t) => t.id === opponentId) ?? teams.find((t) => t.name === opponentName);
  };

  const wins = matches.filter((match) => {
    const isHome = match.homeTeamName === team.name;
    const teamSets = isHome ? (match.homeSets || 0) : (match.awaySets || 0);
    const opponentSets = isHome ? (match.awaySets || 0) : (match.homeSets || 0);
    return teamSets > opponentSets;
  }).length;
  const played = matches.filter((m) => m.status === "completed").length;
  const losses = played - wins;

  const playerColumns = [
    {
      key: "name",
      header: "Player Name",
      render: (player: Player) =>
        onViewPlayer ? (
          <button
            className="font-medium text-blue-600 hover:text-blue-800 hover:underline text-left"
            onClick={() => onViewPlayer({ ...player, team })}
          >
            {player.name}
          </button>
        ) : (
          <div className="font-medium">{player.name}</div>
        ),
    },
    {
      key: "jerseyNumber",
      header: "Jersey #",
      render: (player: Player) =>
        player.jerseyNumber ? (
          <Badge variant="secondary" className="w-8 h-8 rounded-full flex items-center justify-center">
            {player.jerseyNumber}
          </Badge>
        ) : (
          <span className="text-gray-400">-</span>
        ),
    },
    {
      key: "position",
      header: "Position",
      render: (player: Player) =>
        player.position ? <Badge variant="outline">{player.position}</Badge> : <span className="text-gray-400">-</span>,
    },
    {
      key: "nationality",
      header: "Nationality",
      className: "hidden sm:table-cell",
      render: (player: Player) =>
        player.nationality ? <Badge variant="secondary">{player.nationality}</Badge> : <span className="text-gray-400">-</span>,
    },
  ];

  const matchColumns = [
    {
      key: "opponent",
      header: "Opponent",
      render: (match: Match) => {
        const isHome = match.homeTeamName === team.name;
        const opponentName = isHome ? match.awayTeamName : match.homeTeamName;
        const opponent = findOpponentTeam(match, isHome);
        return opponent && onViewTeam ? (
          <button
            className="font-medium text-blue-600 hover:text-blue-800 hover:underline text-left"
            onClick={() => onViewTeam(opponent)}
          >
            {opponentName}
          </button>
        ) : (
          <div className="font-medium">{opponentName}</div>
        );
      },
    },
    {
      key: "venue",
      header: "Venue",
      render: (match: Match) => (
        <Badge variant={match.homeTeamName === team.name ? "default" : "secondary"}>
          {match.homeTeamName === team.name ? "Home" : "Away"}
        </Badge>
      ),
    },
    {
      key: "result",
      header: "Result",
      render: (match: Match) => {
        if (match.status !== "completed") {
          return <Badge variant="outline">Scheduled</Badge>;
        }
        const isHome = match.homeTeamName === team.name;
        const teamSets = isHome ? (match.homeSets || 0) : (match.awaySets || 0);
        const opponentSets = isHome ? (match.awaySets || 0) : (match.homeSets || 0);
        const won = teamSets > opponentSets;
        return (
          <div className="space-y-1 whitespace-nowrap">
            <div className={`font-bold ${won ? "text-green-600" : "text-red-600"}`}>
              {teamSets} : {opponentSets}
            </div>
            <Badge variant={won ? "default" : "destructive"} className="text-xs">{won ? "W" : "L"}</Badge>
          </div>
        );
      },
    },
    {
      key: "date",
      header: "Date",
      className: "hidden sm:table-cell",
      render: (match: Match) => (
        <div className="text-sm text-gray-600 flex items-center gap-1 whitespace-nowrap">
          <Calendar className="w-3 h-3 shrink-0" />
          <span>
            {match.matchDate || match.createdAt
              ? formatDistanceToNow(new Date(match.matchDate || match.createdAt!), { addSuffix: true })
              : "Unknown"}
          </span>
        </div>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (match: Match) => (
        <Button variant="outline" size="sm" onClick={() => onViewMatch(match)}>
          <Eye className="w-4 h-4 mr-1" />
          Details
        </Button>
      ),
      searchable: false,
    },
  ];

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            {team.logoUrl && (
              <img src={team.logoUrl} alt={`${team.name} logo`} className="w-10 h-10 rounded shrink-0" />
            )}
            <span>{team.name}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2 -mt-2">
          {team.league && (
            <button
              onClick={() => onViewLeague?.(team.league!)}
              disabled={!onViewLeague}
              className="disabled:cursor-default"
            >
              <Badge variant="outline" className="hover:bg-gray-100">
                <Trophy className="w-3 h-3 mr-1" />
                {team.league.name}
              </Badge>
            </button>
          )}
          {team.teamId && (
            <code className="text-xs bg-gray-100 px-2 py-1 rounded">{team.teamId}</code>
          )}
          {team.homepage && (
            <a
              href={team.homepage}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-sm"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Homepage
            </a>
          )}
        </div>

        <div className="grid grid-cols-4 gap-3">
          <div className="bg-gray-50 p-3 rounded-lg text-center">
            <div className="text-2xl font-bold text-gray-900">{players.length}</div>
            <div className="text-xs text-gray-600">Players</div>
          </div>
          <div className="bg-blue-50 p-3 rounded-lg text-center">
            <div className="text-2xl font-bold text-blue-600">{matches.length}</div>
            <div className="text-xs text-blue-800">Games</div>
          </div>
          <div className="bg-green-50 p-3 rounded-lg text-center">
            <div className="text-2xl font-bold text-green-600">{wins}</div>
            <div className="text-xs text-green-800">Wins</div>
          </div>
          <div className="bg-red-50 p-3 rounded-lg text-center">
            <div className="text-2xl font-bold text-red-600">{losses}</div>
            <div className="text-xs text-red-800">Losses</div>
          </div>
        </div>

        <Tabs defaultValue={initialTab} className="w-full">
          <TabsList>
            <TabsTrigger value="roster">
              <Users className="w-4 h-4 mr-1.5" />
              Roster
            </TabsTrigger>
            <TabsTrigger value="matches">
              <Trophy className="w-4 h-4 mr-1.5" />
              Matches
            </TabsTrigger>
          </TabsList>
          <TabsContent value="roster">
            <DataTable
              data={players}
              columns={playerColumns}
              loading={playersLoading}
              searchPlaceholder="Search roster..."
            />
          </TabsContent>
          <TabsContent value="matches">
            <DataTable
              data={matches}
              columns={matchColumns}
              loading={matchesLoading}
              searchPlaceholder="Search matches..."
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
