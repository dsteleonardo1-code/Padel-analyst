"use client";

import type { AdviceItem } from "@/lib/advice";
import { phaseErrors, pressureErrors, sidePoints, typeBoard, zoneBoard } from "@/lib/analyst";
import { cx, formatPct, formatTime } from "@/lib/format";
import { serveStats } from "@/lib/stats";
import type { Match, Rally, Shot } from "@/lib/types";

export function AnalystBoard({
  match,
  shots,
  rallies,
  playerId,
  priorities,
  delta,
  onJump,
}: {
  match: Match;
  shots: Shot[];
  rallies: Rally[];
  playerId: string;
  priorities: AdviceItem[];
  delta: { errors: number; winners: number } | null;
  onJump: (time: number | null) => void;
}) {
  const types = typeBoard(shots);
  const zones = zoneBoard(shots);
  const sides = sidePoints(shots, rallies, playerId);
  const phase = phaseErrors(shots);
  const pressure = pressureErrors(shots);
  const serve = serveStats(shots, rallies, playerId, match.id);

  return (
    <div className="space-y-3">
      {delta && (
        <p className="text-center text-sm">
          vs prima · errori <Delta value={delta.errors} downIsGood /> · vincenti <Delta value={delta.winners} />
        </p>
      )}

      <section>
        <h2 className="mb-2 font-display text-lg font-bold">Allenare</h2>
        {priorities.length === 0 ? (
          <p className="rounded-3xl border border-white/10 bg-pine px-3 py-4 text-sm text-mute">Segna gli errori per avere le priorità.</p>
        ) : (
          <ol className="space-y-2">
            {priorities.map((item, index) => (
              <li key={item.key} className="rounded-3xl border border-white/10 bg-pine px-3 py-3">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="font-display text-xl font-bold leading-none">
                    {index + 1}. {item.title}
                  </p>
                  <p className="font-display text-2xl font-extrabold text-coral">{item.count}</p>
                </div>
                <p className="mt-1 text-sm text-mute">{item.drill}</p>
                {item.t != null && (
                  <button type="button" className="mt-1 min-h-11 text-sm font-semibold text-lime" onClick={() => onJump(item.t)}>
                    {formatTime(item.t)}
                  </button>
                )}
              </li>
            ))}
          </ol>
        )}
      </section>

      <section>
        <h2 className="mb-2 font-display text-lg font-bold">Colpi</h2>
        {types.length === 0 ? (
          <p className="text-sm text-mute">Nessun colpo classificato.</p>
        ) : (
          <ul className="flex gap-2 overflow-x-auto pb-1">
            {types.map((row) => (
              <li key={row.id} className="w-24 shrink-0 rounded-3xl border border-white/10 bg-pine px-2 py-3 text-center">
                <p className="text-[11px] uppercase tracking-wide text-mute">{row.label}</p>
                <p className="font-display text-3xl font-extrabold leading-none text-coral">{row.errors}</p>
                <p className="mt-1 text-[11px] text-lime">{row.winners} vinti</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {zones.length > 0 && (
        <section>
          <h2 className="mb-2 font-display text-lg font-bold">Zona</h2>
          <ul className={cx("grid gap-2", zones.length > 2 ? "grid-cols-4" : "grid-cols-2")}>
            {zones.map((row) => (
              <li key={row.zone} className="rounded-3xl border border-white/10 bg-pine px-1 py-2 text-center">
                <p className="text-[11px] text-mute">{row.label}</p>
                <p className="font-display text-2xl font-extrabold text-coral">{row.errors}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="grid grid-cols-2 gap-2">
        <Stat label="A rete" value={sides.net.pct == null ? "—" : formatPct(sides.net.pct)} hint={sides.net.played ? `${sides.net.won}/${sides.net.played}` : "pochi punti"} />
        <Stat label="A fondo" value={sides.baseline.pct == null ? "—" : formatPct(sides.baseline.pct)} hint={sides.baseline.played ? `${sides.baseline.won}/${sides.baseline.played}` : "pochi punti"} />
        <Stat label="Servizio" value={serve.pointsWonOnServePct == null ? "—" : formatPct(serve.pointsWonOnServePct)} hint={serve.observed ? "punti vinti" : "pochi servizi"} />
        <Stat label="Risposta" value={serve.pointsWonOnReturnPct == null ? "—" : formatPct(serve.pointsWonOnReturnPct)} hint={serve.returnPoints >= 4 ? "punti vinti" : "pochi scambi"} />
      </section>

      <section className="grid grid-cols-4 gap-2">
        <Stat label="Inizio" value={phase.observed ? String(phase.start) : "—"} hint="errori" />
        <Stat label="Metà" value={phase.observed ? String(phase.middle) : "—"} hint="errori" />
        <Stat label="Fine" value={phase.observed ? String(phase.end) : "—"} hint="errori" />
        <Stat label="Pressione" value={pressure.tagged ? String(pressure.errors) : "—"} hint={pressure.tagged ? "errori" : "non segnata"} />
      </section>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-pine px-2 py-2 text-center">
      <p className="text-[11px] uppercase tracking-wide text-mute">{label}</p>
      <p className="font-display text-2xl font-extrabold leading-none">{value}</p>
      <p className="text-[11px] text-mute">{hint}</p>
    </div>
  );
}

function Delta({ value, downIsGood = false }: { value: number; downIsGood?: boolean }) {
  const good = downIsGood ? value < 0 : value > 0;
  const bad = downIsGood ? value > 0 : value < 0;
  const tone = good ? "text-lime" : bad ? "text-coral" : "text-mute";
  const sign = value > 0 ? "+" : "";
  return <span className={`font-semibold ${tone}`}>{sign}{value}</span>;
}
