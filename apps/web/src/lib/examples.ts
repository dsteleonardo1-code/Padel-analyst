import { uid } from "./format";
import { EXAMPLE_OBSERVATION } from "./types";
import type {
  BodySide,
  CourtSide,
  ErrorCause,
  ErrorReason,
  Match,
  Player,
  Rally,
  Shot,
  ShotOutcome,
  ShotType,
  Sport,
} from "./types";

const OUTCOME: Record<string, ShotOutcome> = {
  W: "winner",
  U: "unforced_error",
  F: "forced_error",
  N: "neutral",
  X: "unclassified",
};

interface Parsed {
  who: "me" | "pa";
  type: ShotType;
  outcome: ShotOutcome;
  reason: ErrorReason | null;
  cause: ErrorCause | null;
  serveNumber: 1 | 2 | null;
}

function defaultCause(reason: ErrorReason): ErrorCause {
  if (reason === "position") return "position";
  if (reason === "wrong_shot") return "shot_selection";
  if (reason === "easy_ball") return "decision";
  return "technique";
}

function parseToken(token: string): Parsed {
  const parts = token.trim().split(/\s+/);
  if (parts.length < 3) throw new Error(`Token incompleto: ${token}`);
  const who = parts[0] === "pa" ? "pa" : "me";
  let typeName = parts[1];
  let serveNumber: 1 | 2 | null = null;
  if (typeName.includes(":")) {
    const [name, number] = typeName.split(":");
    typeName = name;
    serveNumber = number === "2" ? 2 : 1;
  }
  const type = (typeName === "x" ? "unclassified" : typeName) as ShotType;
  const outcome = OUTCOME[parts[2]];
  if (!outcome) throw new Error(`Esito sconosciuto: ${token}`);
  const error = outcome === "unforced_error" || outcome === "forced_error";
  const reason = error ? (parts[3] as ErrorReason) : null;
  if (error && !reason) throw new Error(`Manca il motivo: ${token}`);
  const cause = error ? ((parts[4] as ErrorCause) ?? defaultCause(reason as ErrorReason)) : null;
  return { who, type, outcome, reason, cause, serveNumber };
}

function bodySide(type: ShotType, sport: Sport): BodySide {
  if (type === "unclassified") return "unknown";
  if (type === "serve") return sport === "padel" ? "forehand" : "overhead";
  if (type === "smash" || type === "bandeja" || type === "vibora") return "overhead";
  if (type === "backhand" || type === "backhand_volley" || type === "slice") return "backhand";
  if (type === "forehand" || type === "forehand_volley" || type === "passing" || type === "approach") return "forehand";
  return "unknown";
}

function situationOf(type: ShotType, reason: ErrorReason | null): Shot["situation"] {
  if (reason === "position") return "baseline";
  if (type.includes("volley") || type === "approach") return "net";
  if (type === "lob" || type === "return" || type === "slice" || type === "chiquita") return "defense";
  if (type === "bandeja" || type === "smash" || type === "vibora") return "attack";
  return "baseline";
}

