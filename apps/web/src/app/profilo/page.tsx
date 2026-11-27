"use client";

import Link from "next/link";
import { useState } from "react";
import { TrendCharts } from "@/components/TrendCharts";
import { useStore } from "@/components/Store";
import { Banner, Button, ExampleMark, Fold, TextField } from "@/components/ui";
import { formatDate, uid } from "@/lib/format";
import { it } from "@/lib/i18n";
import { previousSheet, sheetDelta, summarizeMatch } from "@/lib/analyst";
import { gifted, isOnProfile, playerShots, summarize } from "@/lib/stats";
import type { Match, Shot } from "@/lib/types";

export default function ProfilePage() {
  const { state, setProfile, setApiBaseUrl, restoreExamples } = useStore();
  const [name, setName] = useState(state.profile?.name ?? "");
  const [email, setEmail] = useState(state.profile?.email ?? "");
  const [api, setApi] = useState(state.apiBaseUrl);
  const [note, setNote] = useState("");
  const saved = state.matches.filter(isOnProfile).sort((a, b) => a.date.localeCompare(b.date));
  const rows = saved.map((match) => {
    const summary = summarize(playerShots(state.shots, match.focusPlayerId, match.id));
    return { match, summary, label: formatDate(match.date).slice(0, 5) };
  });

  return (
    <div className="space-y-4 py-4">
      <header>
        <h1 className="font-display text-4xl font-extrabold leading-none">{state.profile?.name || "Il mio profilo"}</h1>
        <p className="mt-1 text-sm text-mute">Solo le schede che salvi.</p>
      </header>

      {rows.length === 0 ? (
        <p className="rounded-3xl border border-white/10 bg-pine px-4 py-8 text-center text-sm text-mute">Nessuna scheda salvata.</p>
      ) : (
        <>
          <TrendCharts
            rows={rows.map((row) => ({
              label: row.label,
              free: row.summary.unforced,
              errors: row.summary.forced,
              winners: row.summary.winners,
              games: gifted(row.summary.unforced, row.summary.forced).games,
            }))}
          />
          <ul className="space-y-2">
            {[...rows].reverse().map((row) => (
              <li key={row.match.id}>
                <Link href={`/partita/?id=${row.match.id}`} className="surface block p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-mute">
                      {state.players.find((player) => player.id === row.match.focusPlayerId)?.name ?? "Giocatore"} · {formatDate(row.match.date)}
                    </span>
                    {row.match.example && <ExampleMark />}
                  </div>
                  <p className="mt-1 text-sm">{row.match.score || row.match.place}</p>
                  <p className="mt-1 font-display text-2xl font-bold">
                    {row.summary.unforced} · {row.summary.forced} · {row.summary.winners}
                  </p>
                  <p className="text-xs text-mute">{gifted(row.summary.unforced, row.summary.forced).line}</p>
                  <CompareLine matches={saved} match={row.match} shots={state.shots} />
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}

      <Fold title="Account">
        <div className="space-y-3">
          <TextField label="Nome" value={name} onChange={setName} />
          <TextField label="Email" value={email} onChange={setEmail} type="email" />
          <Button
            type="button"
            onClick={() => {
              if (name.trim().length < 2) return;
              setProfile({ id: state.profile?.id ?? uid("u"), name: name.trim(), email: email.trim() || "io@telefono.local", role: state.profile?.role ?? "player" });
              setNote("Nome aggiornato.");
            }}
          >
            Salva nome
          </Button>
          <TextField label="API locale" value={api} onChange={setApi} placeholder="http://192.168.0.10:8000" />
          <Button type="button" variant="ghost" onClick={() => { setApiBaseUrl(api.trim()); setNote("API salvata."); }}>Salva API</Button>
          <Button type="button" variant="ghost" onClick={() => { restoreExamples(); setNote("Esempi ripristinati."); }}>Ripristina esempi</Button>
          <p className="text-xs text-mute">{it.installIos}</p>
        </div>
      </Fold>
      {note && <Banner>{note}</Banner>}
    </div>
  );
}

function CompareLine({ matches, match, shots }: { matches: Match[]; match: Match; shots: Shot[] }) {
  const prior = previousSheet(matches, match);
  if (!prior) return null;
  const delta = sheetDelta(summarizeMatch(shots, match.focusPlayerId, match.id), summarizeMatch(shots, prior.focusPlayerId, prior.id));
  const sign = (value: number) => `${value > 0 ? "+" : ""}${value}`;
  return (
    <p className="mt-1 text-xs text-mute">
      vs prima · errori {sign(delta.errors)} · vincenti {sign(delta.winners)}
    </p>
  );
}
