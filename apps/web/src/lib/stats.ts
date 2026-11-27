import type { ErrorCause, ErrorReason, Match, Rally, Shot, ShotType } from "./types";

export interface TypeStat {
  type: ShotType;
  total: number;
  errors: number;
  winners: number;
  errorRate: number | null;
  winnerRate: number | null;
}

export interface PlayerSummary {
  total: number;
  classified: number;
  unclassified: number;
  winners: number;
  unforced: number;
  forced: number;
  neutrals: number;
  errors: number;
  good: number;
  errorRate: number | null;
  winnerRate: number | null;
  byType: TypeStat[];
  byReason: Array<{ reason: ErrorReason; count: number }>;
  byCause: Array<{ cause: ErrorCause; count: number }>;
}

export function isOnProfile(match: Match): boolean {
  if (match.saved === true) return true;
  if (match.saved === false) return false;
  return !match.example;
}

export function isError(outcome: Shot["outcome"]): boolean {
  return outcome === "unforced_error" || outcome === "forced_error";
}

/** Each error is one point given away. A game is at least 4 points. */
export function gifted(unforced: number, forced: number): { points: number; games: number; line: string } {
  const points = unforced + forced;
  const games = Math.floor(points / 4);
  const rest = points % 4;
  const errorWord = points === 1 ? "errore" : "errori";
  const pointWord = points === 1 ? "punto" : "punti";
  const gamesText =
    points === 0 ? "0 game regalati" : rest === 0 ? `${games} game regalati` : games === 0 ? "meno di 1 game regalato" : `più di ${games} game regalati`;
  return { points, games, line: `${points} ${errorWord} = ${points} ${pointWord} = ${gamesText}` };
}

export function playerShots(shots: Shot[], playerId: string, matchId?: string): Shot[] {
  return shots.filter((shot) => shot.playerId === playerId && (matchId ? shot.matchId === matchId : true));
}

export function summarize(shots: Shot[]): PlayerSummary {
  const classified = shots.filter((shot) => shot.outcome !== "unclassified" && shot.type !== "unclassified");
  const winners = shots.filter((shot) => shot.outcome === "winner").length;
  const unforced = shots.filter((shot) => shot.outcome === "unforced_error").length;
  const forced = shots.filter((shot) => shot.outcome === "forced_error").length;
  const neutrals = shots.filter((shot) => shot.outcome === "neutral").length;
  const errors = unforced + forced;
  const denom = classified.length;
  const byTypeMap = new Map<ShotType, TypeStat>();
  const reasonMap = new Map<ErrorReason, number>();
  const causeMap = new Map<ErrorCause, number>();

  for (const shot of shots) {
    if (shot.type === "unclassified") continue;
    const row = byTypeMap.get(shot.type) ?? {
      type: shot.type,
      total: 0,
      errors: 0,
      winners: 0,
      errorRate: null,
      winnerRate: null,
    };
    row.total += 1;
    if (isError(shot.outcome)) row.errors += 1;
    if (shot.outcome === "winner") row.winners += 1;
    byTypeMap.set(shot.type, row);
    if (isError(shot.outcome) && shot.errorReason) {
      reasonMap.set(shot.errorReason, (reasonMap.get(shot.errorReason) ?? 0) + 1);
    }
    if (isError(shot.outcome) && shot.errorCause) {
      causeMap.set(shot.errorCause, (causeMap.get(shot.errorCause) ?? 0) + 1);
    }
  }

  const byType = [...byTypeMap.values()]
    .map((row) => ({
      ...row,
      errorRate: row.total >= 3 ? row.errors / row.total : null,
      winnerRate: row.total >= 3 ? row.winners / row.total : null,
    }))
    .sort((a, b) => b.errors - a.errors || b.total - a.total);

  return {
    total: shots.length,
    classified: denom,
    unclassified: shots.length - denom,
    winners,
    unforced,
    forced,
    neutrals,
    errors,
    good: winners,
    errorRate: denom >= 4 ? errors / denom : null,
    winnerRate: denom >= 4 ? winners / denom : null,
    byType,
    byReason: [...reasonMap.entries()]
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count),
    byCause: [...causeMap.entries()]
      .map(([cause, count]) => ({ cause, count }))
      .sort((a, b) => b.count - a.count),
  };
}