function place(
  type: ShotType,
  outcome: ShotOutcome,
  reason: ErrorReason | null,
  index: number,
  side: CourtSide | null,
  who: "me" | "pa",
) {
  const focusRight = side !== "left";
  const onRight = who === "me" ? focusRight : !focusRight;
  const jitter = ((index * 17) % 5) - 2;
  let impactX = (onRight ? 0.72 : 0.28) + jitter * 0.018;
  let impactY = 0.2;
  if (type.includes("volley") || type === "approach") impactY = 0.42;
  else if (type === "bandeja" || type === "vibora" || type === "smash") impactY = 0.33;
  else if (type === "return" || type === "lob") impactY = 0.16;
  if (reason === "position") impactX = 0.5 + jitter * 0.01;
  impactX = Math.min(0.9, Math.max(0.1, impactX));

  let landX = 0.5 + jitter * 0.05;
  let landY = 0.74;
  if (reason === "net") {
    landX = 0.5 + jitter * 0.02;
    landY = 0.5;
  } else if (reason === "long" || reason === "double_fault") {
    landX = 0.56;
    landY = 1.07;
  } else if (reason === "wide") {
    landX = index % 2 === 0 ? 1.09 : -0.09;
    landY = 0.76;
  } else if (reason === "direct_wall") {
    landX = 0.52;
    landY = 1.04;
  } else if (reason === "easy_ball" || reason === "position" || reason === "wrong_shot") {
    landX = 0.48 + jitter * 0.03;
    landY = 0.58;
  } else if (outcome === "winner") {
    landX = onRight ? 0.18 : 0.82;
    landY = 0.86;
  } else if (outcome === "unclassified") {
    landX = impactX;
    landY = impactY;
  }

  const impactHeight =
    type === "smash" ? 2.05 : type === "bandeja" || type === "vibora" ? 1.65 : type.includes("volley") ? 1.2 : 0.7;
  return { impactX, impactY, landX, landY, impactHeight };
}

function confidenceFor(outcome: ShotOutcome, index: number): number {
  if (outcome === "unclassified") return 0.22;
  const base = outcome === "winner" ? 0.78 : outcome === "neutral" ? 0.64 : 0.73;
  return Math.min(0.9, Math.round((base + (index % 3) * 0.03) * 100) / 100);
}

export interface MatchScript {
  id: string;
  sport: Sport;
  date: string;
  place: string;
  format: string;
  score: string;
  opponents: string;
  partner: string;
  focusId: string;
  partnerId: string | null;
  side: CourtSide | null;
  rallies: string[][];
}

function winnerTeam(shots: Shot[]): 1 | 2 | null {
  const last = shots[shots.length - 1];
  if (!last) return null;
  if (last.outcome === "winner") return last.team;
  if (last.outcome === "unforced_error" || last.outcome === "forced_error") return last.team === 1 ? 2 : 1;
  return null;
}

export function materialize(script: MatchScript): { match: Match; rallies: Rally[]; shots: Shot[] } {
  const rallies: Rally[] = [];
  const shots: Shot[] = [];
  let clock = 12;
  script.rallies.forEach((tokens, rallyIndex) => {
    const rallyId = `${script.id}-r${rallyIndex + 1}`;
    const tStart = clock;
    const rallyShots: Shot[] = [];
    tokens.forEach((token) => {
      const parsed = parseToken(token);
      const playerId = parsed.who === "pa" ? script.partnerId : script.focusId;
      if (!playerId) return;
      const spot = place(parsed.type, parsed.outcome, parsed.reason, shots.length + rallyShots.length, script.side, parsed.who);
      const shot: Shot = {
        id: `${script.id}-s${shots.length + rallyShots.length + 1}`,
        rallyId,
        matchId: script.id,
        playerId,
        team: 1,
        tImpact: Math.round(clock * 10) / 10,
        type: parsed.type,
        bodySide: bodySide(parsed.type, script.sport),
        ...spot,
        outcome: parsed.outcome,
        errorReason: parsed.reason,
        errorCause: parsed.cause,
        situation: situationOf(parsed.type, parsed.reason),
        confidence: confidenceFor(parsed.outcome, shots.length),
        manuallyCorrected: false,
        serveNumber: parsed.type === "serve" ? parsed.serveNumber ?? 1 : null,
        example: true,
        note: parsed.outcome === "unclassified" ? "Segmento lasciato non classificato, di proposito." : "",
      };
      rallyShots.push(shot);
      clock += 2.3;
    });
    const tEnd = clock;
    const first = rallyShots[0];
    rallies.push({
      id: rallyId,
      matchId: script.id,
      number: rallyIndex + 1,
      tStart,
      tEnd,
      winnerTeam: winnerTeam(rallyShots),
      serverTeam: first?.type === "serve" ? 1 : 2,
    });
    shots.push(...rallyShots);
    clock += 14 + (rallyIndex % 4) * 2;
  });

  const match: Match = {
    id: script.id,
    sport: script.sport,
    date: script.date,
    place: script.place,
    format: script.format,
    score: script.score,
    opponents: script.opponents,
    partner: script.partner,
    videoUrl: "",
    status: "ready",
    ownerId: "example",
    focusPlayerId: script.focusId,
    side: script.side,
    example: true,
    source: "example",
    durationSec: Math.round(clock),
    confidenceNote: "Dati di esempio illustrativi: le confidenze non sono misurate su un video reale.",
    observation: EXAMPLE_OBSERVATION,
    unclassifiedSegments: shots
      .filter((shot) => shot.type === "unclassified" || shot.outcome === "unclassified")
      .map((shot) => ({
        t0: Math.max(0, shot.tImpact - 1),
        t1: shot.tImpact + 1.2,
        note: "Tratto non classificato: resta in timeline, non viene scartato.",
      })),
    limitNote: "",
  };
  return { match, rallies, shots };
}

