import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Player } from "@shared/schema";
import DataTable from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";

interface TeamPlayersModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamId: number;
  teamName: string;
}

export default function TeamPlayersModal({ open, onOpenChange, teamId, teamName }: TeamPlayersModalProps) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!open || teamId <= 0) return;
    setIsLoading(true);
    fetch(`/api/teams/${teamId}/players`)
      .then((r) => r.json())
      .then((data) => setPlayers(Array.isArray(data) ? data : []))
      .catch(() => setPlayers([]))
      .finally(() => setIsLoading(false));
  }, [open, teamId]);

  const columns = [
    {
      key: "name",
      header: "Player Name",
      render: (player: Player) => (
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
      key: "nationality",
      header: "Nationality",
      render: (player: Player) =>
        player.nationality ? (
          <Badge variant="secondary">{player.nationality}</Badge>
        ) : (
          <span className="text-gray-400">-</span>
        ),
    },
    {
      key: "position",
      header: "Position",
      render: (player: Player) =>
        player.position ? (
          <Badge variant="outline">{player.position}</Badge>
        ) : (
          <span className="text-gray-400">-</span>
        ),
    },
    {
      key: "playerId",
      header: "Player ID",
      render: (player: Player) =>
        player.playerId ? (
          <code className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
            {player.playerId}
          </code>
        ) : (
          <span className="text-gray-400">-</span>
        ),
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {teamName} Players ({players.length})
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-auto">
          <DataTable
            data={players}
            columns={columns}
            loading={isLoading}
            searchPlaceholder="Search players..."
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
