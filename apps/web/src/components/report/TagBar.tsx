"use client";

import { useState } from "react";
import { formatTime, cx } from "@/lib/format";
import type { BodySide, CourtZone, PointPhase, ShotOutcome, ShotType } from "@/lib/types";

const TYPES: Array<{ type: ShotType; label: string; bodySide?: BodySide }> = [
  { type: "forehand", label: "Dritto" },
  { type: "backhand", label: "Rovescio" },
  { type: "forehand_volley", label: "Volée", bodySide: "unknown" },
  { type: "bandeja", label: "Bandeja" },
  { type: "vibora", label: "Víbora" },
  { type: "smash", label: "Smash" },
  { type: "lob", label: "Pallonetto" },
  { type: "bajada", label: "Uscita" },
  { type: "serve", label: "Servizio" },
  { type: "return", label: "Risposta" },
];

const OUTCOMES: Array<{ outcome: ShotOutcome; label: string }> = [
  { outcome: "unforced_error", label: "Gratuito" },
  { outcome: "forced_error", label: "Errore" },
  { outcome: "winner", label: "Vincente" },
];

const ZONES: Array<{ zone: CourtZone; label: string }> = [
  { zone: "baseline", label: "Fondo" },
  { zone: "transition", label: "Mezzo" },
  { zone: "net", label: "Rete" },
  { zone: "wall", label: "Parete" },
];

export interface Stamp {
  type: ShotType;
  outcome: ShotOutcome;
  zone: CourtZone;
  pressured: boolean;
  phase: PointPhase | null;
  bodySide?: BodySide;
}

export function TagBar({ time, onStamp }: { time: number; onStamp: (stamp: Stamp) => void }) {
  const [type, setType] = useState<ShotType | null>(null);
  const [wing, setWing] = useState<BodySide | undefined>(undefined);
  const [outcome, setOutcome] = useState<ShotOutcome | null>(null);
  const [zone, setZone] = useState<CourtZone | null>(null);
  const [pressured, setPressured] = useState(false);
  const [phase, setPhase] = useState<PointPhase | null>(null);
  const ready = type != null && outcome != null && zone != null;

  return (
    <div className="surface space-y-2 p-3">
      <div className="flex items-baseline justify-between">
        <p className="font-display text-lg font-bold">Segna</p>
        <p className="font-display text-sm tabular-nums text-lime">{formatTime(time)}</p>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {TYPES.map((item) => (
          <Chip
            key={item.label}
            on={type === item.type && wing === item.bodySide}
            onClick={() => {
              setType(item.type);
              setWing(item.bodySide);
            }}
          >
            {item.label}
          </Chip>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {OUTCOMES.map((item) => (
          <button
            key={item.outcome}
            type="button"
            onClick={() => setOutcome(item.outcome)}
            className={cx("min-h-11 rounded-2xl text-sm font-semibold", outcome === item.outcome ? "bg-lime text-ink" : "bg-white/5")}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-4 gap-2">
        {ZONES.map((item) => (
          <button
            key={item.zone}
            type="button"
            onClick={() => setZone(item.zone)}
            className={cx("min-h-11 rounded-2xl text-sm font-semibold", zone === item.zone ? "bg-lime text-ink" : "bg-white/5")}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <Chip on={pressured} onClick={() => setPressured((value) => !value)}>Pressione</Chip>
        <Chip
          on={phase === "start"}
          onClick={() => setPhase((value) => (value === "start" ? null : "start"))}
        >
          Inizio
        </Chip>
        <Chip on={phase === "end"} onClick={() => setPhase((value) => (value === "end" ? null : "end"))}>
          Fine
        </Chip>
      </div>
      <button
        type="button"
        disabled={!ready}
        onClick={() => {
          if (!type || !outcome || !zone) return;
          onStamp({ type, outcome, zone, pressured, phase, bodySide: wing });
        }}
        className="min-h-12 w-full rounded-full bg-lime text-sm font-bold text-ink disabled:opacity-40"
      >
        Segna {formatTime(time)}
      </button>
    </div>
  );
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx("min-h-11 shrink-0 rounded-full px-3 text-sm font-semibold", on ? "bg-lime text-ink" : "bg-white/5")}
    >
      {children}
    </button>
  );
}
