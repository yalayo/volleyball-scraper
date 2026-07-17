import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UserIcon, Users, Trophy } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { Player, Team, League } from "@shared/schema";

type TeamWithLeague = Team & { league?: League };

interface PlayerDetailModalProps {
  open: boolean;
  onClose: () => void;
  player: (Player & { team?: Partial<Team> }) | null;
  teams: TeamWithLeague[];
  onViewTeam: (team: TeamWithLeague) => void;
}

export default function PlayerDetailModal({ open, onClose, player, teams, onViewTeam }: PlayerDetailModalProps) {
  if (!player) return null;

  // The player row carries only {id, name} for its team; resolve the full
  // team (with league, logo, homepage) from the already-loaded teams list.
  const fullTeam = teams.find((t) => t.id === player.teamId);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 bg-purple-100 text-purple-800 rounded-full shrink-0">
              <UserIcon className="w-5 h-5" />
            </div>
            <span>{player.name}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            {player.jerseyNumber && (
              <div className="flex items-center justify-center w-10 h-10 bg-blue-100 text-blue-800 rounded-full text-lg font-bold">
                {player.jerseyNumber}
              </div>
            )}
            {player.position && (
              <Badge variant="outline">{player.position}</Badge>
            )}
            {player.nationality && (
              <Badge variant="secondary">{player.nationality}</Badge>
            )}
          </div>

          <div className="border rounded-lg p-3">
            <div className="text-xs text-gray-500 mb-1">Team</div>
            {fullTeam ? (
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => onViewTeam(fullTeam)}
              >
                {fullTeam.logoUrl && (
                  <img src={fullTeam.logoUrl} alt="" className="w-5 h-5 rounded mr-2" />
                )}
                <Users className="w-4 h-4 mr-2 shrink-0" />
                {fullTeam.name}
              </Button>
            ) : player.team?.name ? (
              <div className="text-sm text-gray-700">{player.team.name}</div>
            ) : (
              <div className="text-sm text-gray-400">Unassigned</div>
            )}
          </div>

          {fullTeam?.league && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Trophy className="w-4 h-4 shrink-0" />
              {fullTeam.league.name}
            </div>
          )}

          {player.playerId && (
            <div className="text-xs text-gray-500">
              Player ID: <code className="bg-gray-100 px-2 py-1 rounded">{player.playerId}</code>
            </div>
          )}

          {player.updatedAt && (
            <div className="text-xs text-gray-500">
              Updated {formatDistanceToNow(new Date(player.updatedAt), { addSuffix: true })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
