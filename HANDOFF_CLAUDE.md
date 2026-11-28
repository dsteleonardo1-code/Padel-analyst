# Handoff Fondocampo

App italiana, mobile, per schede di padel e tennis. I video dell'utente restano sul telefono. I dati dimostrativi sono marcati **ESEMPIO**. Dove non c'è un modello, gli esiti non si inventano.

Branch di lavoro: `cursor/fondocampo-padel-tennis-7196`.

## Stato

- Barra: Home, Analizza, Profilo. Giocatori e Confronta restano i link sotto le schede.
- Home: illustrazione del campo e un solo pulsante, Analizza un video. Al primo uso compare una riga: il video resta sul telefono.
- Analizza è un wizard: 1 Video (carica o esempio), 2 Giocatore, 3 Scheda.
- Segna un colpo parte già su dritto, errore e fondo: un tocco basta, si cambia solo se serve.
- Intensità: sotto il video, una waveform di stanghette. L'altezza viene dal movimento misurato o da un colpo segnato. Senza dato la barra resta bassa e grigia. Il pulsante Intensità la apre a tutta larghezza. Il playhead colora le barre già viste.
- Fisica: l'utente tocca i 4 angoli (campo 20×10 m, rete 0,88 m di riferimento) e il giocatore. Distanza, velocità, scatti, passi e salti sono STIME calcolate sul video; se il tracking non regge restano vuote. Sotto il video c'è la barra di intensità del movimento. Prova sul set Navarro, primi 20 secondi: 10,3 m, 10,1 km/h, 0 scatti, affidabilità 38%; i salti non sono stati mostrati. Sulla clip Galán (camera che cambia) il giocatore si perde e i numeri restano vuoti. Il calcolo salta nel video: il server statico deve rispondere ai Range, altrimenti il browser non può spostare il playhead.
- Clip: inizio/fine, rivedi, elimina, e il calcolo fisico può usare solo le clip segnate «In analisi».
- Un errore apre il punto intero (rally), non solo i secondi intorno all'impatto.
- Export: PDF dalla stampa del telefono, immagine condivisibile con i numeri tattici e, se ci sono, quelli fisici.
- Scheda: video, timeline dei colpi, segno manuale (tipo, esito, zona, pressione, inizio/fine), totali, indice 0–100 solo con almeno 4 colpi classificati, grafici per tipo, mini-campo per zona, tre priorità con esercizio, clip.
- Scheda `m-galan-errori`: un errore di Ale Galán visto nei fotogrammi dello spezzone Dailymotion `xa6xfe4` (0:20–2:50). Etichetta **Tag manuale**. Il file `apps/web/public/demo/galan-prova.mp4` è in `.gitignore` e non va committato.
- Scheda `m-navarro-set`: set 1 intero di Company/Escalante contro Allemandi/Navarro, World Padel Tour Lisboa, Dailymotion `x273mqn`. Paquito Navarro è identificato dalla scritta sulla maglia. Nessun colpo pre-segnato: la camera fissa non mostra il risultato della palla. Il video `lisboa-set.mp4` è in `.gitignore`. Ale Galán non compare nelle partite intere scaricabili da qui (su Dailymotion le sue finali Premier Padel sono highlights).
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
- `apps/web/public/hero-padel.jpg` — illustrazione della home.
- `apps/web/public/demo` — video di prova. `galan-prova.mp4` non è nel git.

## Prossimi passi

- Modello vero per rete, fuori e tipo di colpo. Fino ad allora il segno resta manuale.
- Tunnel con nome, se l'anteprima deve restare accesa.
- Accendere GitHub Pages (Build: GitHub Actions) se si vuole l'URL del repository.
- Non committare il video di terzi né segreti.