const luca1: MatchScript = {
  id: "m-luca-1",
  sport: "padel",
  date: "2026-11-05",
  place: "Circolo Padel Navigli, Milano",
  format: "Meglio di 3 set",
  score: "4-6 6-7",
  opponents: "Rossi / Bianchi",
  partner: "Giulia Conti",
  focusId: "p-luca",
  partnerId: "p-giulia",
  side: "right",
  rallies: [
    ["me serve W"],
    ["me serve N", "me bandeja U net technique", "pa forehand N"],
    ["me bandeja U net technique"],
    ["me forehand N", "me bandeja N", "me backhand U wide technique"],
    ["me bandeja U net technique", "me lob N"],
    ["me forehand W"],
    ["me serve N", "me forehand_volley N", "me bandeja U net technique"],
    ["me backhand N", "me bandeja N", "pa smash W"],
    ["me bandeja U long technique"],
    ["me forehand N", "me backhand U net technique", "me lob U easy_ball decision"],
    ["me serve W", "pa forehand_volley N"],
    ["me vibora U net technique", "me forehand N"],
    ["me bandeja N", "me forehand_volley U easy_ball decision"],
    ["me backhand N", "me forehand F position position"],
    ["me serve U wide technique"],
    ["me bandeja U net technique"],
    ["me smash W", "me backhand N"],
    ["me bandeja N", "me bajada N"],
    ["me forehand N", "me bandeja U net technique"],
    ["me x X"],
    ["me backhand U wide technique", "me lob N"],
    ["me serve N", "me forehand_volley W"],
    ["me bandeja U net technique", "pa backhand W"],
    ["me bajada N", "me vibora N"],
    ["me x X"],
    ["me forehand N", "me backhand N", "me bandeja N"],
    ["me bandeja W"],
  ],
};

const luca2: MatchScript = {
  id: "m-luca-2",
  sport: "padel",
  date: "2026-11-18",
  place: "Circolo Padel Navigli, Milano",
  format: "Meglio di 3 set",
  score: "6-3 6-4",
  opponents: "Greco / Sala",
  partner: "Giulia Conti",
  focusId: "p-luca",
  partnerId: "p-giulia",
  side: "right",
  rallies: [
    ["me serve W"],
    ["me serve N", "me forehand_volley W", "pa bandeja N"],
    ["me bandeja N", "me forehand W"],
    ["me bajada U net technique"],
    ["me forehand_volley W", "me backhand N"],
    ["me bandeja W"],
    ["me serve N", "me forehand N", "me backhand_volley W"],
    ["me bandeja N", "me smash W"],
    ["me bajada U position position", "me lob N"],
    ["me forehand N", "me bandeja U net technique"],
    ["me forehand_volley N", "me vibora W"],
    ["me serve W", "pa smash N"],
    ["me backhand W", "me bandeja N"],
    ["me bajada U net technique"],
    ["me forehand_volley W", "me forehand N"],
    ["me bandeja N", "me backhand N"],
    ["me contrapared U position position"],
    ["me serve N", "me smash N", "me forehand W"],
    ["me bandeja W", "pa forehand_volley W"],
    ["me bajada N", "me lob U direct_wall technique"],
    ["me backhand_volley N", "me forehand_volley W"],
    ["me x X"],
    ["me bandeja N", "me vibora N"],
    ["me serve N", "me backhand N", "me bandeja N"],
    ["me contrapared U position position"],
    ["me forehand N", "me bajada U net technique"],
  ],
};

