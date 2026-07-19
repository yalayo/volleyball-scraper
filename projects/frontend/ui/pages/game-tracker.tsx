import React, { useEffect, useMemo, useState } from "react";
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
} from "lucide-react";

// Live game statistics tracker, adapted from
// github.com/yalayo/volleyball-stats for this app's architecture:
// data in via props (scraped teams/rosters), results out via onSave.

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

interface GameTrackerProps {
  teams?: ScrapedTeam[];
  players?: ScrapedPlayer[];
  saveStatus?: "saving" | "saved" | "error" | null;
  onSave?: (payload: unknown) => void;
  onExit?: () => void;
}

type Phase = "setup" | "live" | "summary";
type Mode = "serve" | "attack" | "block";

interface SideSetup {
  name: string;
  scrapedTeamId: string;
  players: { playerNumber: number; name?: string }[];
}

const defaultSide = (team: TrackerTeam): SideSetup => ({
  name: team === "A" ? "Team A" : "Team B",
  scrapedTeamId: "",
  players: Array.from({ length: 6 }, (_, i) => ({
    playerNumber: team === "A" ? i + 1 : i + 7,
  })),
});

export default function GameTracker({
  teams = [],
  players = [],
  saveStatus,
  onSave,
  onExit,
}: GameTrackerProps) {
  const tracker = useGameTracker();
  const [phase, setPhase] = useState<Phase>("setup");
  const [mode, setMode] = useState<Mode>("serve");
  const [sideA, setSideA] = useState<SideSetup>(() => defaultSide("A"));
  const [sideB, setSideB] = useState<SideSetup>(() => defaultSide("B"));
  const [firstServer, setFirstServer] = useState<TrackerTeam>("A");

  // A reload during a live game restores it from localStorage.
  useEffect(() => {
    if (tracker.state && phase === "setup") setPhase("live");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tracker.state]);

  const applyScrapedTeam = (team: TrackerTeam, scrapedTeamId: string) => {
    const setter = team === "A" ? setSideA : setSideB;
    if (!scrapedTeamId) {
      setter((prev) => ({ ...prev, scrapedTeamId: "" }));
      return;
    }
    const scraped = teams.find((t) => t.id === scrapedTeamId);
    const roster = players
      .filter((p) => p.teamId === scrapedTeamId)
      .sort(
        (a, b) => (parseInt(a.jerseyNumber || "99", 10) || 99) - (parseInt(b.jerseyNumber || "99", 10) || 99)
      );
    setter((prev) => ({
      name: scraped?.name ?? prev.name,
      scrapedTeamId,
      players: Array.from({ length: 6 }, (_, i) => ({
        playerNumber: parseInt(roster[i]?.jerseyNumber || "", 10) || i + (team === "A" ? 1 : 7),
        name: roster[i]?.name,
      })),
    }));
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
      teamAPlayers: sideA.players,
      teamBPlayers: sideB.players,
      firstServer,
    };
    tracker.startGame(setup);
    setMode("serve");
    setPhase("live");
  };

  const handleModeChange = (next: Mode) => {
    setMode(next);
    if (next === "attack") tracker.selectAction("attack-point");
    else tracker.clearActionState();
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

  // ── Setup ──────────────────────────────────────────────────────────────────

  if (phase === "setup" || !state) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-indigo-700 text-white sticky top-0 z-40 shadow">
          <div className="px-3 py-2.5 flex items-center gap-2">
            <Button variant="ghost" size="sm" className="text-white hover:bg-indigo-600 px-2" onClick={handleExit} title="Back">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h1 className="text-base font-semibold">New Game</h1>
          </div>
        </header>

        <main className="p-3 max-w-3xl mx-auto space-y-3 pb-24">
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
                  <div className="grid grid-cols-3 gap-1.5">
                    {side.players.map((p, i) => (
                      <label key={i} className="text-[11px] text-gray-500">
                        P{i + 1}{i === 0 ? " (serves)" : ""}
                        <Input
                          type="number"
                          inputMode="numeric"
                          className="h-9 mt-0.5 text-center font-bold"
                          value={p.playerNumber || ""}
                          title={p.name}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateJersey(team, i, e.target.value)}
                        />
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
            onClick={tracker.undo}
            title="Undo last rally"
          >
            <Undo2 className="w-4 h-4" />
          </Button>
        </div>
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
          <Button variant="outline" className="border-amber-500 text-amber-600 hover:bg-amber-50" onClick={tracker.endSet}>
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
