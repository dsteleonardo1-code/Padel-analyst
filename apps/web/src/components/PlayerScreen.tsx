"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { priorityHistory } from "@/lib/advice";
import { formatDate, formatPct } from "@/lib/format";
import { it, levelLabel, sportLabel } from "@/lib/i18n";
import { gifted, matchesForPlayer, playerShots, skillSnapshots, summarize } from "@/lib/stats";
import { TrendCharts } from "./TrendCharts";
import { ScoreTrio } from "./ScoreTrio";
import { useStore } from "./Store";
import { ExampleMark, Fold } from "./ui";

const statusLabel = {
  in_corso: "In corso",
  migliorato: "Migliorato",
  peggiorato: "Peggiorato",
  non_osservato: "Non osservato chiaramente",
} as const;

export function PlayerScreen() {
  const params = useSearchParams();
  const id = params.get("id") ?? "";
  const { state } = useStore();
  const player = state.players.find((item) => item.id === id);
  if (!player) {
    return <p className="py-10 text-mute">Giocatore non trovato su questo telefono.</p>;
  }
  const matches = matchesForPlayer(state.matches, state.shots, player.id);
  const rows = matches.map((match) => {
    const summary = summarize(playerShots(state.shots, player.id, match.id));
    return {
      match,
      summary,
      label: formatDate(match.date).slice(0, 5),
    };
  });
  const skills = skillSnapshots(state.matches, state.shots, player.id);
  const history = priorityHistory(state.matches, state.shots, player.id);

  return (
    <div className="space-y-4 py-4">
      <header>
        <div className="flex items-center gap-2">
          {player.example && <ExampleMark />}
          <span className="text-xs uppercase tracking-wide text-mute">{sportLabel[player.sport]}</span>
        </div>
        <h1 className="font-display text-3xl font-bold">{player.name}</h1>
        <p className="text-sm text-mute">{sportLabel[player.sport]} · {levelLabel[player.level]}</p>
      </header>

      <ScoreTrio
        unforced={rows.reduce((sum, row) => sum + row.summary.unforced, 0)}
        forced={rows.reduce((sum, row) => sum + row.summary.forced, 0)}
        winners={rows.reduce((sum, row) => sum + row.summary.winners, 0)}
      />

      <TrendCharts
        rows={rows.map((row) => ({
          label: row.label,
          free: row.summary.unforced,
          errors: row.summary.forced,
          winners: row.summary.winners,
          games: gifted(row.summary.unforced, row.summary.forced).games,
        }))}
      />

      <Fold title="Abilità">
        <ul className="mt-3 space-y-2">
          {skills.map((skill) => {
            const last = [...skill.points].reverse().find((point) => point.observed);
            const arrow = skill.trend === "up" ? "↑" : skill.trend === "down" ? "↓" : skill.trend === "flat" ? "→" : "·";
            const tone = skill.trend === "up" ? "text-lime" : skill.trend === "down" ? "text-coral" : "text-mute";
            return (
              <li key={skill.id} className="flex items-center justify-between gap-3 rounded-2xl bg-white/5 px-3 py-2">
                <span>{skill.label}</span>
                <span className={tone}>
                  {arrow} {last ? formatPct(last.errorRate) : it.unobserved}
                </span>
              </li>
            );
          })}
        </ul>
      </Fold>

      <Fold title="Priorità">
        <ul className="mt-3 space-y-3">
          {history.map((item) => (
            <li key={item.matchId}>
              <p className="text-sm text-mute">{formatDate(item.date)}</p>
              <p className="font-semibold">{item.title}</p>
              <p className="text-sm">
                {statusLabel[item.status]} · {item.detail}
              </p>
            </li>
          ))}
          {history.length === 0 && <li className="text-sm text-mute">—</li>}
        </ul>
      </Fold>

      <ul className="space-y-2">
        {[...rows].reverse().map((row) => (
            <li key={row.match.id}>
              <Link href={`/partita/?id=${row.match.id}`} className="block rounded-3xl border border-white/10 bg-card p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm text-mute">{formatDate(row.match.date)}</span>
                  {row.match.example && <ExampleMark />}
                </div>
                <p className="font-display text-xl font-bold">{row.match.score || "—"}</p>
                <p className="mt-2 text-sm">
                  {row.summary.unforced} gratuiti · {row.summary.forced} errori · {row.summary.winners} vincenti
                </p>
                <p className="text-xs text-mute">{gifted(row.summary.unforced, row.summary.forced).line}</p>
              </Link>
            </li>
        ))}
      </ul>
    </div>
  );
}

