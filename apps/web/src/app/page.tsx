"use client";

import Link from "next/link";
import { formatDate } from "@/lib/format";
import { gifted, playerShots, summarize } from "@/lib/stats";
import { TrendCharts } from "@/components/TrendCharts";
import { useStore } from "@/components/Store";
import { ScoreTrio } from "@/components/ScoreTrio";
import { Card, ExampleMark, SourceMark } from "@/components/ui";

export default function HomePage() {
  const { state } = useStore();
  const luca = state.players.find((player) => player.id === "p-luca");
  const lucaMatches = state.matches.filter((match) => match.focusPlayerId === "p-luca").sort((a, b) => a.date.localeCompare(b.date));
  const own = state.matches.filter((match) => !match.example).sort((a, b) => b.date.localeCompare(a.date));
  const interrupted = state.jobs.filter((job) => job.status === "interrupted" || job.status === "error");

  return (
    <div className="space-y-5 py-4">
      <section>
        <h1 className="font-display text-4xl font-extrabold leading-none">Fondocampo</h1>
        <p className="mt-1 text-sm text-mute">Padel e tennis. I demo sono ESEMPIO.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/analisi" className="inline-flex min-h-11 items-center rounded-full bg-lime px-4 font-semibold text-ink">
            Carica un video
          </Link>
          <Link href="/partita/?id=m-luca-3" className="inline-flex min-h-11 items-center rounded-full border border-white/15 px-4 font-semibold">
            Apri un esempio
          </Link>
        </div>
      </section>

      {interrupted.length > 0 && (
        <Card>
          <p className="font-semibold">Analisi da riprendere</p>
          <ul className="mt-2 space-y-2">
            {interrupted.map((job) => (
              <li key={job.id}>
                <Link href={`/analisi/?riprendi=${job.matchId}`} className="text-sm text-lime">
                  {job.error || "Riprendi il video salvato"}
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {own.length > 0 && (
        <section>
          <h2 className="font-display text-2xl font-bold">Le tue partite</h2>
          <ul className="mt-2 space-y-2">
            {own.map((match) => {
              const summary = summarize(playerShots(state.shots, match.focusPlayerId, match.id));
              const player = state.players.find((item) => item.id === match.focusPlayerId);
              return (
                <li key={match.id}>
                  <Link href={`/partita/?id=${match.id}`} className="block rounded-3xl border border-white/10 bg-card p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-mute">{formatDate(match.date)} · {player?.name}</span>
                      <SourceMark source={match.source} example={false} />
                    </div>
                    <p className="font-display text-xl font-bold">{summary.unforced} gratuiti · {summary.forced} errori · {summary.winners} vincenti</p>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section>
        <h2 className="font-display text-2xl font-bold">ESEMPIO</h2>
        <ul className="mt-3 flex snap-x gap-3 overflow-x-auto pb-2">
          {state.matches.filter((match) => match.example).map((match) => {
            const summary = summarize(playerShots(state.shots, match.focusPlayerId, match.id));
            const player = state.players.find((item) => item.id === match.focusPlayerId);
            return (
              <li key={match.id} className="w-[78%] shrink-0 snap-start">
                <Link href={`/partita/?id=${match.id}`} className="block rounded-3xl border border-lime/25 bg-card p-4">
                  <div className="flex items-center justify-between">
                    <p className="font-display text-xl font-bold">{player?.name}</p>
                    <ExampleMark />
                  </div>
                  <p className="text-sm text-mute">{formatDate(match.date)} · {match.score}</p>
                  <p className="mt-3 font-display text-3xl font-extrabold">
                    <span className="text-clay">{summary.unforced}</span>
                    <span className="text-mute"> · </span>
                    <span className="text-coral">{summary.forced}</span>
                    <span className="text-mute"> · </span>
                    <span className="text-lime">{summary.winners}</span>
                  </p>
                  <p className="text-xs text-mute">{gifted(summary.unforced, summary.forced).line}</p>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      {luca && (
        <Card>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-display text-xl font-bold">{luca.name}</h2>
            <ExampleMark />
          </div>
          <TrendCharts
            rows={lucaMatches.map((match) => {
              const summary = summarize(playerShots(state.shots, luca.id, match.id));
              return {
                label: formatDate(match.date).slice(0, 5),
                free: summary.unforced,
                errors: summary.forced,
                winners: summary.winners,
                games: gifted(summary.unforced, summary.forced).games,
              };
            })}
          />
        </Card>
      )}
    </div>
  );
}
