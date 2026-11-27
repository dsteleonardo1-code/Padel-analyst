"use client";

import type { AdviceItem } from "@/lib/advice";
import { phaseErrors, pressureErrors, sidePoints, typeBoard, zoneBoard, type ZoneRow } from "@/lib/analyst";
import type { CourtZone } from "@/lib/types";
import { formatPct, formatTime } from "@/lib/format";
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
          <p className="surface px-3 py-4 text-sm text-mute">Segna gli errori per avere le priorità.</p>
        ) : (
          <ol className="space-y-2">
            {priorities.map((item, index) => (
              <li key={item.key} className="surface px-3 py-3">
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

      <section className="surface p-3">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="font-display text-lg font-bold">Colpi</h2>
          <p className="text-[11px] text-mute">
            <span className="text-coral">errori</span> · <span className="text-lime">vincenti</span>
          </p>
        </div>
        {types.length === 0 ? (
          <p className="text-sm text-mute">Nessun colpo classificato.</p>
        ) : (
          <BarChart rows={types.map((row) => ({ id: row.id, label: row.label, errors: row.errors, winners: row.winners }))} />
        )}
      </section>

      <section className="surface grid grid-cols-[1fr_7.5rem] items-center gap-2 p-3">
        <div>
          <h2 className="mb-2 font-display text-lg font-bold">Zona</h2>
          {zones.length === 0 ? (
            <p className="text-sm text-mute">Nessuna zona segnata.</p>
          ) : (
            <ul className="space-y-1">
              {zones.map((row) => (
                <li key={row.zone} className="flex items-baseline justify-between text-sm">
                  <span>{row.label}</span>
                  <span className="font-display text-xl font-bold text-coral">{row.errors}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <ZoneCourt zones={zones} />
      </section>

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
    <div className="surface px-2 py-2 text-center">
      <p className="text-[11px] uppercase tracking-wide text-mute">{label}</p>
      <p className="font-display text-2xl font-extrabold leading-none">{value}</p>
      <p className="text-[11px] text-mute">{hint}</p>
    </div>
  );
}

function BarChart({ rows }: { rows: Array<{ id: string; label: string; errors: number; winners: number }> }) {
  const max = Math.max(1, ...rows.map((row) => row.errors + row.winners));
  return (
    <ul className="space-y-2">
      {rows.map((row) => (
        <li key={row.id}>
          <div className="flex items-baseline justify-between text-sm">
            <span>{row.label}</span>
            <span className="text-xs text-mute">{row.errors} · {row.winners}</span>
          </div>
          <div className="mt-1 flex h-2 overflow-hidden rounded-full bg-white/10">
            <span className="h-2 bg-coral" style={{ width: `${(row.errors / max) * 100}%` }} />
            <span className="h-2 bg-lime" style={{ width: `${(row.winners / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

function ZoneCourt({ zones }: { zones: ZoneRow[] }) {
  const errors = (zone: CourtZone) => zones.find((row) => row.zone === zone)?.errors ?? 0;
  const max = Math.max(1, ...zones.map((row) => row.errors), 1);
  const heat = (zone: CourtZone) => {
    const count = errors(zone);
    if (!count) return "rgba(255,255,255,0.04)";
    return `rgba(255,93,108,${0.28 + (0.62 * count) / max})`;
  };
  return (
    <svg viewBox="0 0 80 120" className="w-full" role="img" aria-label="Mini campo, calore degli errori">
      <rect x="4" y="4" width="72" height="112" rx="3" fill="#0c1c16" stroke="rgba(244,239,228,0.45)" />
      <rect x="4" y="62" width="72" height="16" fill={heat("net")} />
      <rect x="4" y="78" width="72" height="16" fill={heat("transition")} />
      <rect x="4" y="94" width="72" height="22" fill={heat("baseline")} />
      <rect x="4" y="78" width="7" height="38" fill={heat("wall")} />
      <line x1="4" y1="60" x2="76" y2="60" stroke="#d6ff3f" strokeWidth="1.2" />
      <text x="40" y="14" textAnchor="middle" fill="#a8b6ad" fontSize="6">loro</text>
      <text x="40" y="110" textAnchor="middle" fill="#f4efe4" fontSize="6">tuo</text>
    </svg>
  );
}

function Delta({ value, downIsGood = false }: { value: number; downIsGood?: boolean }) {
  const good = downIsGood ? value < 0 : value > 0;
  const bad = downIsGood ? value > 0 : value < 0;
  const tone = good ? "text-lime" : bad ? "text-coral" : "text-mute";
  const sign = value > 0 ? "+" : "";
  return <span className={`font-semibold ${tone}`}>{sign}{value}</span>;
}
