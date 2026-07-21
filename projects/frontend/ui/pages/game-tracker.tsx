import React, { useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { TrackerCourt } from "@/components/ui/tracker-court";
import {
  useGameTracker,
  GameSetup,
  TrackerTeam,
  TrackerActionType,
} from "@/hooks/use-game-tracker";
import {
  ArrowLeft,
  Undo2,
  Trophy,
  Volleyball,
  Swords,
  Hand,
  CheckCircle,
  Link2,
  ArrowRight,
  ListChecks,
} from "lucide-react";

// Live game statistics tracker, adapted from
// github.com/yalayo/volleyball-stats for this app's architecture:
// data in via props (scraped teams/rosters/scheduled matches), results out
// via onSave.

interface ScrapedTeam {
  id: string;
  name: string;
}

interface ScrapedPlayer {
  id: string;
  name?: string;
  jerseyNumber?: string | null;
  teamId?: string;
}

interface ScrapedMatch {
  id: string;
  homeTeamId?: string | null;
  awayTeamId?: string | null;
  homeTeamName?: string | null;
  awayTeamName?: string | null;
  matchDate?: string | null;
  status?: string | null;
  leagueName?: string | null;
}

interface GameTrackerProps {
  teams?: ScrapedTeam[];
  players?: ScrapedPlayer[];
  matches?: ScrapedMatch[];
  /** Deep-link from Match Details' "Start Recording Stats" — skips straight
   *  to the starting-lineup step with both teams already prefilled. */
  initialMatchId?: string;
  saveStatus?: "saving" | "saved" | "error" | null;
  onSave?: (payload: unknown) => void;
  onExit?: () => void;
}

type Phase = "setup" | "live" | "summary";
type Mode = "serve" | "attack" | "block";
// "teams" picks/names the two sides; "lineup" assigns real players to the
// six starting court positions before the game can begin.
type SetupStep = "teams" | "lineup";

interface RosterPlayer {
  playerNumber: number;
  name?: string;
}

interface SideSetup {
  name: string;
  scrapedTeamId: string;
  roster: RosterPlayer[]; // full scraped roster, empty when set up manually
  players: RosterPlayer[]; // the 6 starting positions, index 0 = position 1 (serves)
}

const defaultSide = (team: TrackerTeam): SideSetup => ({
  name: team === "A" ? "Team A" : "Team B",
  scrapedTeamId: "",
  roster: [],
  players: Array.from({ length: 6 }, (_, i) => ({
    playerNumber: team === "A" ? i + 1 : i + 7,
  })),
});

export default function GameTracker({
  teams = [],
  players = [],
  matches = [],
  initialMatchId,
  saveStatus,
  onSave,
  onExit,
}: GameTrackerProps) {
  const tracker = useGameTracker();
  const [phase, setPhase] = useState<Phase>("setup");
  const [setupStep, setSetupStep] = useState<SetupStep>("teams");
  const [mode, setMode] = useState<Mode>("serve");
  const [sideA, setSideA] = useState<SideSetup>(() => defaultSide("A"));
  const [sideB, setSideB] = useState<SideSetup>(() => defaultSide("B"));
  const [firstServer, setFirstServer] = useState<TrackerTeam>("A");
  const [selectedMatchId, setSelectedMatchId] = useState("");

  const scheduledMatches = useMemo(
    () => matches.filter((m) => m.status === "scheduled"),
    [matches]
  );

  // A reload during a live game restores it from localStorage.
  useEffect(() => {
    if (tracker.state && phase === "setup") setPhase("live");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tracker.state]);

  // Every mode requires an explicit "arm" (see use-game-tracker's
  // selectPosition — an unarmed tap is ignored on purpose). Arm the current
  // mode whenever tracking starts, and re-arm it after every recorded point
  // so serve/attack can be recorded rally after rally without re-clicking
  // the mode tab each time. Block intentionally stays unarmed after scoring:
  // the blocker count (1/2/3) can differ on the next rally, so the UI hides
  // its court until the count is picked again.
  const actionsCount = tracker.state?.actions.length ?? 0;
  const prevActionsCount = useRef(0);
  useEffect(() => {
    if (phase !== "live") return;
    const justScored = actionsCount > prevActionsCount.current;
    prevActionsCount.current = actionsCount;
    if (!justScored) return;
    if (mode === "attack") tracker.selectAction("attack-point");
    else if (mode === "serve") tracker.selectAction("serve-success");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionsCount, phase]);

  useEffect(() => {
    if (phase !== "live") return;
    if (mode === "attack") tracker.selectAction("attack-point");
    else if (mode === "serve") tracker.selectAction("serve-success");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // Populates the side's full roster (players with a real scraped jersey
  // number only — those double as the picker's option values). The starting
  // six default to the lowest jersey numbers, but the lineup step lets the
  // coach reassign any of them to any roster player before the game starts.
  const applyScrapedTeam = (team: TrackerTeam, scrapedTeamId: string) => {
    const setter = team === "A" ? setSideA : setSideB;
    if (!scrapedTeamId) {
      setter((prev) => ({ ...prev, scrapedTeamId: "", roster: [] }));
      return;
    }
    const scraped = teams.find((t) => t.id === scrapedTeamId);
    const roster: RosterPlayer[] = players
      .filter((p) => p.teamId === scrapedTeamId && parseInt(p.jerseyNumber || "", 10) > 0)
      .map((p) => ({ playerNumber: parseInt(p.jerseyNumber as string, 10), name: p.name }))
      .sort((a, b) => a.playerNumber - b.playerNumber);
    setter((prev) => ({
      name: scraped?.name ?? prev.name,
      scrapedTeamId,
      roster,
      // No published roster yet (common preseason) — keep manual numbers.
      players: roster.length > 0
        ? Array.from({ length: 6 }, (_, i) => roster[i] ?? { playerNumber: 0 })
        : prev.players,
    }));
  };

  const applyScheduledMatch = (matchId: string) => {
    setSelectedMatchId(matchId);
    if (!matchId) return;
    const match = matches.find((m) => m.id === matchId);
    if (!match) return;
    if (match.homeTeamId) {
      applyScrapedTeam("A", match.homeTeamId);
    } else if (match.homeTeamName) {
      setSideA((prev) => ({ ...prev, name: match.homeTeamName as string, scrapedTeamId: "" }));
    }
    if (match.awayTeamId) {
      applyScrapedTeam("B", match.awayTeamId);
    } else if (match.awayTeamName) {
      setSideB((prev) => ({ ...prev, name: match.awayTeamName as string, scrapedTeamId: "" }));
    }
  };

  // Deep-link from Match Details: prefill both teams and jump straight to
  // assigning the starting lineup — applied once per tracker visit.
  const initialMatchAppliedRef = useRef(false);
  useEffect(() => {
    if (phase === "setup" && initialMatchId && !initialMatchAppliedRef.current) {
      initialMatchAppliedRef.current = true;
      applyScheduledMatch(initialMatchId);
      setSetupStep("lineup");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialMatchId, phase]);

  // Assigns a specific roster player to one of the six starting positions.
  const assignRosterPlayer = (team: TrackerTeam, index: number, playerNumber: number) => {
    const setter = team === "A" ? setSideA : setSideB;
    setter((prev) => {
      const chosen = prev.roster.find((p) => p.playerNumber === playerNumber);
      const next = [...prev.players];
      next[index] = chosen ? { ...chosen } : { playerNumber: 0 };
      return { ...prev, players: next };
    });
  };

  // Roster players not already placed in another starting slot — keeps the
  // same player from being assigned to two positions at once.
  const availableRosterFor = (side: SideSetup, index: number): RosterPlayer[] => {
    const usedElsewhere = new Set(
      side.players.filter((_, i) => i !== index).map((p) => p.playerNumber).filter(Boolean)
    );
    return side.roster.filter((p) => !usedElsewhere.has(p.playerNumber));
  };

  const updateJersey = (team: TrackerTeam, index: number, value: string) => {
    const setter = team === "A" ? setSideA : setSideB;
    setter((prev) => {
      const next = [...prev.players];
      next[index] = { ...next[index], playerNumber: parseInt(value, 10) || 0 };
      return { ...prev, players: next };
    });
  };

  const handleStart = () => {
    const setup: GameSetup = {
      teamAName: sideA.name || "Team A",
      teamBName: sideB.name || "Team B",
      teamAId: sideA.scrapedTeamId || undefined,
      teamBId: sideB.scrapedTeamId || undefined,
      matchId: selectedMatchId || undefined,
      teamAPlayers: sideA.players,
      teamBPlayers: sideB.players,
      firstServer,
    };
    tracker.startGame(setup);
    setMode("serve");
    prevActionsCount.current = 0;
    setPhase("live");
  };

  const handleModeChange = (next: Mode) => {
    setMode(next);
    if (next === "attack") tracker.selectAction("attack-point");
    else if (next === "serve") tracker.selectAction("serve-success");
    else tracker.clearActionState();
  };

  // Undo and End Set both clear the armed action state (a fresh rally may
  // need a different mode). Re-arm the mode the user is still looking at so
  // they can keep tapping without reselecting the tab.
  const handleUndo = () => {
    tracker.undo();
    if (mode === "attack") tracker.selectAction("attack-point");
    else if (mode === "serve") tracker.selectAction("serve-success");
  };

  const handleEndSet = () => {
    tracker.endSet();
    setMode("serve");
    tracker.selectAction("serve-success");
  };

  const handleExit = () => {
    tracker.resetAll();
    onExit?.();
  };

  const state = tracker.state;
  const payload = phase === "summary" ? tracker.buildGamePayload() : null;

  const setsWon = useMemo(() => {
    const sets = state?.sets ?? [];
    return {
      A: sets.filter((s) => s.winner === "A").length,
      B: sets.filter((s) => s.winner === "B").length,
    };
  }, [state?.sets]);

  const playerRows = (team: TrackerTeam) =>
    (state?.playerPoints ?? [])
      .filter((p) => p.team === team)
      .sort((a, b) => b.totalPoints - a.totalPoints);

  const matchLabel = (m: ScrapedMatch) => {
    const when = m.matchDate ? format(new Date(m.matchDate), "MMM d") : "TBD";
    const teamsLabel = `${m.homeTeamName ?? "?"} vs ${m.awayTeamName ?? "?"}`;
    return m.leagueName ? `${when} — ${teamsLabel} (${m.leagueName})` : `${when} — ${teamsLabel}`;
  };

  // ── Setup ──────────────────────────────────────────────────────────────────

  if (phase === "setup" || !state) {
    const canProceedToLineup = sideA.name.trim() && sideB.name.trim();

    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-indigo-700 text-white sticky top-0 z-40 shadow">
          <div className="px-3 py-2.5 flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-indigo-600 px-2"
              onClick={setupStep === "lineup" ? () => setSetupStep("teams") : handleExit}
              title="Back"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h1 className="text-base font-semibold">
              {setupStep === "teams" ? "New Game" : "Starting Lineup"}
            </h1>
          </div>
        </header>

        {setupStep === "teams" && (
          <main className="p-3 max-w-3xl mx-auto space-y-3 pb-24">
            {scheduledMatches.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-1.5">
                    <Link2 className="w-4 h-4" />
                    Start from a scheduled game
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <select
                    className="w-full h-9 rounded-md border border-gray-300 bg-white px-2 text-sm"
                    value={selectedMatchId}
                    onChange={(e) => applyScheduledMatch(e.target.value)}
                  >
                    <option value="">Manual setup…</option>
                    {scheduledMatches.map((m) => (
                      <option key={m.id} value={m.id}>{matchLabel(m)}</option>
                    ))}
                  </select>
                  {selectedMatchId && (
                    <div className="text-[11px] text-gray-500 mt-1.5">
                      Rosters prefilled where available — you'll assign the starting six next.
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {([["A", sideA], ["B", sideB]] as [TrackerTeam, SideSetup][]).map(([team, side]) => (
                <Card key={team}>
                  <CardHeader className="pb-2">
                    <CardTitle className={`text-sm ${team === "A" ? "text-blue-700" : "text-red-700"}`}>
                      Team {team}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Input
                      value={side.name}
                      placeholder={`Team ${team} name`}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        (team === "A" ? setSideA : setSideB)((prev) => ({ ...prev, name: e.target.value }))
                      }
                    />
                    {teams.length > 0 && (
                      <select
                        className="w-full h-9 rounded-md border border-gray-300 bg-white px-2 text-sm"
                        value={side.scrapedTeamId}
                        onChange={(e) => applyScrapedTeam(team, e.target.value)}
                      >
                        <option value="">Prefill from scraped team…</option>
                        {teams.map((t) => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                    )}
                    <div className="text-[11px] text-gray-500">
                      {side.roster.length > 0
                        ? `${side.roster.length} players on roster — pick the starting six next.`
                        : "No published roster — you'll enter jersey numbers next."}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card>
              <CardContent className="pt-4 flex justify-end">
                <Button
                  className="bg-indigo-700 hover:bg-indigo-800 px-6"
                  disabled={!canProceedToLineup}
                  onClick={() => setSetupStep("lineup")}
                >
                  <ListChecks className="w-4 h-4 mr-2" />
                  Next: Assign Starting Lineup
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          </main>
        )}

        {setupStep === "lineup" && (
          <main className="p-3 max-w-3xl mx-auto space-y-3 pb-24">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {([["A", sideA], ["B", sideB]] as [TrackerTeam, SideSetup][]).map(([team, side]) => (
                <Card key={team}>
                  <CardHeader className="pb-2">
                    <CardTitle className={`text-sm ${team === "A" ? "text-blue-700" : "text-red-700"}`}>
                      {side.name} — starting six
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-1.5">
                      {side.players.map((p, i) => (
                        <label key={i} className="text-[11px] text-gray-500">
                          P{i + 1}{i === 0 ? " (serves)" : ""}
                          {side.roster.length > 0 ? (
                            <select
                              className="w-full h-9 mt-0.5 rounded-md border border-gray-300 bg-white text-center text-sm font-bold"
                              value={p.playerNumber || ""}
                              onChange={(e) => assignRosterPlayer(team, i, parseInt(e.target.value, 10) || 0)}
                            >
                              <option value="">—</option>
                              {availableRosterFor(side, i).map((r) => (
                                <option key={r.playerNumber} value={r.playerNumber}>
                                  #{r.playerNumber} {r.name ?? ""}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <Input
                              type="number"
                              inputMode="numeric"
                              className="h-9 mt-0.5 text-center font-bold"
                              value={p.playerNumber || ""}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateJersey(team, i, e.target.value)}
                            />
                          )}
                          {p.name && <span className="block truncate text-[10px] text-gray-400">{p.name}</span>}
                        </label>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card>
              <CardContent className="pt-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">First serve:</span>
                  {(["A", "B"] as TrackerTeam[]).map((t) => (
                    <Button
                      key={t}
                      size="sm"
                      variant={firstServer === t ? "default" : "outline"}
                      onClick={() => setFirstServer(t)}
                    >
                      Team {t}
                    </Button>
                  ))}
                </div>
                <Button className="bg-indigo-700 hover:bg-indigo-800 px-6" onClick={handleStart}>
                  <Volleyball className="w-4 h-4 mr-2" />
                  Start Game
                </Button>
              </CardContent>
            </Card>
          </main>
        )}
      </div>
    );
  }

  // ── Summary ────────────────────────────────────────────────────────────────

  if (phase === "summary" && payload) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-indigo-700 text-white sticky top-0 z-40 shadow">
          <div className="px-3 py-2.5 flex items-center gap-2">
            <Trophy className="w-4 h-4" />
            <h1 className="text-base font-semibold truncate">{payload.name}</h1>
          </div>
        </header>

        <main className="p-3 max-w-3xl mx-auto space-y-3 pb-24">
          <Card>
            <CardContent className="pt-4 text-center">
              <div className="text-3xl font-bold">
                <span className="text-blue-700">{payload.sets.filter((s) => s.winner === "A").length}</span>
                <span className="text-gray-400 mx-2">:</span>
                <span className="text-red-700">{payload.sets.filter((s) => s.winner === "B").length}</span>
              </div>
              <div className="text-xs text-gray-500 mt-1">Sets — {state.teamAName} vs {state.teamBName}</div>
              <div className="flex justify-center gap-2 mt-2 flex-wrap">
                {payload.sets.map((s) => (
                  <Badge key={s.setNumber} variant="outline">
                    Set {s.setNumber}: {s.teamAScore}–{s.teamBScore}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {(["A", "B"] as TrackerTeam[]).map((team) => (
            <Card key={team}>
              <CardHeader className="pb-2">
                <CardTitle className={`text-sm ${team === "A" ? "text-blue-700" : "text-red-700"}`}>
                  {team === "A" ? state.teamAName : state.teamBName} — player points
                </CardTitle>
              </CardHeader>
              <CardContent>
                {playerRows(team).length === 0 ? (
                  <div className="text-sm text-gray-400">No points recorded</div>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-gray-500">
                        <th className="py-1">#</th>
                        <th>Player</th>
                        <th className="text-center">Serve</th>
                        <th className="text-center">Attack</th>
                        <th className="text-center">Block</th>
                        <th className="text-center">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {playerRows(team).map((p) => (
                        <tr key={p.playerNumber} className="border-t">
                          <td className="py-1.5 font-bold">#{p.playerNumber}</td>
                          <td className="truncate max-w-[8rem]">{p.name || "—"}</td>
                          <td className="text-center">{p.servePoints}</td>
                          <td className="text-center">{p.attackPoints}</td>
                          <td className="text-center">{p.blockPoints}</td>
                          <td className="text-center font-bold">{p.totalPoints}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>
          ))}

          <div className="flex gap-2">
            <Button
              className="flex-1 bg-indigo-700 hover:bg-indigo-800"
              disabled={saveStatus === "saving" || saveStatus === "saved"}
              onClick={() => onSave?.(payload)}
            >
              {saveStatus === "saved" ? (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Saved
                </>
              ) : saveStatus === "saving" ? "Saving…" : "Save Game"}
            </Button>
            <Button variant="outline" className="flex-1" onClick={handleExit}>
              {saveStatus === "saved" ? "Done" : "Discard & Exit"}
            </Button>
          </div>
          {saveStatus === "error" && (
            <div className="text-sm text-red-600 text-center">Saving failed — check your connection and try again.</div>
          )}
        </main>
      </div>
    );
  }

  // ── Live tracking ──────────────────────────────────────────────────────────

  const a = tracker.actionState;
  const blockCount =
    a.actionType === "block-1" ? 1 : a.actionType === "block-2" ? 2 : a.actionType === "block-3" ? 3 : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Score header */}
      <header className="bg-indigo-700 text-white sticky top-0 z-40 shadow">
        <div className="px-2 py-1.5 flex items-center justify-between gap-2">
          <Button variant="ghost" size="sm" className="text-white hover:bg-indigo-600 px-2" onClick={() => setPhase("summary")} title="Finish game">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-3 min-w-0">
            <div className="text-right min-w-0">
              <div className="text-[11px] truncate max-w-[7rem]">{state.teamAName}</div>
              <div className="text-xl font-bold font-mono leading-none">
                {state.teamAScore}
                {state.servingTeam === "A" && <span className="text-[10px] align-top"> 🏐</span>}
              </div>
            </div>
            <div className="text-center text-[10px] text-indigo-200">
              <div>Set {state.setNumber}</div>
              <div className="font-bold">{setsWon.A}–{setsWon.B}</div>
            </div>
            <div className="min-w-0">
              <div className="text-[11px] truncate max-w-[7rem]">{state.teamBName}</div>
              <div className="text-xl font-bold font-mono leading-none">
                {state.servingTeam === "B" && <span className="text-[10px] align-top">🏐 </span>}
                {state.teamBScore}
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-white hover:bg-indigo-600 px-2 disabled:opacity-30"
            disabled={!tracker.canUndo}
            onClick={handleUndo}
            title="Undo last rally"
          >
            <Undo2 className="w-4 h-4" />
          </Button>
        </div>
        {state.matchId && (
          <div className="px-2 pb-1.5 flex items-center gap-1 text-[10px] text-indigo-200">
            <Link2 className="w-3 h-3" />
            Linked to scheduled match
          </div>
        )}
      </header>

      <main className="p-2 max-w-5xl mx-auto pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
          {/* Action recording */}
          <Card>
            <CardContent className="p-2 space-y-2">
              {/* Mode selector */}
              <div className="grid grid-cols-3 gap-1.5">
                <Button
                  size="sm"
                  variant={mode === "serve" ? "default" : "outline"}
                  className={mode === "serve" ? "bg-indigo-700" : ""}
                  onClick={() => handleModeChange("serve")}
                >
                  <Volleyball className="w-3.5 h-3.5 mr-1" />
                  Serve
                </Button>
                <Button
                  size="sm"
                  variant={mode === "attack" ? "default" : "outline"}
                  className={mode === "attack" ? "bg-indigo-700" : ""}
                  onClick={() => handleModeChange("attack")}
                >
                  <Swords className="w-3.5 h-3.5 mr-1" />
                  Attack
                </Button>
                <Button
                  size="sm"
                  variant={mode === "block" ? "default" : "outline"}
                  className={mode === "block" ? "bg-indigo-700" : ""}
                  onClick={() => handleModeChange("block")}
                >
                  <Hand className="w-3.5 h-3.5 mr-1" />
                  Block
                </Button>
              </div>

              {mode === "serve" && (
                <>
                  <TrackerCourt
                    compact
                    getPlayerAt={tracker.getPlayerAt}
                    selectedPosition={a.selectedPosition}
                    disabledTeam={state.servingTeam}
                    servingTeam={state.servingTeam}
                    onTap={tracker.selectPosition}
                    hint={`Team ${state.servingTeam} serves — tap where the ball landed, then score it`}
                  />
                  {a.serveTargetSelected && (
                    <div className="grid grid-cols-2 gap-1.5">
                      <Button className="bg-green-600 hover:bg-green-700" onClick={() => tracker.selectAction("serve-success")}>
                        Ace / Point
                      </Button>
                      <Button className="bg-red-600 hover:bg-red-700" onClick={() => tracker.selectAction("serve-fail")}>
                        Serve Error
                      </Button>
                    </div>
                  )}
                </>
              )}

              {mode === "attack" && (
                <TrackerCourt
                  compact
                  getPlayerAt={tracker.getPlayerAt}
                  selectedPosition={a.selectedPosition}
                  onTap={tracker.selectPosition}
                  hint={
                    a.selectedPosition
                      ? "Now tap where the ball landed — point goes to the attacker"
                      : "Tap the attacking player's position"
                  }
                />
              )}

              {mode === "block" && (
                <>
                  <div className="grid grid-cols-3 gap-1.5">
                    {([1, 2, 3] as const).map((n) => (
                      <Button
                        key={n}
                        size="sm"
                        variant={blockCount === n ? "default" : "outline"}
                        className={blockCount === n ? "bg-amber-500 hover:bg-amber-600" : ""}
                        onClick={() => tracker.selectAction(`block-${n}` as TrackerActionType)}
                      >
                        {n} {n === 1 ? "Player" : "Players"}
                      </Button>
                    ))}
                  </div>
                  {blockCount > 0 && (
                    <TrackerCourt
                      compact
                      getPlayerAt={tracker.getPlayerAt}
                      blockPositions={a.selectedBlockPositions}
                      onTap={tracker.selectPosition}
                      hint={`Tap the blockers (${a.selectedBlockPositions.length}/${blockCount}) — point goes to their team`}
                    />
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Rotation view + player points */}
          <div className="space-y-2">
            <Card>
              <CardContent className="p-2">
                <TrackerCourt
                  getPlayerAt={tracker.getPlayerAt}
                  servingTeam={state.servingTeam}
                  onTap={() => {}}
                  title="Current rotation"
                />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-2">
                <div className="text-xs font-medium text-gray-600 mb-1.5">Player points</div>
                <div className="grid grid-cols-2 gap-2">
                  {(["A", "B"] as TrackerTeam[]).map((team) => (
                    <div key={team}>
                      <div className={`text-[11px] font-semibold mb-1 ${team === "A" ? "text-blue-700" : "text-red-700"}`}>
                        {team === "A" ? state.teamAName : state.teamBName}
                      </div>
                      {playerRows(team).length === 0 ? (
                        <div className="text-[11px] text-gray-400">—</div>
                      ) : (
                        playerRows(team).map((p) => (
                          <div key={p.playerNumber} className="flex justify-between text-xs py-0.5 border-b border-gray-100">
                            <span className="font-bold">#{p.playerNumber}</span>
                            <span className="text-gray-500">
                              {p.servePoints}/{p.attackPoints}/{p.blockPoints}
                            </span>
                            <span className="font-bold">{p.totalPoints}</span>
                          </div>
                        ))
                      )}
                    </div>
                  ))}
                </div>
                <div className="text-[10px] text-gray-400 mt-1">serve / attack / block</div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Bottom action bar — thumb reach on phones */}
      <div className="fixed bottom-0 inset-x-0 bg-white border-t shadow-lg z-40">
        <div className="max-w-5xl mx-auto p-2 grid grid-cols-2 gap-2">
          <Button variant="outline" className="border-amber-500 text-amber-600 hover:bg-amber-50" onClick={handleEndSet}>
            End Set {state.setNumber}
          </Button>
          <Button className="bg-red-600 hover:bg-red-700" onClick={() => setPhase("summary")}>
            Finish Game
          </Button>
        </div>
      </div>
    </div>
  );
}
