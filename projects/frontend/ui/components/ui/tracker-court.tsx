import React from "react";
import { cn } from "@/lib/utils";
import type { TrackerPlayer, TrackerPosition, TrackerTeam } from "@/hooks/use-game-tracker";

// One tap-friendly court for every tracker interaction (adapted from the
// court-visualization/mini-court pair in github.com/yalayo/volleyball-stats).
// Team A defends the left half, Team B the right; front rows meet at the net.

interface TrackerCourtProps {
  getPlayerAt?: (position: TrackerPosition) => TrackerPlayer | undefined;
  selectedPosition?: string | null;
  blockPositions?: string[];
  disabledTeam?: TrackerTeam | null;
  servingTeam?: TrackerTeam | null;
  onTap: (position: TrackerPosition) => void;
  title?: string;
  hint?: string;
  compact?: boolean;
}

// Column order left→right: A back row (5,6,1), A front row (4,3,2) | net |
// B front row (2,3,4), B back row (1,6,5).
const columns: { team: TrackerTeam; positions: number[] }[] = [
  { team: "A", positions: [5, 6, 1] },
  { team: "A", positions: [4, 3, 2] },
  { team: "B", positions: [2, 3, 4] },
  { team: "B", positions: [1, 6, 5] },
];

export function TrackerCourt({
  getPlayerAt,
  selectedPosition,
  blockPositions = [],
  disabledTeam,
  servingTeam,
  onTap,
  title,
  hint,
  compact = false,
}: TrackerCourtProps) {
  return (
    <div>
      {title && <div className="text-xs font-medium text-gray-600 mb-1.5">{title}</div>}
      <div
        className={cn(
          "relative rounded-lg overflow-hidden bg-orange-50 border-2 border-orange-300 grid grid-cols-4 gap-1 p-1",
          compact ? "min-h-[130px]" : "min-h-[180px]"
        )}
      >
        {/* Net */}
        <div className="absolute top-0 bottom-0 left-1/2 w-1 bg-gray-700 -translate-x-1/2 z-10 rounded" />

        {columns.map((col, colIdx) => (
          <div key={colIdx} className="grid grid-rows-3 gap-1">
            {col.positions.map((posNumber) => {
              const id = `${col.team}${posNumber}`;
              const player = getPlayerAt?.(id);
              const isSelected = selectedPosition === id;
              const isBlockSelected = blockPositions.includes(id);
              const isDisabled = disabledTeam === col.team;
              const isServer = servingTeam === col.team && posNumber === 1;
              return (
                <button
                  key={id}
                  onClick={() => !isDisabled && onTap(id)}
                  disabled={isDisabled}
                  className={cn(
                    "rounded-md flex flex-col items-center justify-center font-bold transition-all duration-150 active:scale-95 select-none",
                    compact ? "min-h-[40px] text-sm" : "min-h-[52px] text-base",
                    col.team === "A"
                      ? "bg-blue-100 text-blue-900 border border-blue-300"
                      : "bg-red-100 text-red-900 border border-red-300",
                    isServer && "ring-2 ring-amber-400",
                    isSelected && "bg-indigo-600 border-indigo-600 text-white scale-105",
                    isBlockSelected && "bg-amber-500 border-amber-500 text-white scale-105",
                    isDisabled && "opacity-30 cursor-not-allowed"
                  )}
                >
                  <span>{player ? `#${player.playerNumber}` : posNumber}</span>
                  {isServer && <span className="text-[9px] leading-none">🏐</span>}
                </button>
              );
            })}
          </div>
        ))}
      </div>
      {hint && <div className="text-[11px] text-gray-500 mt-1">{hint}</div>}
    </div>
  );
}
