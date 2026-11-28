"use client";

import Link from "next/link";
import { GitCompare, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { useStore } from "@/components/Store";
import { ExampleMark } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { it } from "@/lib/i18n";
import { isOnProfile, playerShots, summarize } from "@/lib/stats";

export default function HomePage() {
  const { state } = useStore();
  const [hint, setHint] = useState(false);
  const saved = state.matches.filter(isOnProfile).sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));

  useEffect(() => {
    setHint(localStorage.getItem("fondocampo-hint") !== "1");
  }, []);

  function dismiss() {
    localStorage.setItem("fondocampo-hint", "1");
    setHint(false);
  }

  return (
    <div className="space-y-6 py-4">
      <section className="rise relative overflow-hidden rounded-[1.75rem] shadow-card">
        <img src={`${process.env.NEXT_PUBLIC_BASE_PATH || ""}/hero-padel.jpg`} alt="" className="h-52 w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/50 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-lime">Fondocampo</p>
          <h1 className="mt-1 font-display text-4xl font-extrabold leading-none">Le schede</h1>
        </div>
      </section>

      {hint && (
        <button type="button" onClick={dismiss} className="surface w-full px-4 py-3 text-left text-sm">
          Il video resta sul telefono. Tocca Analizza.
        </button>
      )}

      <Link href="/analisi" onClick={dismiss} className="press flex min-h-16 items-center justify-center rounded-full bg-lime text-lg font-bold text-ink shadow-glow">
        Analizza un video
      </Link>

      {saved.length === 0 ? (
        <p className="surface px-4 py-8 text-center text-sm text-mute">Nessuna scheda. Il primo video parte da Analizza.</p>
      ) : (
        <ul className="space-y-3">
          {saved.slice(0, 4).map((match) => {
            const summary = summarize(playerShots(state.shots, match.focusPlayerId, match.id));
            const name = state.players.find((player) => player.id === match.focusPlayerId)?.name ?? "Giocatore";
            return (
              <li key={match.id}>
                <Link href={`/partita/?id=${match.id}`} className="share-card press flex items-end justify-between gap-3 px-5 py-4">
                  <span>
                    <span className="block font-display text-2xl font-extrabold leading-none">{name}</span>
                    <span className="mt-2 block text-xs text-mute">{match.score || formatDate(match.date)}</span>
                    {match.example && <span className="mt-2 inline-block"><ExampleMark /></span>}
                  </span>
                  <span className="text-right">
                    <span className="block font-display text-4xl font-extrabold leading-none tabular-nums text-lime">{summary.forced}</span>
                    <span className="text-[11px] uppercase tracking-wide text-mute">errori</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <div className="flex justify-center gap-6 pb-2 text-sm text-mute">
        <Link href="/giocatori" className="inline-flex min-h-11 items-center gap-1.5"><Users size={16} /> {it.nav.players}</Link>
        <Link href="/confronto" className="inline-flex min-h-11 items-center gap-1.5"><GitCompare size={16} /> {it.nav.compare}</Link>
      </div>
    </div>
  );
}
