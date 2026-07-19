import { useState, useEffect, useCallback } from "react";

// Live game tracking logic, adapted from github.com/yalayo/volleyball-stats.
// Self-contained: no server calls — the page persists finished games through
// the cljs command layer and localStorage guards against mid-game reloads.

export type TrackerTeam = "A" | "B";
export type TrackerPosition = string; // 'A1'..'A6', 'B1'..'B6'
export type TrackerActionType =
  | "serve-success"
  | "serve-fail"
  | "attack-point"
  | "block-1"
  | "block-2"
  | "block-3";

export interface TrackerPlayer {
  team: TrackerTeam;
  position: number; // current court position 1..6 (1 = server)
  playerNumber: number;
  name?: string;
}

export interface TrackerAction {
  id: string;
  type: TrackerActionType;
  position: TrackerPosition;
  targetPosition?: TrackerPosition;
  blockPositions?: TrackerPosition[];
  playerNumber?: number;
  team?: TrackerTeam;
  timestamp: string;
}

export interface PlayerPoints {
  team: TrackerTeam;
  playerNumber: number;
  name?: string;
  servePoints: number;
  attackPoints: number;
  blockPoints: number;
  totalPoints: number;
}

export interface SetResult {
  setNumber: number;
  teamAScore: number;
  teamBScore: number;
  winner: TrackerTeam;
}

export interface TeamSideStats {
  serveSuccess: number;
  serveFail: number;
  blockPoints: number;
  attackPoints: number;
}

export interface TrackerState {
  teamAName: string;
  teamBName: string;
  teamAId?: string;
  teamBId?: string;
  teamAScore: number;
  teamBScore: number;
  servingTeam: TrackerTeam;
  firstServer: TrackerTeam;
  setNumber: number;
  sets: SetResult[];
  lineup: TrackerPlayer[];
  actions: TrackerAction[];
  playerPoints: PlayerPoints[];
  teamStats: { A: TeamSideStats; B: TeamSideStats };
}

export interface ActionState {
  actionType: TrackerActionType | null;
  selectedPosition: TrackerPosition | null;
  serveTargetSelected: boolean;
  selectedBlockPositions: TrackerPosition[];
}

export interface GameSetup {
  teamAName: string;
  teamBName: string;
  teamAId?: string;
  teamBId?: string;
  teamAPlayers: { playerNumber: number; name?: string }[]; // index 0 = position 1
  teamBPlayers: { playerNumber: number; name?: string }[];
  firstServer: TrackerTeam;
}

const STORAGE_KEY = "volleyTrackerGame";

const emptyActionState: ActionState = {
  actionType: null,
  selectedPosition: null,
  serveTargetSelected: false,
  selectedBlockPositions: [],
};

const emptySideStats = (): TeamSideStats => ({
  serveSuccess: 0,
  serveFail: 0,
  blockPoints: 0,
  attackPoints: 0,
});

const teamOf = (position: TrackerPosition): TrackerTeam =>
  position.charAt(0) as TrackerTeam;

const positionNumberOf = (position: TrackerPosition): number =>
  parseInt(position.charAt(1), 10);

