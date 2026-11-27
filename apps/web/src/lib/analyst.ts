import { buildAdvice, type AdviceItem } from "./advice";
import { shotLabel } from "./i18n";
import { isError, playerShots, summarize, type PlayerSummary } from "./stats";
import type { CourtZone, Match, PointPhase, Rally, Shot, ShotOutcome, ShotType, Situation } from "./types";

export interface TypeRow {
  id: string;
  label: string;
  errors: number;
  winners: number;
  total: number;
}

export interface ZoneRow {
  zone: CourtZone;
  label: string;
  errors: number;
  winners: number;
  total: number;
}

const TYPE_ROWS: Array<{ id: string; label: string; types: ShotType[] }> = [
  { id: "forehand", label: "Dritto", types: ["forehand"] },
  { id: "backhand", label: "Rovescio", types: ["backhand"] },
  { id: "volley", label: "Volée", types: ["forehand_volley", "backhand_volley"] },
  { id: "bandeja", label: "Bandeja", types: ["bandeja"] },
  { id: "vibora", label: "Víbora", types: ["vibora"] },
  { id: "smash", label: "Smash", types: ["smash"] },
  { id: "lob", label: "Pallonetto", types: ["lob"] },
  { id: "wall", label: "Uscita", types: ["bajada", "contrapared"] },
  { id: "serve", label: "Servizio", types: ["serve"] },
  { id: "return", label: "Risposta", types: ["return"] },
];

export const ZONE_ORDER: Array<{ zone: CourtZone; label: string }> = [
  { zone: "baseline", label: "Fondo" },
  { zone: "transition", label: "Mezzo" },
  { zone: "net", label: "Rete" },
  { zone: "wall", label: "Parete" },
];

const ZONE_SPOT: Record<CourtZone, { x: number; y: number }> = {
  baseline: { x: 0.5, y: 0.9 },
  transition: { x: 0.5, y: 0.76 },
  net: { x: 0.5, y: 0.6 },
  wall: { x: 0.08, y: 0.84 },
};

export function shotName(shot: Shot): string {
  if ((shot.type === "forehand_volley" || shot.type === "backhand_volley") && shot.bodySide === "unknown") return "Volée";
  return shotLabel[shot.type];
}

/** Zone only when it was marked, or when a classified shot already carries a zone label. */
export function shotZone(shot: Shot): CourtZone | null {
  if (shot.zone) return shot.zone;
  if (shot.outcome === "unclassified" || shot.type === "unclassified") return null;
  if (shot.situation === "net" || shot.situation === "baseline" || shot.situation === "transition") return shot.situation;
  if (shot.type === "bajada" || shot.type === "contrapared") return "wall";
  if (shot.type === "forehand_volley" || shot.type === "backhand_volley" || shot.type === "bandeja" || shot.type === "vibora" || shot.type === "smash") return "net";
  if (shot.type === "forehand" || shot.type === "backhand" || shot.type === "serve" || shot.type === "return" || shot.type === "lob" || shot.type === "slice" || shot.type === "chiquita") {
    return "baseline";
  }
  return null;
}

export function typeBoard(shots: Shot[]): TypeRow[] {
  return TYPE_ROWS.map((row) => {
    const mine = shots.filter((shot) => row.types.includes(shot.type) && shot.outcome !== "unclassified");
    return {
      id: row.id,
      label: row.label,
      errors: mine.filter((shot) => isError(shot.outcome)).length,
      winners: mine.filter((shot) => shot.outcome === "winner").length,
      total: mine.length,
    };
  }).filter((row) => row.errors + row.winners > 0);
}

export function zoneBoard(shots: Shot[]): ZoneRow[] {
  return ZONE_ORDER.map((row) => {
    const mine = shots.filter((shot) => shotZone(shot) === row.zone && shot.outcome !== "unclassified");
    return {
      zone: row.zone,
      label: row.label,
      errors: mine.filter((shot) => isError(shot.outcome)).length,
      winners: mine.filter((shot) => shot.outcome === "winner").length,
      total: mine.length,
    };
  }).filter((row) => row.total > 0);
}

export interface SidePoints {
  won: number;
  played: number;
  pct: number | null;
}

function sidePct(bucket: { won: number; played: number }): SidePoints {
  return { ...bucket, pct: bucket.played >= 3 ? bucket.won / bucket.played : null };
}

/** Points closed from the net or the baseline. A side needs 3 decided points before a percentage. */
export function sidePoints(shots: Shot[], rallies: Rally[], playerId: string): { net: SidePoints; baseline: SidePoints } {
  const net = { won: 0, played: 0 };
  const baseline = { won: 0, played: 0 };
  for (const rally of rallies) {
    if (rally.winnerTeam !== 1 && rally.winnerTeam !== 2) continue;
    const mine = shots
      .filter((shot) => shot.rallyId === rally.id && shot.playerId === playerId && shot.outcome !== "unclassified" && shot.type !== "unclassified")
      .sort((a, b) => a.tImpact - b.tImpact);
    const last = mine[mine.length - 1];
    if (!last) continue;
    const zone = shotZone(last);
    const bucket = zone === "net" ? net : zone === "baseline" ? baseline : null;
    if (!bucket) continue;
    bucket.played += 1;
    if (rally.winnerTeam === 1) bucket.won += 1;
  }
  return { net: sidePct(net), baseline: sidePct(baseline) };
}

