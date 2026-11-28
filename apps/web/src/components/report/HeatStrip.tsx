"use client";

import type { IntensityPoint } from "@/lib/sampleVideo";

export function HeatStrip({
  points,
  duration,
  onSeek,
  onBuild,
  busy,
}: {
  points: IntensityPoint[];
  duration: number;
  onSeek: (time: number) => void;
  onBuild: () => void;
  busy: boolean;
}) {
  const span = Math.max(duration, 0.1);
  return (
    <div className="surface px-3 py-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-mute">Intensità</p>
        <button type="button" className="min-h-11 text-sm font-semibold text-lime" onClick={onBuild} disabled={busy}>
          {busy ? "Calcolo…" : points.length ? "Ricalcola" : "Calcola"}
        </button>
      </div>
      <div className="relative h-10 overflow-hidden rounded-full bg-white/5">
        {points.length === 0 ? (
          <p className="grid h-full place-items-center text-xs text-mute">Movimento nel tempo, dal video.</p>
        ) : (
          points.map((point) => (
            <button
              key={point.t}
              type="button"
              aria-label={`Intensità ${point.t.toFixed(0)}s`}
              onClick={() => onSeek(point.t)}
              className="absolute inset-y-0"
              style={{
                left: `${(point.t / span) * 100}%`,
                width: `${Math.max(0.8, (points.length > 1 ? span / points.length / span : 1) * 100)}%`,
                background: `rgba(214,255,63,${0.12 + point.e * 0.88})`,
              }}
            />
          ))
        )}
      </div>
    </div>
  );
}