export function useGameTracker() {
  const [state, setState] = useState<TrackerState | null>(null);
  // Undo works by snapshotting the whole game state before every recorded
  // rally — trivial to reason about and fast enough at volleyball scale.
  const [snapshots, setSnapshots] = useState<TrackerState[]>([]);
  const [actionState, setActionState] = useState<ActionState>(emptyActionState);

  // Crash safety: restore a game in progress after an accidental reload.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setState(JSON.parse(saved));
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    try {
      if (state) localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* storage full/unavailable — tracking continues in memory */
    }
  }, [state]);

  const startGame = useCallback((setup: GameSetup) => {
    const lineup: TrackerPlayer[] = [];
    (["A", "B"] as TrackerTeam[]).forEach((team) => {
      const players = team === "A" ? setup.teamAPlayers : setup.teamBPlayers;
      players.slice(0, 6).forEach((p, i) => {
        lineup.push({ team, position: i + 1, playerNumber: p.playerNumber, name: p.name });
      });
    });
    setState({
      teamAName: setup.teamAName,
      teamBName: setup.teamBName,
      teamAId: setup.teamAId,
      teamBId: setup.teamBId,
      teamAScore: 0,
      teamBScore: 0,
      servingTeam: setup.firstServer,
      firstServer: setup.firstServer,
      setNumber: 1,
      sets: [],
      lineup,
      actions: [],
      playerPoints: [],
      teamStats: { A: emptySideStats(), B: emptySideStats() },
    });
    setSnapshots([]);
    setActionState(emptyActionState);
  }, []);

  const getPlayerAt = useCallback(
    (position: TrackerPosition): TrackerPlayer | undefined => {
      if (!state) return undefined;
      const team = teamOf(position);
      const pos = positionNumberOf(position);
      return state.lineup.find((p) => p.team === team && p.position === pos);
    },
    [state]
  );

  // Real volleyball rotation is clockwise: the player in position 2 becomes
  // the new server (2→1, 3→2, 4→3, 5→4, 6→5, 1→6).
  const rotateLineup = (lineup: TrackerPlayer[], team: TrackerTeam): TrackerPlayer[] =>
    lineup.map((p) =>
      p.team === team ? { ...p, position: p.position === 1 ? 6 : p.position - 1 } : p
    );

  const creditPlayer = (
    points: PlayerPoints[],
    player: TrackerPlayer | undefined,
    kind: "servePoints" | "attackPoints" | "blockPoints"
  ): PlayerPoints[] => {
    if (!player) return points;
    const idx = points.findIndex(
      (p) => p.team === player.team && p.playerNumber === player.playerNumber
    );
    const entry: PlayerPoints =
      idx >= 0
        ? { ...points[idx] }
        : {
            team: player.team,
            playerNumber: player.playerNumber,
            name: player.name,
            servePoints: 0,
            attackPoints: 0,
            blockPoints: 0,
            totalPoints: 0,
          };
    entry[kind] += 1;
    entry.totalPoints += 1;
    const next = [...points];
    if (idx >= 0) next[idx] = entry;
    else next.push(entry);
    return next;
  };

  // Applies one rally result: score, side-out rotation and player credit.
  const applyRally = useCallback(
    (prev: TrackerState, action: TrackerAction): TrackerState => {
      let next: TrackerState = {
        ...prev,
        actions: [...prev.actions, action],
        teamStats: { A: { ...prev.teamStats.A }, B: { ...prev.teamStats.B } },
      };
      let scoringTeam: TrackerTeam;

      switch (action.type) {
        case "serve-success": {
          scoringTeam = prev.servingTeam;
          next.teamStats[scoringTeam].serveSuccess += 1;
          const server = prev.lineup.find(
            (p) => p.team === scoringTeam && p.position === 1
          );
          next.playerPoints = creditPlayer(prev.playerPoints, server, "servePoints");
          break;
        }
        case "serve-fail": {
          const failing = prev.servingTeam;
          scoringTeam = failing === "A" ? "B" : "A";
          next.teamStats[failing].serveFail += 1;
          break;
        }
        case "attack-point": {
          scoringTeam = teamOf(action.position);
          next.teamStats[scoringTeam].attackPoints += 1;
          next.playerPoints = creditPlayer(
            prev.playerPoints,
            prev.lineup.find(
              (p) =>
                p.team === scoringTeam &&
                p.position === positionNumberOf(action.position)
            ),
            "attackPoints"
          );
          break;
        }
        default: {
          // block-1 / block-2 / block-3 — every blocker gets credit
          scoringTeam = teamOf(action.position);
          next.teamStats[scoringTeam].blockPoints += 1;
          let credited = prev.playerPoints;
          (action.blockPositions ?? [action.position]).forEach((pos) => {
            credited = creditPlayer(
              credited,
              prev.lineup.find(
                (p) => p.team === teamOf(pos) && p.position === positionNumberOf(pos)
              ),
              "blockPoints"
            );
          });
          next.playerPoints = credited;
        }
      }

      if (scoringTeam === "A") next.teamAScore = prev.teamAScore + 1;
      else next.teamBScore = prev.teamBScore + 1;

      // Side out: the receiving team wins the rally, gains serve and rotates.
      if (prev.servingTeam !== scoringTeam) {
        next.servingTeam = scoringTeam;
        next.lineup = rotateLineup(next.lineup, scoringTeam);
      }
      return next;
    },
    []
  );

  const recordAction = useCallback(
    (
      type: TrackerActionType,
      position: TrackerPosition,
      targetPosition?: TrackerPosition,
      blockPositions?: TrackerPosition[]
    ) => {
      setState((prev) => {
        if (!prev) return prev;
        setSnapshots((s) => [...s.slice(-49), prev]);
        const acting = prev.lineup.find(
          (p) =>
            p.team === teamOf(position) &&
            p.position === positionNumberOf(position)
        );
        const action: TrackerAction = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          type,
          position,
          targetPosition,
          blockPositions,
          playerNumber: acting?.playerNumber,
          team: teamOf(position),
          timestamp: new Date().toISOString(),
        };
        return applyRally(prev, action);
      });
      setActionState(emptyActionState);
    },
    [applyRally]
  );

  // Tap flows (same interaction model as the reference app):
  //  - serve: pick landing spot on the receiving side, then Success/Fail
  //  - attack: pick source, then destination
  //  - block: pick 1/2/3 blockers on one side
  const selectPosition = useCallback(
    (position: TrackerPosition) => {
      setActionState((prev) => {
        const type = prev.actionType;
        if (type === "attack-point") {
          if (prev.selectedPosition && prev.selectedPosition !== position) {
            recordAction("attack-point", prev.selectedPosition, position);
            return emptyActionState;
          }
          return { ...prev, selectedPosition: position };
        }
        if (type === "block-1" || type === "block-2" || type === "block-3") {
          const required = parseInt(type.split("-")[1], 10);
          const already = prev.selectedBlockPositions.includes(position);
          const sameTeam =
            prev.selectedBlockPositions.length === 0 ||
            teamOf(prev.selectedBlockPositions[0]) === teamOf(position);
          if (!sameTeam) return prev;
          const chosen = already
            ? prev.selectedBlockPositions.filter((p) => p !== position)
            : [...prev.selectedBlockPositions, position];
          if (chosen.length === required) {
            recordAction(type, chosen[0], undefined, chosen);
            return emptyActionState;
          }
          return { ...prev, selectedBlockPositions: chosen };
        }
        // serve target: any tap while serve panel active marks the landing spot
        return {
          ...prev,
          actionType:
            type === "serve-success" || type === "serve-fail"
              ? type
              : "serve-success",
          selectedPosition: position,
          serveTargetSelected: true,
        };
      });
    },
    [recordAction]
  );

  const selectAction = useCallback(
    (type: TrackerActionType) => {
      setActionState((prev) => {
        if (
          (type === "serve-success" || type === "serve-fail") &&
          prev.selectedPosition &&
          prev.serveTargetSelected
        ) {
          const servingPosition = `${state?.servingTeam ?? "A"}1`;
          recordAction(type, servingPosition, prev.selectedPosition);
          return emptyActionState;
        }
        return { ...emptyActionState, actionType: type };
      });
    },
    [recordAction, state?.servingTeam]
  );

  const clearActionState = useCallback(() => setActionState(emptyActionState), []);

  const undo = useCallback(() => {
    setSnapshots((s) => {
      if (s.length === 0) return s;
      setState(s[s.length - 1]);
      return s.slice(0, -1);
    });
    setActionState(emptyActionState);
  }, []);

  const endSet = useCallback(() => {
    setState((prev) => {
      if (!prev) return prev;
      setSnapshots((s) => [...s.slice(-49), prev]);
      const winner: TrackerTeam = prev.teamAScore >= prev.teamBScore ? "A" : "B";
      const nextSetNumber = prev.setNumber + 1;
      // Teams alternate first serve from set to set.
      const nextServer: TrackerTeam =
        nextSetNumber % 2 === 1
          ? prev.firstServer
          : prev.firstServer === "A"
            ? "B"
            : "A";
      return {
        ...prev,
        sets: [
          ...prev.sets,
          {
            setNumber: prev.setNumber,
            teamAScore: prev.teamAScore,
            teamBScore: prev.teamBScore,
            winner,
          },
        ],
        setNumber: nextSetNumber,
        teamAScore: 0,
        teamBScore: 0,
        servingTeam: nextServer,
      };
    });
    setActionState(emptyActionState);
  }, []);

  // Payload for the :save-game command — includes the running set when the
  // game ends mid-set with points on the board.
  const buildGamePayload = useCallback(() => {
    if (!state) return null;
    const sets =
      state.teamAScore > 0 || state.teamBScore > 0
        ? [
            ...state.sets,
            {
              setNumber: state.setNumber,
              teamAScore: state.teamAScore,
              teamBScore: state.teamBScore,
              winner: (state.teamAScore >= state.teamBScore ? "A" : "B") as TrackerTeam,
            },
          ]
        : state.sets;
    return {
      name: `${state.teamAName} vs ${state.teamBName}`,
      teamAName: state.teamAName,
      teamBName: state.teamBName,
      teamAId: state.teamAId,
      teamBId: state.teamBId,
      date: new Date().toISOString(),
      sets,
      playerStats: [...state.playerPoints].sort((a, b) => b.totalPoints - a.totalPoints),
      stats: state.teamStats,
      actions: state.actions,
    };
  }, [state]);

  const resetAll = useCallback(() => {
    setState(null);
    setSnapshots([]);
    setActionState(emptyActionState);
  }, []);

  return {
    state,
    actionState,
    canUndo: snapshots.length > 0,
    startGame,
    getPlayerAt,
    selectPosition,
    selectAction,
    clearActionState,
    undo,
    endSet,
    buildGamePayload,
    resetAll,
  };
}
