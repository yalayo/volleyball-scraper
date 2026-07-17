import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import DataTable from "@/components/ui/data-table";
import { Trophy, ExternalLink, Users as UsersIcon } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { League, Team, Player, Match } from "@shared/schema";

type TeamWithLeague = Team & { league?: League };

interface LeagueDetailModalProps {
  open: boolean;
  onClose: () => void;
  league: League | null;
  teams: TeamWithLeague[];
  players: Player[];
  matches: Match[];
  onViewTeam: (team: TeamWithLeague) => void;
}

export default function LeagueDetailModal({
  open, onClose, league, teams, players, matches, onViewTeam,
}: LeagueDetailModalProps) {
  if (!league) return null;

  const leagueTeams = teams.filter((t) => t.leagueId === league.id);
  const leagueMatches = matches.filter((m) => m.leagueId === league.id);
  const completedMatches = leagueMatches.filter((m) => m.status === "completed").length;

  const columns = [
    {
      key: "name",
      header: "Team Name",
      render: (team: TeamWithLeague) => (
        <button
          className="flex items-center gap-2 text-left"
          onClick={() => onViewTeam(team)}
        >
          {team.logoUrl && (
            <img src={team.logoUrl} alt={`${team.name} logo`} className="w-6 h-6 rounded shrink-0" />
          )}
          <span className="font-medium text-blue-600 hover:text-blue-800 hover:underline whitespace-nowrap">
            {team.name}
          </span>
        </button>
      ),
    },
    {
      key: "players",
      header: "Players",
      render: (team: TeamWithLeague) => {
        const count = players.filter((p) => p.teamId === team.id).length;
        return count > 0 ? (
          <Badge variant="secondary">{count}</Badge>
        ) : (
          <span className="text-gray-400">0</span>
        );
      },
    },
    {
      key: "games",
      header: "Games",
      render: (team: TeamWithLeague) => {
        const count = matches.filter((m) => m.homeTeamId === team.id || m.awayTeamId === team.id).length;
        return count > 0 ? (
          <Badge variant="secondary">{count}</Badge>
        ) : (
          <span className="text-gray-400">0</span>
        );
      },
    },
    {
      key: "homepage",
      header: "Homepage",
      className: "hidden sm:table-cell",
      render: (team: Team) =>
        team.homepage ? (
          <a
            href={team.homepage}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-blue-600 hover:text-blue-800"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        ) : (
          <span className="text-gray-400">-</span>
        ),
      searchable: false,
    },
  ];

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 shrink-0" />
            <span>{league.name}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2 -mt-2">
          <Badge variant="outline">{league.category || "Unknown"}</Badge>
          {league.seriesId && (
            <code className="text-xs bg-gray-100 px-2 py-1 rounded">Series {league.seriesId}</code>
          )}
          {league.url && (
            <a
              href={league.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-sm"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Source
            </a>
          )}
          {league.updatedAt && (
            <span className="text-xs text-gray-500">
              Updated {formatDistanceToNow(new Date(league.updatedAt), { addSuffix: true })}
            </span>
          )}
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="bg-gray-50 p-3 rounded-lg text-center">
            <div className="text-2xl font-bold text-gray-900">{leagueTeams.length}</div>
            <div className="text-xs text-gray-600 flex items-center justify-center gap-1">
              <UsersIcon className="w-3 h-3" />
              Teams
            </div>
          </div>
          <div className="bg-blue-50 p-3 rounded-lg text-center">
            <div className="text-2xl font-bold text-blue-600">{leagueMatches.length}</div>
            <div className="text-xs text-blue-800">Games</div>
          </div>
          <div className="bg-green-50 p-3 rounded-lg text-center">
            <div className="text-2xl font-bold text-green-600">{completedMatches}</div>
            <div className="text-xs text-green-800">Completed</div>
          </div>
        </div>

        <DataTable
          data={leagueTeams}
          columns={columns}
          searchPlaceholder="Search teams..."
        />
      </DialogContent>
    </Dialog>
  );
}
