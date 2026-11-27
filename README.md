# Fondocampo

Analisi di partite di **padel** e **tennis**, in italiano, apribile da telefono.

La versione pubblica è una PWA. I video analizzati nel browser restano sul telefono. I dati dimostrativi sono sempre marcati **ESEMPIO**. Dove il riconoscimento è euristico, la confidenza è una stima: non è un modello addestrato e non promettiamo una percentuale di accuratezza.

## Link pubblico

https://dsteleonardo1-code.github.io/Padel-analyst/

## Provarla

1. Apri il link pubblico con Safari su iPhone (o con un browser sul computer).
2. Nella home scorri le partite segnate **ESEMPIO** e aprine una: errori, mappa, consigli e minuti cliccabili.
3. Per una clip tua: **Carica un video**, scegli il giocatore, tocca la persona nel primo fotogramma, avvia l'analisi. Sul telefono vengono letti i primi 8 minuti, un fotogramma ogni mezzo secondo. Gli esiti (rete, fuori) restano **non classificati**: senza le linee misurate non li inventiamo.
4. Per installarla: in Safari, Condividi → **Aggiungi a Home**.

Il profilo e le correzioni restano nella memoria del telefono. Un link condiviso di una tua partita non include il video.

## In locale, con la pipeline Python

```bash
docker compose up --build
```

- Interfaccia: http://localhost:3000
- API: http://localhost:8000/docs
- MinIO: http://localhost:9001 (utente `fondocampo`, password `fondocampo-secret`)

Poi, in **Profilo**, incolla l'URL dell'API (dal telefono, l'IP del computer sulla stessa Wi‑Fi, per esempio `http://192.168.1.20:8000`) e nell'analisi scegli **Invia all'analisi locale**.

La pipeline locale usa OpenCV (campo, giocatori, palla, impatti). Non include i pesi YOLO né MediaPipe: sono previsti come sostituti delle stesse interfacce, non sono nel repository perché non sono installabili in modo affidabile e gratuito insieme al resto. Gli esiti geometrici sono nel modulo `outcome` e si applicano solo quando il rimbalzo è davvero misurato. Nell'analisi di un video il punto d'impatto seguito è il giocatore, quindi l'esito resta non classificato.

## Sviluppo senza Docker

```bash
cd apps/web && npm ci && npm test && npm run dev
cd apps/api && pip install -r requirements.txt && PYTHONPATH=. pytest && PYTHONPATH=. uvicorn app.main:app --reload
```

## Pubblicare di nuovo (gratis)

Il sito statico va su **GitHub Pages** del repository pubblico, piano gratuito. Il workflow `.github/workflows/ci.yml` fa lint, test e deploy a ogni push su `main`. Nessun servizio a pagamento.

Base path del sito di progetto: `/Padel-analyst`.
