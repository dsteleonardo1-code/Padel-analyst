"use client";

import { useState } from "react";
import { uid } from "@/lib/format";
import { handLabel, levelLabel, sideLabel, sportLabel } from "@/lib/i18n";
import type { Backhand, CourtSide, Hand, Level, PlayStyle, Player, Sport } from "@/lib/types";
import { Button, SelectField, TextField } from "./ui";

export function PlayerForm({
  initial,
  ownerId,
  onSave,
  onCancel,
}: {
  initial?: Player | null;
  ownerId: string;
  onSave: (player: Player) => void;
  onCancel?: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [sport, setSport] = useState<Sport>(initial?.sport ?? "padel");
  const [hand, setHand] = useState<Hand>(initial?.hand ?? "right");
  const [side, setSide] = useState<CourtSide>(initial?.side ?? "right");
  const [level, setLevel] = useState<Level>(initial?.level ?? "intermediate");
  const [partnerName, setPartnerName] = useState(initial?.partnerName ?? "");
  const [playStyle, setPlayStyle] = useState<PlayStyle>(initial?.playStyle ?? "singles");
  const [backhand, setBackhand] = useState<Backhand>(initial?.backhand ?? "two");
  const [error, setError] = useState("");

  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (name.trim().length < 2) {
          setError("Scrivi il nome del giocatore.");
          return;
        }
        onSave({
          id: initial?.id ?? uid("p"),
          name: name.trim(),
          sport,
          hand,
          side: sport === "padel" ? side : null,
          level,
          partnerName: sport === "padel" ? partnerName.trim() : "",
          playStyle: sport === "tennis" ? playStyle : "doubles",
          backhand: sport === "tennis" ? backhand : null,
          ownerId,
          example: initial?.example ?? false,
        });
      }}
    >
      <TextField label="Nome" value={name} onChange={setName} placeholder="Es. Marta Greco" />
      <SelectField label="Sport" value={sport} onChange={(value) => setSport(value as Sport)}>
        <option value="padel">{sportLabel.padel}</option>
        <option value="tennis">{sportLabel.tennis}</option>
      </SelectField>
      <SelectField label="Mano" value={hand} onChange={(value) => setHand(value as Hand)}>
        <option value="right">{handLabel.right}</option>
        <option value="left">{handLabel.left}</option>
      </SelectField>
      <SelectField label="Livello" value={level} onChange={(value) => setLevel(value as Level)}>
        {Object.entries(levelLabel).map(([key, label]) => (
          <option key={key} value={key}>{label}</option>
        ))}
      </SelectField>
      {sport === "padel" ? (
        <>
          <SelectField label="Lato di gioco" value={side} onChange={(value) => setSide(value as CourtSide)}>
            <option value="right">Destra</option>
            <option value="left">Sinistra</option>
          </SelectField>
          <TextField label="Compagno abituale" value={partnerName} onChange={setPartnerName} placeholder="Opzionale" />
        </>
      ) : (
        <>
          <SelectField label="Tipo di gioco" value={playStyle} onChange={(value) => setPlayStyle(value as PlayStyle)}>
            <option value="singles">Singolo</option>
            <option value="doubles">Doppio</option>
          </SelectField>
          <SelectField label="Rovescio" value={backhand} onChange={(value) => setBackhand(value as Backhand)}>
            <option value="one">Una mano</option>
            <option value="two">Due mani</option>
          </SelectField>
        </>
      )}
      {error && <p className="text-sm text-coral">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit">{initial ? "Salva giocatore" : "Crea giocatore"}</Button>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Annulla
          </Button>
        )}
      </div>
    </form>
  );
}
