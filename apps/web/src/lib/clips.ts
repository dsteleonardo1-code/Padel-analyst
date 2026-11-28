import type { Shot } from "./types";

export const CLIP_BEFORE = 3;
export const CLIP_AFTER = 2;

export function clipWindow(impact: number, duration: number): { start: number; end: number } {
  const length = Number.isFinite(duration) && duration > 0.4 ? duration : Math.max(impact + CLIP_AFTER, 1);
  const start = Math.max(0, impact - CLIP_BEFORE);
  const end = Math.min(length, Math.max(start + 0.35, impact + CLIP_AFTER));
  return { start, end: Math.max(end, Math.min(length, start + 0.35)) };
}

/** Spread example clips across the short demo so each card opens a different moment. */
export function exampleImpact(index: number, total: number, duration: number): number {
  const length = Math.max(duration, 1);
  if (total <= 1) return Math.min(length / 2, length - 0.2);
  const margin = Math.min(CLIP_BEFORE, length / 5);
  return margin + (index / (total - 1)) * Math.max(0, length - margin * 2);
}

/** Errors open the whole rally. Winners stay on the short window around the impact. */
export function playSpan(
  shot: { outcome: string; tImpact: number; real: boolean },
  rally: { tStart: number; tEnd: number } | null,
  duration: number,
): { start: number; end: number } {
  const error = shot.outcome === "unforced_error" || shot.outcome === "forced_error";
  if (shot.real && error && rally && rally.tEnd - rally.tStart >= 0.4) {
    return {
      start: Math.max(0, rally.tStart),
      end: Math.min(duration || rally.tEnd, rally.tEnd),
    };
  }
  return clipWindow(shot.tImpact, duration || shot.tImpact + CLIP_AFTER);
}

export function isHighlight(shot: Shot): boolean {
  return shot.outcome === "unforced_error" || shot.outcome === "forced_error" || shot.outcome === "winner";
}
