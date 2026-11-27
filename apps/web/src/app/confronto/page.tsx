"use client";

import { useMemo, useState } from "react";
import { formatDate } from "@/lib/format";
import { shotLabel } from "@/lib/i18n";
import { gifted, playerShots, summarize } from "@/lib/stats";
import { useStore } from "@/components/Store";
import { Card, ExampleMark, Select } from "@/components/ui";

export default function ComparePage() {
  const { state } = useStore();
  const [playerId, setPlayerId] = useState("p-luca");
  const matches = state.matches
    .filter((match) => match.focusPlayerId === playerId || state.shots.some((shot) => shot.matchId === match.id && shot.playerId === playerId))
    .sort((a, b) => a.date.localeCompare(b.date));
  const [leftId, setLeftId] = useState(matches[0]?.id ?? "");
  const [rightId, setRightId] = useState(matches[matches.length - 1]?.id ?? "");
  const left = matches.find((match) => match.id === leftId) ?? matches[0];
  const right = matches.find((match) => match.id === rightId) ?? matches[matches.length - 1];
  const a = useMemo(() => summarize(playerShots(state.shots, playerId, left?.id)), [state.shots, playerId, left?.id]);
  const b = useMemo(() => summarize(playerShots(state.shots, playerId, right?.id)), [state.shots, playerId, right?.id]);
  const types = [...new Set([...a.byType.map((row) => row.type), ...b.byType.map((row) => row.type)])];

  return (
    <div className="space-y-4 py-4">
      <header>
        <h1 className="font-display text-3xl font-bold">Confronta</h1>
        <p className="text-sm text-mute">Due partite.</p>
      </header>
      <label className="block text-sm">Giocatore
        <Select className="mt-1" value={playerId} onChange={(event) => {
          setPlayerId(event.target.value);
          setLeftId("");
          setRightId("");
        }}>
          {state.players.map((player) => (
            <option key={player.id} value={player.id}>{player.name}{player.example ? " (ESEMPIO)" : ""}</option>
          ))}
        </Select>
      </label>
      <div className="grid grid-cols-2 gap-2">
        <Select value={left?.id ?? ""} onChange={(event) => setLeftId(event.target.value)}>
          {matches.map((match) => <option key={match.id} value={match.id}>{formatDate(match.date)}</option>)}
        </Select>
        <Select value={right?.id ?? ""} onChange={(event) => setRightId(event.target.value)}>
          {matches.map((match) => <option key={match.id} value={match.id}>{formatDate(match.date)}</option>)}
        </Select>
      </div>
      {left && right && left.id !== right.id ? (
        <Card>
          {(left.example || right.example) && <ExampleMark />}
          <table className="mt-3 w-full text-sm">
            <thead>
              <tr className="text-left text-mute">
                <th className="py-2"> </th>
                <th>{formatDate(left.date)}</th>
                <th>{formatDate(right.date)}</th>
              </tr>
            </thead>
            <tbody>
              <tr><td className="py-2">Gratuiti</td><td>{a.unforced}</td><td>{b.unforced}</td></tr>
              <tr><td className="py-2">Errori</td><td>{a.forced}</td><td>{b.forced}</td></tr>
              <tr><td className="py-2">Vincenti</td><td>{a.winners}</td><td>{b.winners}</td></tr>
              <tr><td className="py-2">Game</td><td>{gifted(a.unforced, a.forced).games}</td><td>{gifted(b.unforced, b.forced).games}</td></tr>
            </tbody>
          </table>
          <h2 className="mt-4 font-display text-lg font-bold">Errori per colpo</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {types.map((type) => {
              const before = a.byType.find((row) => row.type === type)?.errors ?? 0;
              const after = b.byType.find((row) => row.type === type)?.errors ?? 0;
              return (
                <li key={type} className="flex justify-between gap-2">
                  <span>{shotLabel[type]}</span>
                  <span>{before} → {after}</span>
                </li>
              );
            })}
          </ul>
        </Card>
      ) : (
        <p className="text-sm text-mute">Scegli due partite diverse. Se ne hai una sola, apri prima un esempio.</p>
      )}
    </div>
  );
}

