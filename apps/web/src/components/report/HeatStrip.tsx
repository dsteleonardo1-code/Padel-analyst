"use client";

import { useMemo, useState } from "react";
import { waveformBars } from "@/lib/intensity";
import type { IntensityPoint } from "@/lib/sampleVideo";
import type { Shot } from "@/lib/types";

export function HeatStrip({
  points,
  shots,
  duration,
  time,
  onSeek,
  onBuild,
  busy,
}: {
  points: IntensityPoint[];
  shots: Shot[];
  duration: number;
  time: number;
  onSeek: (time: number) => void;
  onBuild: () => void;
  busy: boolean;
}) {
  const [wide, setWide] = useState(false);
  const count = wide ? 64 : 36;
  const bars = useMemo(
    () => waveformBars(points, shots, duration, count),
    [points, shots, duration, count],
  );
  const span = Math.max(duration, 0.1);

  const wave = (
    <div className={`flex items-end gap-[3px] ${wide ? "h-44" : "h-24"}`} aria-hidden={false}>
      {bars.map((bar, index) => {
        const played = time >= bar.t - span / count / 2;
        const current = Math.abs(time - bar.t) <= span / count;
        const height = bar.known ? 48 + bar.e * 52 : 32;
        return (
          <button
            key={`${bar.t}-${index}`}
            type="button"
            aria-label={bar.known ? `Intensità ${Math.round(bar.t)} secondi` : `Nessun dato a ${Math.round(bar.t)} secondi`}
            onClick={() => onSeek(Math.max(0, bar.t - 0.2))}
            className="min-w-0 flex-1 rounded-full transition-all duration-200"
            style={{
              height: `${height}%`,
              background: bar.known
                ? played
                  ? "#d6ff3f"
                  : "rgba(214,255,63,0.38)"
                : played
                  ? "rgba(244,239,228,0.42)"
                  : "rgba(244,239,228,0.22)",
              boxShadow: current ? "0 0 14px rgba(214,255,63,0.85)" : undefined,
              transform: current ? "scaleY(1.08)" : undefined,
              transformOrigin: "bottom",
            }}
          />
        );
      })}
    </div>
  );

  const tools = (
    <div className="mb-2 flex items-center justify-between gap-2">
      <button type="button" className="min-h-11 rounded-full bg-white/10 px-4 text-sm font-semibold text-lime" onClick={() => setWide((value) => !value)}>
        Intensità
      </button>
      <button type="button" className="min-h-11 text-sm font-semibold text-sand/80" onClick={onBuild} disabled={busy}>
        {busy ? "Calcolo…" : points.length ? "Ricalcola" : "Dal video"}
      </button>
    </div>
  );

  return (
    <>
      <div className="surface px-3 py-3">
        {tools}
        {wave}
        <p className="mt-2 text-[11px] text-mute">Grigio: nessun dato. Altezza: movimento misurato o colpo segnato.</p>
      </div>
      {wide && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#07110e]/95 px-3 pb-6 pt-3 backdrop-blur-md">
          <div className="mx-auto max-w-lg">
            {tools}
            {wave}
          </div>
        </div>
      )}
    </>
  );
}
