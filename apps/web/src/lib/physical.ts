import { applyHomography } from "./homography";
import type { Pt } from "./homography";

export interface TrackSample {
  t: number;
  x: number | null;
  y: number | null;
  /** Normalized image y of the feet. Smaller means higher in the frame. */
  footV: number;
  motion: number;
  locked: boolean;
}

export interface PhysicalSummary {
  distanceM: number | null;
  maxSpeedMps: number | null;
  sprints: number | null;
  steps: number | null;
  jumps: number | null;
  /** Share of samples where the player blob stayed locked. */
  lock: number;
  samples: number;
  note: string;
}

const SPRINT_MPS = 4;
const SPRINT_RESET_MPS = 3;

export function summarizeTrack(samples: TrackSample[]): PhysicalSummary | null {
  if (samples.length < 8) return null;
  const lock = samples.filter((sample) => sample.locked).length / samples.length;
  const path = samples.filter((sample) => sample.locked && sample.x != null && sample.y != null) as Array<TrackSample & { x: number; y: number }>;
  if (path.length < 8) return null;

  let distance = 0;
  const speeds: Array<{ t: number; v: number }> = [];
  for (let i = 1; i < path.length; i += 1) {
    const dt = path[i].t - path[i - 1].t;
    const step = Math.hypot(path[i].x - path[i - 1].x, path[i].y - path[i - 1].y);
    if (dt < 0.05 || dt > 1.5 || step > 3) continue;
    distance += step;
    speeds.push({ t: path[i].t, v: step / dt });
  }
  if (speeds.length < 4) {
    return empty(lock, samples.length, "Pochi spostamenti validi. Distanza e velocità non calcolate.");
  }

  const smooth = speeds.map((item, index) => {
    const window = speeds.slice(Math.max(0, index - 1), Math.min(speeds.length, index + 2));
    const v = window.reduce((sum, row) => sum + row.v, 0) / window.length;
    return { t: item.t, v };
  });
  const maxSpeed = Math.max(...smooth.map((item) => item.v));

  let sprints = 0;
  let sprinting = false;
  for (const item of smooth) {
    if (!sprinting && item.v >= SPRINT_MPS) {
      sprinting = true;
      sprints += 1;
    } else if (sprinting && item.v < SPRINT_RESET_MPS) sprinting = false;
  }

  let steps: number | null = 0;
  let lastPeak = -1;
  for (let i = 1; i < smooth.length - 1; i += 1) {
    const v = smooth[i].v;
    const peak = v >= smooth[i - 1].v && v >= smooth[i + 1].v && v >= 1.2 && v <= 3.8;
    if (!peak) continue;
    const gap = lastPeak < 0 ? 0.4 : smooth[i].t - smooth[lastPeak].t;
    if (gap >= 0.28 && gap <= 0.75) steps += 1;
    lastPeak = i;
  }
  if (steps < 2) steps = null;

  let jumps: number | null = 0;
  let rising = false;
  for (let i = 1; i < path.length; i += 1) {
    const dt = path[i].t - path[i - 1].t;
    const rise = path[i - 1].footV - path[i].footV;
    const moved = Math.hypot(path[i].x - path[i - 1].x, path[i].y - path[i - 1].y);
    if (!rising && dt > 0 && dt < 0.6 && rise > 0.035 && moved < 0.7) {
      rising = true;
      jumps += 1;
    } else if (rising && rise < 0.01) rising = false;
  }
  if (lock < 0.45) jumps = null;

  const note =
    lock < 0.45
      ? "STIMA fragile: il giocatore si perde spesso. Distanza e scatti sono parziali, i salti non li mostro."
      : "STIMA dal piano del campo (20×10 m). I salti usano solo il movimento verticale in immagine: sono la misura meno affidabile.";

  return {
    distanceM: round1(distance),
    maxSpeedMps: round1(maxSpeed),
    sprints,
    steps,
    jumps,
    lock: Math.round(lock * 100) / 100,
    samples: samples.length,
    note,
  };
}

function empty(lock: number, samples: number, note: string): PhysicalSummary {
  return { distanceM: null, maxSpeedMps: null, sprints: null, steps: null, jumps: null, lock, samples, note };
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

export function projectFeet(h: number[], foot: Pt): Pt | null {
  const point = applyHomography(h, foot);
  if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) return null;
  if (point.x < -2 || point.x > 12 || point.y < -2 || point.y > 22) return null;
  return point;
}