const luca3: MatchScript = {
  id: "m-luca-3",
  sport: "padel",
  date: "2026-11-26",
  place: "Padel Club Torino",
  format: "Meglio di 3 set",
  score: "6-7 4-6",
  opponents: "Ferri / Colombo",
  partner: "Giulia Conti",
  focusId: "p-luca",
  partnerId: "p-giulia",
  side: "right",
  rallies: [
    ["me serve W"],
    ["me serve N", "me forehand U position position"],
    ["me return U position position", "me backhand N"],
    ["me bandeja N", "me forehand_volley W"],
    ["me forehand U position position"],
    ["me backhand U position position", "me lob N"],
    ["me serve:2 U double_fault technique"],
    ["me bandeja W"],
    ["me return N", "me forehand N", "me backhand U position position"],
    ["me forehand_volley N", "me bandeja U net technique"],
    ["me serve W", "pa forehand N"],
    ["me chiquita U easy_ball decision"],
    ["me forehand W", "me backhand N"],
    ["me return U position position"],
    ["me bandeja N", "me smash N"],
    ["me lob U easy_ball shot_selection"],
    ["me forehand U position position", "me bajada N"],
    ["me serve N", "me forehand_volley W"],
    ["me x X"],
    ["me backhand U position position"],
    ["me bandeja N", "me vibora N", "pa backhand W"],
    ["me forehand N", "me return N"],
    ["me x X"],
    ["me bandeja W", "me lob N"],
    ["me bajada U net technique"],
    ["me serve W"],
  ],
};

const marco1: MatchScript = {
  id: "m-marco-1",
  sport: "tennis",
  date: "2026-11-08",
  place: "Circolo Tennis Sempione, Milano",
  format: "Meglio di 3 set, singolo",
  score: "3-6 4-6",
  opponents: "Andrea Villa",
  partner: "",
  focusId: "p-marco",
  partnerId: null,
  side: null,
  rallies: [
    ["me serve:1 W"],
    ["me serve:1 U long technique", "me serve:2 N", "me forehand N"],
    ["me serve:1 N", "me forehand W"],
    ["me serve:1 U wide technique", "me serve:2 U double_fault technique"],
    ["me return N", "me backhand U long technique"],
    ["me serve:1 W"],
    ["me slice U net technique", "me forehand N"],
    ["me serve:1 N", "me approach N", "me forehand_volley U easy_ball decision"],
    ["me return U net technique"],
    ["me serve:1 N", "me forehand N", "me backhand N"],
    ["me drop_shot U net technique"],
    ["me serve:1 U net technique", "me serve:2 N"],
    ["me forehand W", "me slice N"],
    ["me return N", "me passing W"],
    ["me serve:1 N", "me forehand U long technique"],
    ["me x X"],
    ["me serve:1 W"],
    ["me backhand N", "me slice U wide technique"],
    ["me serve:1 N", "me drop_shot N", "me forehand_volley N"],
    ["me return F position position"],
  ],
};

