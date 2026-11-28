"use client";

import { useState } from "react";
import { PADEL_COURT } from "@/lib/homography";
import { formatTime, uid } from "@/lib/format";
import type { CourtCalibration, PhysicalReport, UserClip } from "@/lib/types";

export function FieldTools({
  time,
  clips,
  calibration,
  report,
  busy,
  progress,
  onMarkIn,
  onSaveClip,
  onDeleteClip,
  onToggleClip,
  onPlay,
  onStartCorners,
  onStartPlayer,
  onRun,
}: {
  time: number;
  clips: UserClip[];
  calibration: CourtCalibration | null;
  report: PhysicalReport | null;
  busy: boolean;
  progress: number;
  onMarkIn: (which: "in" | "out") => void;
  onSaveClip: (t0: number, t1: number) => void;
  onDeleteClip: (id: string) => void;
  onToggleClip: (id: string) => void;
  onPlay: (t0: number) => void;
  onStartCorners: () => void;
  onStartPlayer: () => void;
  onRun: () => void;
}) {
  const [t0, setT0] = useState<number | null>(null);
  const [t1, setT1] = useState<number | null>(null);
  const ready = Boolean(calibration && calibration.corners.length === 4 && calibration.player);

  return (
    <div className="space-y-3">
      <section className="share-card space-y-3 p-4">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-2xl font-extrabold">Fisica</h2>
          <p className="text-[11px] font-bold text-clay">STIMA</p>
        </div>
        <p className="text-xs text-mute">
          Campo {PADEL_COURT.lengthM}×{PADEL_COURT.widthM} m · rete {PADEL_COURT.netCenterM} m al centro.
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" className="press min-h-14 rounded-2xl bg-white/10 text-sm font-semibold" onClick={onStartCorners}>
            {calibration?.corners.length === 4 ? "Angoli ok" : "4 angoli"}
          </button>
          <button type="button" className="press min-h-14 rounded-2xl bg-white/10 text-sm font-semibold" onClick={onStartPlayer}>
            {calibration?.player ? "Giocatore ok" : "Tocca giocatore"}
          </button>
        </div>
        <button type="button" className="press min-h-14 w-full rounded-full bg-lime text-base font-bold text-ink disabled:opacity-40" disabled={!ready || busy} onClick={onRun}>
          {busy ? `Stima ${Math.round(progress * 100)}%` : "Calcola sul video"}
        </button>
        <div className="grid grid-cols-3 gap-2 text-center">
          <Stat label="Distanza" value={report?.distanceM != null ? `${report.distanceM}` : "—"} unit="m" />
          <Stat label="Velocità" value={report?.maxSpeedMps != null ? `${(report.maxSpeedMps * 3.6).toFixed(1)}` : "—"} unit="km/h" />
          <Stat label="Scatti" value={report?.sprints != null ? `${report.sprints}` : "—"} unit="" />
          <Stat label="Passi" value={report?.steps != null ? `${report.steps}` : "—"} unit="" />
          <Stat label="Salti" value={report?.jumps != null ? `${report.jumps}` : "—"} unit="" />
          <Stat label="Affidabilità" value={report ? `${Math.round(report.lock * 100)}` : "—"} unit="%" />
        </div>
        <p className="text-xs leading-relaxed text-mute">{report?.note ?? "I numeri compaiono solo dopo il calcolo sul video."}</p>
      </section>

      <section className="surface space-y-3 p-4">
        <h2 className="font-display text-2xl font-extrabold">Clip</h2>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" className="press min-h-14 rounded-2xl bg-white/10 text-sm font-semibold" onClick={() => { setT0(time); onMarkIn("in"); }}>
            Inizio {t0 == null ? "" : formatTime(t0)}
          </button>
          <button type="button" className="press min-h-14 rounded-2xl bg-white/10 text-sm font-semibold" onClick={() => { setT1(time); onMarkIn("out"); }}>
            Fine {t1 == null ? "" : formatTime(t1)}
          </button>
        </div>
        <button
          type="button"
          className="press min-h-14 w-full rounded-full bg-lime text-base font-bold text-ink disabled:opacity-40"
          disabled={t0 == null || t1 == null || Math.abs((t1 ?? 0) - (t0 ?? 0)) < 0.4}
          onClick={() => {
            if (t0 == null || t1 == null) return;
            onSaveClip(Math.min(t0, t1), Math.max(t0, t1));
            setT0(null);
            setT1(null);
          }}
        >
          Salva clip
        </button>
        <ul className="space-y-2">
          {clips.map((clip, index) => (
            <li key={clip.id || index} className="flex items-center gap-2">
              <button type="button" className="min-h-11 flex-1 rounded-2xl bg-white/5 px-3 text-left text-sm" onClick={() => onPlay(clip.t0)}>
                {formatTime(clip.t0)}–{formatTime(clip.t1)}
              </button>
              <button type="button" className={`min-h-11 rounded-full px-3 text-sm font-semibold ${clip.selected ? "bg-lime text-ink" : "bg-white/10"}`} onClick={() => onToggleClip(clip.id)}>
                {clip.selected ? "In analisi" : "Tieni"}
              </button>
              <button type="button" className="min-h-11 px-2 text-sm text-coral" onClick={() => onDeleteClip(clip.id)}>Elimina</button>
            </li>
          ))}
        </ul>
        {clips.length === 0 && <p className="text-sm text-mute">Nessuna clip. Segna inizio e fine sul video.</p>}
      </section>
    </div>
  );
}

function Stat({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div>
      <p className="font-display text-3xl font-extrabold leading-none">{value}</p>
      <p className="text-[11px] uppercase tracking-wide text-mute">{unit ? `${label} ${unit}` : label}</p>
    </div>
  );
}

export function newClipId(): string {
  return uid("c");
}
