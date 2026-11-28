export type Sport = "padel" | "tennis";
export type UserRole = "player" | "coach";
export type Hand = "right" | "left";
export type CourtSide = "right" | "left";
export type PlayStyle = "singles" | "doubles";
export type Backhand = "one" | "two";
export type Level = "beginner" | "intermediate" | "advanced" | "competition";

export type ShotType =
  | "serve"
  | "return"
  | "forehand"
  | "backhand"
  | "forehand_volley"
  | "backhand_volley"
  | "lob"
  | "smash"
  | "bandeja"
  | "vibora"
  | "bajada"
  | "contrapared"
  | "chiquita"
  | "slice"
  | "drop_shot"
  | "passing"
  | "approach"
  | "unclassified";

export type ShotOutcome = "winner" | "unforced_error" | "forced_error" | "neutral" | "unclassified";

export type ErrorReason =
  | "net"
  | "long"
  | "wide"
  | "direct_wall"
  | "double_fault"
  | "easy_ball"
  | "position"
  | "wrong_shot";

export type ErrorCause = "technique" | "position" | "shot_selection" | "decision";
export type Situation = "defense" | "attack" | "net" | "baseline" | "transition";
export type CourtZone = "baseline" | "transition" | "net" | "wall";
export type PointPhase = "start" | "middle" | "end";
export type AnalysisSource = "example" | "browser_heuristic" | "local_api";
export type BodySide = "forehand" | "backhand" | "overhead" | "unknown";

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface Player {
  id: string;
  name: string;
  sport: Sport;
  hand: Hand;
  side: CourtSide | null;
  level: Level;
  partnerName: string;
  playStyle: PlayStyle | null;
  backhand: Backhand | null;
  ownerId: string;
  example: boolean;
}

export interface UnclassifiedSegment {
  t0: number;
  t1: number;
  note: string;
}

export interface Observation {
  court: boolean;
  ball: boolean;
  pose: boolean;
  position: boolean;
}

export interface Match {
  id: string;
  sport: Sport;
  date: string;
  place: string;
  format: string;
  score: string;
  opponents: string;
  partner: string;
  videoUrl: string;
  status: "draft" | "processing" | "ready" | "error";
  ownerId: string;
  focusPlayerId: string;
  side: CourtSide | null;
  example: boolean;
  /** True only after the user saves the sheet onto their own profile. */
  saved?: boolean;
  source: AnalysisSource;
  durationSec: number;
  confidenceNote: string;
  observation: Observation;
  unclassifiedSegments: UnclassifiedSegment[];
  limitNote: string;
}

export interface Rally {
  id: string;
  matchId: string;
  number: number;
  tStart: number;
  tEnd: number;
  winnerTeam: 1 | 2 | null;
  serverTeam: 1 | 2 | null;
}

export interface Shot {
  id: string;
  rallyId: string;
  matchId: string;
  playerId: string;
  team: 1 | 2;
  tImpact: number;
  type: ShotType;
  bodySide: BodySide;
  impactX: number;
  impactY: number;
  landX: number;
  landY: number;
  impactHeight: number;
  outcome: ShotOutcome;
  errorReason: ErrorReason | null;
  errorCause: ErrorCause | null;
  situation: Situation | null;
  /** Set only when someone marks the zone. Absent means it was not marked. */
  zone?: CourtZone | null;
  /** Set only when someone marks the shot as played under pressure. */
  pressured?: boolean;
  /** Set only when someone marks when in the point the shot happened. */
  phase?: PointPhase | null;
  confidence: number;
  manuallyCorrected: boolean;
  serveNumber: 1 | 2 | null;
  example: boolean;
  note: string;
}

export interface UserClip {
  id: string;
  matchId: string;
  t0: number;
  t1: number;
  selected: boolean;
}

export interface CourtCalibration {
  matchId: string;
  /** Image points, 0–1, in order: near-left, near-right, far-right, far-left. */
  corners: Array<{ x: number; y: number }>;
  player: { x: number; y: number } | null;
}

export interface PhysicalReport {
  matchId: string;
  distanceM: number | null;
  maxSpeedMps: number | null;
  sprints: number | null;
  steps: number | null;
  jumps: number | null;
  lock: number;
  samples: number;
  note: string;
}

export interface IntensityStrip {
  matchId: string;
  points: Array<{ t: number; e: number }>;
}

export interface AnalysisJob {
  id: string;
  matchId: string;
  status: "queued" | "processing" | "ready" | "error" | "interrupted";
  progress: number;
  log: string[];
  error: string;
  updatedAt: string;
}

export interface AppState {
  version: number;
  profile: UserProfile | null;
  players: Player[];
  matches: Match[];
  rallies: Rally[];
  shots: Shot[];
  jobs: AnalysisJob[];
  clips: UserClip[];
  calibrations: CourtCalibration[];
  physical: PhysicalReport[];
  strips: IntensityStrip[];
  apiBaseUrl: string;
}

export const DATA_VERSION = 1;

export const EXAMPLE_OBSERVATION: Observation = {
  court: true,
  ball: true,
  pose: false,
  position: true,
};