const marco2: MatchScript = {
  id: "m-marco-2",
  sport: "tennis",
  date: "2026-11-22",
  place: "Circolo Tennis Sempione, Milano",
  format: "Meglio di 3 set, singolo",
  score: "6-4 7-5",
  opponents: "Luca Serra",
  partner: "",
  focusId: "p-marco",
  partnerId: null,
  side: null,
  rallies: [
    ["me serve:1 W"],
    ["me serve:1 W"],
    ["me serve:1 N", "me forehand W"],
    ["me serve:1 N", "me forehand_volley W"],
    ["me return W"],
    ["me serve:1 N", "me approach W", "me slice N"],
    ["me forehand N", "me passing N"],
    ["me serve:1 U wide technique", "me serve:2 N", "me forehand N"],
    ["me return N", "me backhand W"],
    ["me serve:1 W"],
    ["me serve:1 N", "me drop_shot N"],
    ["me return N", "me passing W"],
    ["me serve:1 N", "me forehand N", "me smash W"],
    ["me slice N", "me forehand_volley N"],
    ["me serve:1 W"],
    ["me return U net technique"],
    ["me serve:1 N", "me approach N", "me forehand W"],
    ["me x X"],
    ["me serve:1 N", "me backhand N"],
    ["me serve:1 W"],
  ],
};

export const examplePlayers: Player[] = [
  {
    id: "p-luca",
    name: "Luca Ferraro",
    sport: "padel",
    hand: "right",
    side: "right",
    level: "intermediate",
    partnerName: "Giulia Conti",
    playStyle: "doubles",
    backhand: null,
    ownerId: "example",
    example: true,
  },
  {
    id: "p-giulia",
    name: "Giulia Conti",
    sport: "padel",
    hand: "right",
    side: "left",
    level: "intermediate",
    partnerName: "Luca Ferraro",
    playStyle: "doubles",
    backhand: null,
    ownerId: "example",
    example: true,
  },
  {
    id: "p-marco",
    name: "Marco Bellini",
    sport: "tennis",
    hand: "right",
    side: null,
    level: "advanced",
    partnerName: "",
    playStyle: "singles",
    backhand: "two",
    ownerId: "example",
    example: true,
  },
];

export function sheetFromExample(sport: Sport, label: string, side: CourtSide | null): {
  player: Player;
  match: Match;
  rallies: Rally[];
  shots: Shot[];
} {
  const data = buildExampleData();
  const sourceId = sport === "padel" ? "m-luca-3" : "m-marco-2";
  const source = data.matches.find((match) => match.id === sourceId);
  if (!source) throw new Error("Esempio mancante");
  const matchId = uid("m");
  const playerId = uid("p");
  const rallyIds = new Map<string, string>();
  const rallies = data.rallies
    .filter((rally) => rally.matchId === sourceId)
    .map((rally) => {
      const id = `${matchId}-r${rally.number}`;
      rallyIds.set(rally.id, id);
      return { ...rally, id, matchId };
    });
  const shots = data.shots
    .filter((shot) => shot.matchId === sourceId && shot.playerId === source.focusPlayerId)
    .map((shot) => ({
      ...shot,
      id: `${matchId}-${shot.id}`,
      matchId,
      rallyId: rallyIds.get(shot.rallyId) ?? shot.rallyId,
      playerId,
      example: true,
    }));
  const player: Player = {
    id: playerId,
    name: label.trim() || "Giocatore indicato",
    sport,
    hand: "right",
    side,
    level: "intermediate",
    partnerName: "",
    playStyle: sport === "padel" ? "doubles" : "singles",
    backhand: sport === "tennis" ? "two" : null,
    ownerId: "local",
    example: true,
  };
  const match: Match = {
    ...source,
    id: matchId,
    place: "Video di esempio",
    opponents: "",
    partner: "",
    focusPlayerId: playerId,
    side,
    ownerId: "local",
    example: true,
    saved: false,
    limitNote: label.trim(),
    confidenceNote: "ESEMPIO. Scheda sul video gratuito, non è una tua partita.",
  };
  return { player, match, rallies, shots };
}

export function buildExampleData(): { players: Player[]; matches: Match[]; rallies: Rally[]; shots: Shot[] } {
  const built = [luca1, luca2, luca3, marco1, marco2].map(materialize);
  return {
    players: examplePlayers,
    matches: built.map((item) => item.match),
    rallies: built.flatMap((item) => item.rallies),
    shots: built.flatMap((item) => item.shots),
  };
}
