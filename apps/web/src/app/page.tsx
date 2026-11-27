"use client";

import Link from "next/link";
import { formatDate, formatPct } from "@/lib/format";
import { it, sportLabel } from "@/lib/i18n";
import { playerShots, summarize } from "@/lib/stats";
import { TrendCharts } from "@/components/TrendCharts";
import { useStore } from "@/components/Store";
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
        <p className="text-xs uppercase tracking-[0.18em] text-lime">In tasca, a bordocampo</p>
        <h1 className="mt-1 font-display text-4xl font-extrabold leading-[0.95]">{it.tagline}</h1>
        <p className="mt-3 text-sm leading-relaxed text-mute">
          Carichi una clip, tocchi chi seguire e leggi errori, colpi buoni e un esercizio concreto. I dati dimostrativi sono sempre marcati {it.example}.
        </p>
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
                    <p className="font-display text-xl font-bold">{summary.errors} errori · {summary.good} colpi buoni</p>
                    <p className="text-sm text-mute">{match.place}</p>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section>
        <div className="flex items-end justify-between">
          <h2 className="font-display text-2xl font-bold">Partite di esempio</h2>
          <ExampleMark />
        </div>
        <p className="mt-1 text-sm text-mute">Numeri illustrativi, non misurati su un video vero. Servono a leggere il report subito.</p>
        <ul className="mt-3 flex snap-x gap-3 overflow-x-auto pb-2">
          {state.matches.filter((match) => match.example).map((match) => {
            const summary = summarize(playerShots(state.shots, match.focusPlayerId, match.id));
            const player = state.players.find((item) => item.id === match.focusPlayerId);
            return (
              <li key={match.id} className="w-[78%] shrink-0 snap-start">
                <Link href={`/partita/?id=${match.id}`} className="block h-full rounded-3xl border border-lime/25 bg-card p-4">
                  <ExampleMark />
                  <p className="mt-3 font-display text-2xl font-bold leading-tight">{player?.name}</p>
                  <p className="text-sm text-mute">{sportLabel[match.sport]} · {formatDate(match.date)}</p>
                  <p className="mt-3 font-display text-3xl font-extrabold text-coral">{summary.errors}</p>
                  <p className="text-xs uppercase tracking-wide text-mute">errori · {summary.good} vincenti · {formatPct(summary.errorRate)}</p>
                  <p className="mt-2 text-sm">{match.score} contro {match.opponents}</p>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      {luca && (
        <Card>
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-bold">Errori di {luca.name}</h2>
            <ExampleMark />
          </div>
          <div className="mt-3">
            <TrendCharts
              rows={lucaMatches.map((match) => ({
                label: formatDate(match.date).slice(0, 5),
                errors: summarize(playerShots(state.shots, luca.id, match.id)).errors,
                winnerPct: summarize(playerShots(state.shots, luca.id, match.id)).winnerRate,
              }))}
            />
          </div>
          <Link href="/giocatore/?id=p-luca" className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold text-lime">
            Apri il profilo di esempio
          </Link>
        </Card>
      )}

      <section className="grid gap-2">
        {[
          ["1", "Scegli", "Padel o tennis, e la persona da seguire."],
          ["2", "Tocca", "Sul primo fotogramma indichi chi è il tuo giocatore."],
          ["3", "Leggi", "Errori, un esercizio e i punti da rivedere."],
        ].map(([n, title, text]) => (
          <div key={n} className="flex gap-3 rounded-3xl bg-white/5 p-3">
            <span className="font-display text-2xl font-bold text-lime">{n}</span>
            <p><strong>{title}. </strong><span className="text-sm text-mute">{text}</span></p>
          </div>
        ))}
      </section>
      <p className="text-xs leading-relaxed text-mute">{it.privacy} {it.installIos}</p>
    </div>
  );
}
