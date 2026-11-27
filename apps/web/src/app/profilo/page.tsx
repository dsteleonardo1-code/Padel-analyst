"use client";

import { useState } from "react";
import { uid } from "@/lib/format";
import { it } from "@/lib/i18n";
import { useStore } from "@/components/Store";
import { Banner, Button, Card, TextField } from "@/components/ui";

export default function ProfilePage() {
  const { state, setProfile, setApiBaseUrl, restoreExamples } = useStore();
  const [name, setName] = useState(state.profile?.name ?? "");
  const [email, setEmail] = useState(state.profile?.email ?? "");
  const [role, setRole] = useState<"player" | "coach">(state.profile?.role ?? "player");
  const [api, setApi] = useState(state.apiBaseUrl);
  const [saved, setSaved] = useState("");

  return (
    <div className="space-y-4 py-4">
      <header>
        <h1 className="font-display text-3xl font-bold">Profilo</h1>
        <p className="text-sm text-mute">Giocatore o allenatore. I dati restano su questo telefono.</p>
      </header>
      <Card>
        <div className="space-y-3">
          <TextField label="Nome" value={name} onChange={setName} />
          <TextField label="Email" value={email} onChange={setEmail} type="email" />
          <div className="grid grid-cols-2 gap-2">
            <Button type="button" variant={role === "player" ? "primary" : "ghost"} onClick={() => setRole("player")}>Giocatore</Button>
            <Button type="button" variant={role === "coach" ? "primary" : "ghost"} onClick={() => setRole("coach")}>Allenatore</Button>
          </div>
          <Button
            type="button"
            onClick={() => {
              if (name.trim().length < 2 || !email.includes("@")) {
                setSaved("Servono un nome e una email.");
                return;
              }
              setProfile({ id: state.profile?.id ?? uid("u"), name: name.trim(), email: email.trim(), role });
              setSaved("Profilo salvato su questo telefono.");
            }}
          >
            Salva profilo
          </Button>
        </div>
      </Card>
      <Card>
        <h2 className="font-display text-xl font-bold">Analisi in locale</h2>
        <p className="mt-1 text-sm text-mute">
          Opzionale. Se avvii Fondocampo con Docker sul computer, incolla qui l&apos;indirizzo dell&apos;API, per esempio http://192.168.1.20:8000. Dal telefono, stessa rete Wi‑Fi.
        </p>
        <div className="mt-3 space-y-3">
          <TextField label="URL API" value={api} onChange={setApi} placeholder="http://192.168.0.10:8000" />
          <Button type="button" variant="sand" onClick={() => { setApiBaseUrl(api.trim()); setSaved("Indirizzo locale salvato."); }}>
            Salva indirizzo
          </Button>
        </div>
      </Card>
      <Card>
        <h2 className="font-display text-xl font-bold">Sul telefono</h2>
        <p className="mt-1 text-sm text-mute">{it.installIos} Su Android puoi usare «Installa app» se il browser lo propone.</p>
        <p className="mt-2 text-sm text-mute">{it.privacy}</p>
      </Card>
      <Card>
        <h2 className="font-display text-xl font-bold">Dati di esempio</h2>
        <p className="mt-1 text-sm text-mute">Se hai corretto una partita ESEMPIO e vuoi tornare ai numeri originali, ripristina. Le tue partite restano.</p>
        <Button type="button" variant="ghost" className="mt-3" onClick={() => { restoreExamples(); setSaved("Esempi ripristinati."); }}>
          Ripristina gli esempi
        </Button>
      </Card>
      {saved && <Banner>{saved}</Banner>}
    </div>
  );
}
