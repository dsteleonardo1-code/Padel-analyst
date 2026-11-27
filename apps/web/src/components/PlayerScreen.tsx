"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { priorityHistory } from "@/lib/advice";
import { formatDate, formatDelta, formatPct } from "@/lib/format";
import { handLabel, it, levelLabel, sideLabel, sportLabel } from "@/lib/i18n";
import { deltaTone, matchesForPlayer, percentChange, playerShots, skillSnapshots, summarize } from "@/lib/stats";
import { TrendCharts } from "./TrendCharts";
import { useStore } from "./Store";
import { Card, ExampleMark } from "./ui";

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
        <p className="text-sm text-mute">
          Mano {handLabel[player.hand].toLowerCase()} · {levelLabel[player.level]}
          {player.side ? ` · lato ${sideLabel[player.side].toLowerCase()}` : ""}
          {player.partnerName ? ` · con ${player.partnerName}` : ""}
          {player.backhand ? ` · rovescio a ${player.backhand === "two" ? "due mani" : "una mano"}` : ""}
        </p>
      </header>

      <Card>
        <h2 className="font-display text-xl font-bold">Andamento</h2>
        <div className="mt-3">
          <TrendCharts
            rows={rows.map((row) => ({
              label: row.label,
              errors: row.summary.errors,
              winnerPct: row.summary.winnerRate,
            }))}
          />
        </div>
      </Card>

      <Card>
        <h2 className="font-display text-xl font-bold">Abilità</h2>
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
        <p className="mt-2 text-xs text-mute">La freccia guarda gli errori: su vuol dire che ne fai meno. Se i colpi non bastano, non mostriamo uno zero finto.</p>
      </Card>

      <Card>
        <h2 className="font-display text-xl font-bold">Cosa stavi migliorando</h2>
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
          {history.length === 0 && <li className="text-sm text-mute">Nessuna partita ancora.</li>}
        </ul>
      </Card>

      <ul className="space-y-2">
        {[...rows].reverse().map((row, index, all) => {
          const previous = all[index + 1];
          const errorDelta = previous ? percentChange(row.summary.errors, previous.summary.errors) : null;
          const winnerDelta = previous && row.summary.winners != null && previous.summary.winners != null
            ? percentChange(row.summary.winners, previous.summary.winners)
            : null;
          return (
            <li key={row.match.id}>
              <Link href={`/partita/?id=${row.match.id}`} className="block rounded-3xl border border-white/10 bg-card p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm text-mute">{formatDate(row.match.date)}</span>
                  {row.match.example && <ExampleMark />}
                </div>
                <p className="font-display text-xl font-bold">{row.match.score || "Senza risultato"}</p>
                <p className="text-sm text-mute">{row.match.opponents || "Avversari non indicati"}{row.match.partner ? ` · con ${row.match.partner}` : ""}</p>
                <p className="mt-2 text-sm">
                  {row.summary.errors} errori{" "}
                  <Delta metric="errors" pct={errorDelta} />
                  {" · "}
                  {row.summary.good} colpi buoni{" "}
                  <Delta metric="winners" pct={winnerDelta} />
                </p>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Delta({ metric, pct }: { metric: "errors" | "winners"; pct: number | null }) {
  const tone = deltaTone(metric, pct);
  const color = tone === "good" ? "text-lime" : tone === "bad" ? "text-coral" : "text-mute";
  return <span className={color}>{formatDelta(pct)} vs precedente</span>;
}
