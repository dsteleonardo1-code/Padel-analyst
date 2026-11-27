"use client";

import Link from "next/link";
import { useState } from "react";
import { PlayerForm } from "@/components/PlayerForm";
import { useStore } from "@/components/Store";
import { Button, Card, ExampleMark } from "@/components/ui";
import { handLabel, levelLabel, sportLabel } from "@/lib/i18n";

export default function PlayersPage() {
  const { state, upsertPlayer, deletePlayer } = useStore();
  const [open, setOpen] = useState(false);
  const own = state.players.filter((player) => !player.example);
  const examples = state.players.filter((player) => player.example);

  return (
    <div className="space-y-4 py-4">
      <header>
        <h1 className="font-display text-3xl font-bold">Giocatori</h1>
        <p className="text-sm text-mute">Un allenatore può tenerne più di uno. I profili di esempio restano segnati.</p>
      </header>
      <Button type="button" onClick={() => setOpen((value) => !value)}>{open ? "Chiudi" : "Nuovo giocatore"}</Button>
      {open && (
        <Card>
          <PlayerForm ownerId={state.profile?.id ?? "local"} onSave={(player) => { upsertPlayer(player); setOpen(false); }} onCancel={() => setOpen(false)} />
        </Card>
      )}
      <ul className="space-y-2">
        {own.map((player) => (
          <li key={player.id} className="rounded-3xl border border-white/10 bg-card p-3">
            <Link href={`/giocatore/?id=${player.id}`} className="block min-h-11">
              <p className="font-display text-xl font-bold">{player.name}</p>
              <p className="text-sm text-mute">{sportLabel[player.sport]} · {handLabel[player.hand]} · {levelLabel[player.level]}</p>
            </Link>
            <Button type="button" variant="ghost" className="mt-2" onClick={() => deletePlayer(player.id)}>Elimina</Button>
          </li>
        ))}
        {own.length === 0 && <li className="text-sm text-mute">Non hai ancora un giocatore tuo. Quelli sotto sono di esempio.</li>}
      </ul>
      <h2 className="font-display text-xl font-bold">Di esempio</h2>
      <ul className="space-y-2">
        {examples.map((player) => (
          <li key={player.id}>
            <Link href={`/giocatore/?id=${player.id}`} className="flex items-center justify-between rounded-3xl border border-lime/20 bg-card p-3">
              <span>
                <span className="block font-semibold">{player.name}</span>
                <span className="text-sm text-mute">{sportLabel[player.sport]}</span>
              </span>
              <ExampleMark />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
