export interface WaveBar {
  t: number;
  /** 0–1. Zero when the bucket has no measurement and no tagged shot. */
  e: number;
  known: boolean;
}

/** Buckets the match into bars. Untagged, unmeasured time stays unknown. */
export function waveformBars(
  points: Array<{ t: number; e: number }>,
  shots: Array<{ tImpact: number; type: string; outcome: string }>,
  duration: number,
  count: number,
): WaveBar[] {
  const bars = Math.max(8, count);
  const span = Number.isFinite(duration) && duration > 0.4 ? duration : 1;
  const row: WaveBar[] = Array.from({ length: bars }, (_, index) => ({
    t: ((index + 0.5) / bars) * span,
    e: 0,
    known: false,
  }));
  const slot = (time: number) => Math.min(bars - 1, Math.max(0, Math.floor((time / span) * bars)));
  for (const point of points) {
    if (!Number.isFinite(point.t) || point.t < 0 || point.t > span + 0.05) continue;
    const bar = row[slot(point.t)];
    const energy = Math.max(0, Math.min(1, point.e));
    bar.e = Math.max(bar.e, energy);
    bar.known = true;
  }
  for (const shot of shots) {
    const marked = shot.type !== "unclassified" || shot.outcome !== "unclassified";
    if (!marked || !Number.isFinite(shot.tImpact) || shot.tImpact < 0 || shot.tImpact > span + 0.05) continue;
    const bar = row[slot(shot.tImpact)];
    bar.e = Math.max(bar.e, 0.62);
    bar.known = true;
  }
  return row;
}
