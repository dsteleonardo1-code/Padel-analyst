# Handoff Fondocampo

App italiana, mobile, per schede di padel e tennis. I video dell'utente restano sul telefono. I dati dimostrativi sono marcati **ESEMPIO**. Dove non c'è un modello, gli esiti non si inventano.

Branch di lavoro: `cursor/fondocampo-padel-tennis-7196`.

## Stato

- Barra: Home, Analizza, Profilo. Giocatori e Confronta restano raggiungibili dalla home.
- Analizza un video è l'unico ingresso: carica oppure esempio, poi il giocatore, poi la scheda.
- Scheda: video, timeline dei colpi, segno manuale (tipo, esito, zona, pressione, inizio/fine), totali, indice 0–100 solo con almeno 4 colpi classificati, grafici per tipo, mini-campo per zona, tre priorità con esercizio, clip.
- Scheda `m-galan-errori`: un errore di Ale Galán visto nei fotogrammi dello spezzone Dailymotion `xa6xfe4` (0:20–2:50). Etichetta **Tag manuale**. Il file `apps/web/public/demo/galan-prova.mp4` è in `.gitignore` e non va committato.
- L'indice e le percentuali restano vuoti se i colpi non bastano.
- Condivisione: link della scheda, oppure immagine PNG (share del telefono, altrimenti download).
- Anteprima pubblica: server statico sulla porta 8765 e tunnel Cloudflare temporaneo. Non ha garanzia di durata.

## Avvio in locale

Solo l'interfaccia, senza API:

```bash
cd apps/web
npm install
npm test
npm run dev
```

Apri http://localhost:3000. La scheda Galán in dev cerca `/demo/galan-prova.mp4`: se il file non c'è in `apps/web/public/demo/`, il video non parte. Gli altri esempi usano i clip Mixkit già nel repository.

Export statico:

```bash
cd apps/web
NEXT_PUBLIC_BASE_PATH= npm run build
python3 -m http.server 8765 --directory out
```

`NEXT_PUBLIC_BASE_PATH` vuoto serve l'app sulla radice. Per GitHub Pages il path è `/Padel-analyst`.

La pipeline Python (`apps/api`, `docker compose`) è opzionale. Non serve per la scheda nel browser.

## Struttura

- `apps/web/src/app` — pagine: home, partita, profilo, giocatori, confronto, analisi, condividi.
- `apps/web/src/components/UploadFlow.tsx` — carica / esempio / scelta giocatore.
- `apps/web/src/components/report` — video, timeline, tag, grafici, clip, mappa.
- `apps/web/src/lib/analyst.ts` — zona, tipo, indice, priorità, confronto tra schede.
- `apps/web/src/lib/examples.ts` — schede ESEMPIO.
- `apps/web/src/lib/galan-errori.ts` — il colpo segnato a mano.
- `apps/web/src/lib/stats.ts` — totali e game regalati.
- `apps/web/public/demo` — video di prova. `galan-prova.mp4` non è nel git.

## Prossimi passi

- Modello vero per rete, fuori e tipo di colpo. Fino ad allora il segno resta manuale.
- Tunnel con nome, se l'anteprima deve restare accesa.
- Accendere GitHub Pages (Build: GitHub Actions) se si vuole l'URL del repository.
- Non committare il video di terzi né segreti.
