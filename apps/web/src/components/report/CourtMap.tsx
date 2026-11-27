"use client";

import { useState } from "react";
import { outcomeLabel } from "@/lib/i18n";
import type { Shot, Sport } from "@/lib/types";

type Mode = "impact" | "landing" | "heat";

function sx(value: number): number {
  return 8 + value * 84;
}
function sy(value: number): number {
  return 148 - value * 140;
}

export function CourtMap({ sport, shots, selectedId }: { sport: Sport; shots: Shot[]; selectedId?: string | null }) {
  const [mode, setMode] = useState<Mode>("landing");
  const selected = shots.find((shot) => shot.id === selectedId) ?? null;
  const heat = heatCells(shots);

  return (
    <div>
      <div className="mb-3 flex gap-2">
        {(
          [
            ["landing", "Atterraggi"],
            ["impact", "Impatti"],
            ["heat", "Calore errori"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setMode(id)}
            className={`min-h-11 rounded-full px-3 text-sm ${mode === id ? "bg-lime font-semibold text-ink" : "bg-white/5 text-sand"}`}
          >
            {label}
          </button>
        ))}
      </div>
      <svg viewBox="-8 -8 116 172" className="w-full rounded-3xl bg-[#0c1c16]" role="img" aria-label="Mappa del campo">
        <rect x="8" y="8" width="84" height="140" fill="#164232" stroke="#f4efe4" strokeWidth="0.8" />
        {sport === "padel" ? <PadelLines /> : <TennisLines />}
        <text x="50" y="156" textAnchor="middle" fill="#a8b6ad" fontSize="4">
          Il tuo fondo
        </text>
        <text x="50" y="2" textAnchor="middle" fill="#a8b6ad" fontSize="4">
          Avversari
        </text>
        {mode === "heat" &&
          heat.map((cell) =>
            cell.count ? (
              <rect
                key={`${cell.x}-${cell.y}`}
                x={sx(cell.x)}
                y={sy(cell.y + cell.h)}
                width={84 / 8}
                height={(140 / 12) * 0.92}
                fill="#ff5d6c"
                opacity={Math.min(0.75, 0.18 + cell.count * 0.16)}
              />
            ) : null,
          )}
        {mode !== "heat" &&
          shots.map((shot) => {
            const point = mode === "impact" ? { x: shot.impactX, y: shot.impactY } : { x: shot.landX, y: shot.landY };
            const color = shot.outcome === "winner" ? "#d6ff3f" : shot.outcome === "unforced_error" ? "#ff7a45" : shot.outcome === "forced_error" ? "#ff5d6c" : "#8aa399";
            return <circle key={shot.id} cx={sx(point.x)} cy={sy(point.y)} r={shot.id === selectedId ? 2.4 : 1.5} fill={color} opacity={shot.id === selectedId ? 1 : 0.85} />;
          })}
        {selected && (
          <line
            x1={sx(selected.impactX)}
            y1={sy(selected.impactY)}
            x2={sx(selected.landX)}
            y2={sy(selected.landY)}
            stroke="#d6ff3f"
            strokeWidth="0.7"
            strokeDasharray="1.5 1"
          />
        )}
      </svg>
      <p className="mt-2 text-xs text-mute">
        Lime vincenti, arancio gratuiti, corallo errori.
        {selected ? ` Selezionato: ${outcomeLabel[selected.outcome]}.` : ""}
      </p>
    </div>
  );
}

function heatCells(shots: Shot[]): Array<{ x: number; y: number; h: number; count: number }> {
  const cols = 8;
  const rows = 12;
  const cells = Array.from({ length: cols * rows }, (_, index) => ({
    x: (index % cols) / cols,
    y: Math.floor(index / cols) / rows,
    h: 1 / rows,
    count: 0,
  }));
  for (const shot of shots) {
    if (shot.outcome !== "unforced_error" && shot.outcome !== "forced_error") continue;
    const col = Math.floor(Math.min(0.999, Math.max(0, shot.landX)) * cols);
    const row = Math.floor(Math.min(0.999, Math.max(0, shot.landY)) * rows);
    const cell = cells[row * cols + col];
    if (cell) cell.count += 1;
  }
  return cells;
}

function PadelLines() {
  const service = 0.1525;
  return (
    <g stroke="#f4efe4" strokeWidth="0.45" fill="none" opacity="0.85">
      <line x1={sx(0)} y1={sy(0.5)} x2={sx(1)} y2={sy(0.5)} stroke="#d6ff3f" />
      <line x1={sx(0)} y1={sy(service)} x2={sx(1)} y2={sy(service)} />
      <line x1={sx(0)} y1={sy(1 - service)} x2={sx(1)} y2={sy(1 - service)} />
      <line x1={sx(0.5)} y1={sy(0)} x2={sx(0.5)} y2={sy(service)} />
      <line x1={sx(0.5)} y1={sy(1)} x2={sx(0.5)} y2={sy(1 - service)} />
    </g>
  );
}

function TennisLines() {
  const service = 0.231;
  const inset = 0.125;
  return (
    <g stroke="#f4efe4" strokeWidth="0.45" fill="none" opacity="0.85">
      <line x1={sx(0)} y1={sy(0.5)} x2={sx(1)} y2={sy(0.5)} stroke="#d6ff3f" />
      <line x1={sx(inset)} y1={sy(0)} x2={sx(inset)} y2={sy(1)} />
      <line x1={sx(1 - inset)} y1={sy(0)} x2={sx(1 - inset)} y2={sy(1)} />
      <line x1={sx(inset)} y1={sy(service)} x2={sx(1 - inset)} y2={sy(service)} />
      <line x1={sx(inset)} y1={sy(1 - service)} x2={sx(1 - inset)} y2={sy(1 - service)} />
      <line x1={sx(0.5)} y1={sy(service)} x2={sx(0.5)} y2={sy(1 - service)} />
    </g>
  );
}