export interface PhaseErrors {
  start: number;
  middle: number;
  end: number;
  observed: boolean;
}

/** Errors by moment in the point. A lone shot is not called the start or the end. */
export function phaseErrors(shots: Shot[]): PhaseErrors {
  const groups = new Map<string, Shot[]>();
  for (const shot of shots) {
    if (shot.outcome === "unclassified" || shot.type === "unclassified") continue;
    groups.set(shot.rallyId, [...(groups.get(shot.rallyId) ?? []), shot]);
  }
  let start = 0;
  let middle = 0;
  let end = 0;
  let seen = 0;
  for (const list of groups.values()) {
    const ordered = [...list].sort((a, b) => a.tImpact - b.tImpact);
    ordered.forEach((shot, index) => {
      const phase: PointPhase | null = shot.phase ?? (ordered.length >= 2 ? (index === 0 ? "start" : index === ordered.length - 1 ? "end" : "middle") : null);
      if (!phase) return;
      seen += 1;
      if (!isError(shot.outcome)) return;
      if (phase === "start") start += 1;
      else if (phase === "end") end += 1;
      else middle += 1;
    });
  }
  return { start, middle, end, observed: seen >= 4 };
}

/** Errors marked under pressure. Zero is not the same as "never marked". */
export function pressureErrors(shots: Shot[]): { errors: number; tagged: boolean } {
  const tagged = shots.some((shot) => shot.pressured === true);
  return {
    tagged,
    errors: shots.filter((shot) => shot.pressured === true && isError(shot.outcome)).length,
  };
}

export function topPriorities(shots: Shot[], playerId: string): AdviceItem[] {
  const advice = buildAdvice(shots, playerId);
  return [advice.primary, ...advice.secondary].filter((item): item is AdviceItem => item != null).slice(0, 3);
}

export function previousSheet(matches: Match[], current: Match): Match | null {
  const earlier = matches
    .filter((match) => match.id !== current.id && match.focusPlayerId === current.focusPlayerId)
    .filter((match) => match.date < current.date || (match.date === current.date && match.id < current.id))
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  return earlier[earlier.length - 1] ?? null;
}

export function sheetDelta(current: PlayerSummary, previous: PlayerSummary): { errors: number; winners: number; unforced: number } {
  return {
    errors: current.errors - previous.errors,
    winners: current.winners - previous.winners,
    unforced: current.unforced - previous.unforced,
  };
}

export function summarizeMatch(shots: Shot[], playerId: string, matchId: string): PlayerSummary {
  return summarize(playerShots(shots, playerId, matchId));
}

function situationFor(zone: CourtZone): Situation | null {
  if (zone === "wall") return null;
  return zone;
}

export interface TagChoice {
  id: string;
  matchId: string;
  rallyId: string;
  playerId: string;
  time: number;
  example: boolean;
  type: ShotType;
  outcome: ShotOutcome;
  zone: CourtZone;
  pressured: boolean;
  phase: PointPhase | null;
  bodySide?: Shot["bodySide"];
}

/** A shot created from the buttons. No error reason is guessed. */
export function buildTaggedShot(choice: TagChoice): Shot {
  const spot = ZONE_SPOT[choice.zone];
  return {
    id: choice.id,
    rallyId: choice.rallyId,
    matchId: choice.matchId,
    playerId: choice.playerId,
    team: 1,
    tImpact: choice.time,
    type: choice.type,
    bodySide: choice.bodySide ?? (choice.type === "forehand_volley" || choice.type === "backhand_volley" ? "unknown" : choice.type.includes("backhand") ? "backhand" : choice.type === "forehand" || choice.type === "bandeja" ? "forehand" : "unknown"),
    impactX: spot.x,
    impactY: spot.y,
    landX: spot.x,
    landY: spot.y,
    impactHeight: choice.zone === "net" ? 1.1 : 0.8,
    outcome: choice.outcome,
    errorReason: null,
    errorCause: null,
    situation: situationFor(choice.zone),
    zone: choice.zone,
    pressured: choice.pressured,
    phase: choice.phase,
    confidence: 1,
    manuallyCorrected: true,
    serveNumber: choice.type === "serve" ? 1 : null,
    example: choice.example,
    note: "",
  };
}

export function placeZone(shot: Shot, zone: CourtZone): Shot {
  const spot = ZONE_SPOT[zone];
  return {
    ...shot,
    zone,
    situation: situationFor(zone),
    impactX: spot.x,
    impactY: spot.y,
    landX: spot.x,
    landY: spot.y,
  };
}
