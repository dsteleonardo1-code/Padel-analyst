import type { ErrorCause, ErrorReason, ShotOutcome, ShotType, Sport } from "./types";

export interface OutcomeInput {
  sport: Sport;
  type: ShotType;
  landX: number;
  landY: number;
  hitWallBeforeBounce?: boolean;
  lastOfRally: boolean;
  opponentWinnerNext: boolean;
  pressured: boolean;
  serveNumber?: 1 | 2 | null;
}

export interface OutcomeResult {
  outcome: ShotOutcome;
  reason: ErrorReason | null;
  cause: ErrorCause | null;
  confidence: number;
  rule: string;
}

function causeFor(reason: ErrorReason | null, pressured: boolean): ErrorCause | null {
  if (!reason) return null;
  if (reason === "position") return "position";
  if (reason === "easy_ball" || reason === "wrong_shot") return reason === "wrong_shot" ? "shot_selection" : "decision";
  if (pressured) return "position";
  return "technique";
}

/** Heuristic outcome from court geometry. Confidence is an estimate, not a measured accuracy. */
export function judgeOutcome(input: OutcomeInput): OutcomeResult {
  const { landX, landY, type } = input;
  if (type === "unclassified" || !Number.isFinite(landX) || !Number.isFinite(landY)) {
    return {
      outcome: "unclassified",
      reason: null,
      cause: null,
      confidence: 0.2,
      rule: "missing_geometry",
    };
  }

  const outLong = landY > 1.02 || landY < -0.02;
  const outWide = landX < -0.02 || landX > 1.02;
  const atNet = landY >= 0.47 && landY <= 0.53;
  const missed = outLong || outWide || atNet || Boolean(input.hitWallBeforeBounce);

  if (input.serveNumber === 2 && missed) {
    return {
      outcome: input.pressured ? "forced_error" : "unforced_error",
      reason: "double_fault",
      cause: "technique",
      confidence: 0.58,
      rule: "second_serve_miss",
    };
  }

  if (input.sport === "padel" && input.hitWallBeforeBounce) {
    return {
      outcome: input.pressured ? "forced_error" : "unforced_error",
      reason: "direct_wall",
      cause: causeFor("direct_wall", input.pressured),
      confidence: input.pressured ? 0.42 : 0.56,
      rule: "wall_before_bounce",
    };
  }

  if (atNet) {
    return {
      outcome: input.pressured ? "forced_error" : "unforced_error",
      reason: "net",
      cause: causeFor("net", input.pressured),
      confidence: input.pressured ? 0.4 : 0.6,
      rule: "net",
    };
  }

  if (outLong) {
    return {
      outcome: input.pressured ? "forced_error" : "unforced_error",
      reason: "long",
      cause: causeFor("long", input.pressured),
      confidence: input.pressured ? 0.4 : 0.6,
      rule: "long",
    };
  }

  if (outWide) {
    return {
      outcome: input.pressured ? "forced_error" : "unforced_error",
      reason: "wide",
      cause: causeFor("wide", input.pressured),
      confidence: input.pressured ? 0.4 : 0.6,
      rule: "wide",
    };
  }

  const inside = landX >= 0 && landX <= 1 && landY >= 0 && landY <= 1;
  if (inside && input.opponentWinnerNext && landY < 0.64) {
    return {
      outcome: "unforced_error",
      reason: "easy_ball",
      cause: "decision",
      confidence: 0.36,
      rule: "short_ball_then_opponent_winner",
    };
  }

  if (inside && input.lastOfRally && !input.opponentWinnerNext) {
    return {
      outcome: "winner",
      reason: null,
      cause: null,
      confidence: 0.48,
      rule: "no_return",
    };
  }

  return {
    outcome: "neutral",
    reason: null,
    cause: null,
    confidence: 0.34,
    rule: "in_play",
  };
}
