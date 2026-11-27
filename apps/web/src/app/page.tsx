"use client";

import Link from "next/link";
import { useStore } from "@/components/Store";
import { ExampleMark } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { it } from "@/lib/i18n";
import { isOnProfile, playerShots, summarize } from "@/lib/stats";

export default function HomePage() {
  const { state } = useStore();
  const saved = state.matches.filter(isOnProfile).sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));

  return (
    <div className="space-y-4 py-4">
      <header className="rise">
        <p className="text-[11px] uppercase tracking-[0.22em] text-lime">Fondocampo</p>
        <h1 className="mt-2 font-display text-4xl font-extrabold leading-none">Le schede</h1>
      </header>
      <Link href="/analisi" className="surface press flex min-h-28 items-center justify-between px-5">
        <span>
          <span className="block font-display text-3xl font-extrabold leading-none">Analizza un video</span>
          <span className="mt-1 block text-sm text-mute">Carica o prova l'esempio</span>
        </span>
        <span className="grid h-11 w-11 place-items-center rounded-full bg-lime text-xl font-bold text-ink">→</span>
      </Link>
      {saved.length === 0 ? (
        <p className="text-sm text-mute">Nessuna scheda salvata.</p>
      ) : (
        <ul className="space-y-2">
          {saved.slice(0, 4).map((match) => {
            const summary = summarize(playerShots(state.shots, match.focusPlayerId, match.id));
            const name = state.players.find((player) => player.id === match.focusPlayerId)?.name ?? "Giocatore";
            return (
              <li key={match.id}>
                <Link href={`/partita/?id=${match.id}`} className="surface flex items-center justify-between gap-3 px-4 py-3">
                  <span>
                    <span className="block font-display text-xl font-bold leading-none">{name}</span>
                    <span className="mt-1 block text-xs text-mute">{match.score || formatDate(match.date)}</span>
                  </span>
                  <span className="text-right">
                    {match.example && <ExampleMark />}
                    <span className="mt-1 block font-display text-lg font-bold tabular-nums">
                      {summary.unforced} · {summary.forced} · {summary.winners}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      <p className="flex gap-4 text-sm">
        <Link href="/giocatori" className="min-h-11 font-semibold text-lime">{it.nav.players}</Link>
        <Link href="/confronto" className="min-h-11 font-semibold text-lime">{it.nav.compare}</Link>
      </p>
    </div>
  );
}
