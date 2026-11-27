# PROGRESS

## Fatto

- App web Next.js (App Router), TypeScript, Tailwind, grafici Recharts, PWA (manifest, icone, service worker), interfaccia in italiano con i testi raccolti in `apps/web/src/lib/i18n.ts`.
- Profilo locale (giocatore o allenatore), schede giocatore (sport, mano, livello, lato padel, compagno, singolo/doppio e rovescio nel tennis).
- Partite di esempio marcate **ESEMPIO**, con colpi, errori, mappa, consigli, confronto e andamento. Le confidenze degli esempi sono illustrative.
- Report: totali, motivi, errori per tipo di colpo, priorità con esercizio e criterio, punti di forza, mappa, servizio/risposta, coppia, quarto di partita, filtri, salto al tempo, correzione manuale con ricalcolo, CSV e PDF via stampa.
- Analisi nel browser: campionamento del video, blob di movimento, tocco sul giocatore, classificazione euristica a bassa confidenza, esiti non classificati, tratti non analizzati lasciati visibili.
- Link di sola lettura (il video non viaggia nel link) e link diretti alle partite di esempio.
- API FastAPI, Postgres, Redis, RQ, MinIO nel `docker-compose.yml`. Modello con le tabelle richieste. Pipeline a stadi che scrive JSON: preprocess, campo e omografia, tracker a centroidi (interfaccia sostituibile con ByteTrack), palla e interpolazione, scambi, classificatore euristico (`HeuristicShotClassifier.classify`), regole di esito, aggregazione.
- Test web (Vitest) e test API/pipeline (pytest), CI su GitHub Actions.

## Non fatto, di proposito

- Nessun modello addestrato e nessun numero di accuratezza inventato. YOLO, ByteTrack e MediaPipe non sono nel pacchetto: l'interfaccia c'è, l'implementazione usabile senza GPU né download di pesi è quella euristica.
- L'analisi sul telefono non distingue rete e fuori. La pipeline locale, su un video vero, tiene l'esito non classificato finché il rimbalzo non è separato dal giocatore. Le regole geometriche sono testate sul modulo `outcome`.
- Niente import da YouTube o Drive (niente servizio di transcodifica gratuito e affidabile).
- Niente compressione del video sul telefono: i ricodificatori WebAssembly vanno spesso in crash su iPhone.
- Le correzioni sono salvate ed esportate, ma non riaddestrano un modello.
- Una partita di un'ora in meno di 30 minuti, e l'80% di colpi corretti, non sono risultati di questa versione.

## Come si lancia

Vedi `README.md`. In breve: il link GitHub Pages per la PWA, oppure `docker compose up --build` per l'analisi locale.