export function percentChange(current: number, previous: number): number | null {
  if (!Number.isFinite(previous) || previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

export type DeltaTone = "good" | "bad" | "flat" | "none";

export function deltaTone(metric: "errors" | "winners", pct: number | null): DeltaTone {
  if (pct == null) return "none";
  if (Math.abs(pct) < 1) return "flat";
  if (metric === "errors") return pct < 0 ? "good" : "bad";
  return pct > 0 ? "good" : "bad";
}

export interface ServeStats {
  observed: boolean;
  firstInPct: number | null;
  secondInPct: number | null;
  pointsWonOnServePct: number | null;
  pointsWonOnReturnPct: number | null;
  doubleFaults: number;
  firstServes: number;
  servePoints: number;
  returnPoints: number;
}

export function serveStats(shots: Shot[], rallies: Rally[], playerId: string, matchId: string): ServeStats {
  const mine = playerShots(shots, playerId, matchId);
  const first = mine.filter((shot) => shot.type === "serve" && shot.serveNumber !== 2);
  const second = mine.filter((shot) => shot.type === "serve" && shot.serveNumber === 2);
  const firstIn = first.filter((shot) => !isError(shot.outcome) && shot.outcome !== "unclassified");
  const secondIn = second.filter((shot) => !isError(shot.outcome) && shot.outcome !== "unclassified");
  const matchRallies = rallies.filter((rally) => rally.matchId === matchId);
  const serveRallies = matchRallies.filter((rally) => rally.serverTeam === 1);
  const decidedServe = serveRallies.filter((rally) => rally.winnerTeam === 1 || rally.winnerTeam === 2);
  const wonServe = decidedServe.filter((rally) => rally.winnerTeam === 1);
  const returnRallies = matchRallies.filter((rally) => rally.serverTeam === 2);
  const decidedReturn = returnRallies.filter((rally) => rally.winnerTeam === 1 || rally.winnerTeam === 2);
  const wonReturn = decidedReturn.filter((rally) => rally.winnerTeam === 1);
  const observed = first.length >= 4;
  return {
    observed,
    firstInPct: first.length >= 4 ? firstIn.length / first.length : null,
    secondInPct: second.length >= 3 ? secondIn.length / second.length : null,
    pointsWonOnServePct: decidedServe.length >= 4 ? wonServe.length / decidedServe.length : null,
    pointsWonOnReturnPct: decidedReturn.length >= 4 ? wonReturn.length / decidedReturn.length : null,
    doubleFaults: mine.filter((shot) => shot.errorReason === "double_fault").length,
    firstServes: first.length,
    servePoints: decidedServe.length,
    returnPoints: decidedReturn.length,
  };
}

export interface QuarterStat {
  label: string;
  errors: number;
  unforced: number;
  forced: number;
  winners: number;
  shots: number;
}

export function quarters(shots: Shot[], durationSec: number): QuarterStat[] {
  const span = Math.max(durationSec, 1);
  const labels = ["Inizio", "Secondo quarto", "Terzo quarto", "Finale"];
  return labels.map((label, index) => {
    const from = (span * index) / 4;
    const to = (span * (index + 1)) / 4;
    const slice = shots.filter((shot) => shot.tImpact >= from && (index === 3 ? shot.tImpact <= to + 0.01 : shot.tImpact < to));
    return {
      label,
      errors: slice.filter((shot) => isError(shot.outcome)).length,
      unforced: slice.filter((shot) => shot.outcome === "unforced_error").length,
      forced: slice.filter((shot) => shot.outcome === "forced_error").length,
      winners: slice.filter((shot) => shot.outcome === "winner").length,
      shots: slice.length,
    };
  });
}

export function matchesForPlayer(matches: Match[], shots: Shot[], playerId: string): Match[] {
  const ids = new Set(shots.filter((shot) => shot.playerId === playerId).map((shot) => shot.matchId));
  for (const match of matches) {
    if (match.focusPlayerId === playerId) ids.add(match.id);
  }
  return matches.filter((match) => ids.has(match.id)).sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
}

export interface SkillPoint {
  matchId: string;
  date: string;
  errorRate: number | null;
  observed: boolean;
}

export interface SkillSnapshot {
  id: string;
  label: string;
  points: SkillPoint[];
  trend: "up" | "down" | "flat" | "unobserved";
}

const SKILL_DEFS: Array<{ id: string; label: string; types: ShotType[]; mode: "types" | "position" }> = [
  { id: "serve", label: "Servizio e risposta", types: ["serve", "return"], mode: "types" },
  { id: "volley", label: "Volée", types: ["forehand_volley", "backhand_volley"], mode: "types" },
  { id: "air", label: "Colpi aerei", types: ["smash", "bandeja", "vibora"], mode: "types" },
  { id: "walls", label: "Pareti", types: ["bajada", "contrapared"], mode: "types" },
  { id: "defense", label: "Difesa", types: ["lob", "slice", "chiquita"], mode: "types" },
  { id: "position", label: "Posizionamento", types: [], mode: "position" },
];

export function skillSnapshots(matches: Match[], shots: Shot[], playerId: string): SkillSnapshot[] {
  const ordered = matchesForPlayer(matches, shots, playerId);
  return SKILL_DEFS.map((skill) => {
    const points = ordered.map((match) => {
      const mine = playerShots(shots, playerId, match.id);
      if (skill.mode === "position") {
        if (!match.observation.position || mine.filter((shot) => shot.type !== "unclassified").length < 8) {
          return { matchId: match.id, date: match.date, errorRate: null, observed: false };
        }
        const errors = mine.filter((shot) => shot.errorReason === "position").length;
        return { matchId: match.id, date: match.date, errorRate: errors / mine.length, observed: true };
      }
      const subset = mine.filter((shot) => skill.types.includes(shot.type));
      if (subset.length < 3) {
        return { matchId: match.id, date: match.date, errorRate: null, observed: false };
      }
      const errors = subset.filter((shot) => isError(shot.outcome)).length;
      return { matchId: match.id, date: match.date, errorRate: errors / subset.length, observed: true };
    });
    const observed = points.filter((point) => point.observed);
    let trend: SkillSnapshot["trend"] = "unobserved";
    if (observed.length >= 2) {
      const first = observed[0].errorRate ?? 0;
      const prev = observed[observed.length - 2].errorRate ?? 0;
      const last = observed[observed.length - 1].errorRate ?? 0;
      const recent = last - prev;
      const overall = last - first;
      const diff = Math.abs(recent) < 0.03 ? overall : recent;
      trend = Math.abs(diff) < 0.03 ? "flat" : diff < 0 ? "up" : "down";
    }
    return { id: skill.id, label: skill.label, points, trend };
  });
}

export function pairStats(shots: Shot[], focusId: string, matchId: string): { partnerShots: number; partnerWinners: number; partnerErrors: number } {
  const partner = shots.filter((shot) => shot.matchId === matchId && shot.playerId !== focusId && shot.team === 1);
  return {
    partnerShots: partner.length,
    partnerWinners: partner.filter((shot) => shot.outcome === "winner").length,
    partnerErrors: partner.filter((shot) => isError(shot.outcome)).length,
  };
}
