"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { analyzeVideoElement } from "@/lib/analyzeVideo";
import { formatDate, uid } from "@/lib/format";
import { shirtColorName } from "@/lib/analyze";
import { handLabel, it, sideLabel, sportLabel } from "@/lib/i18n";
import { openSession, pushMatch, pushPlayer, readJob, readReport, startAnalysis, uploadVideo } from "@/lib/localApi";
import { loadVideo, saveVideo } from "@/lib/storage";
import type { AnalysisJob, CourtSide, Hand, Match, Player, Rally, Shot, Sport } from "@/lib/types";
import { PlayerForm } from "./PlayerForm";
import { useStore } from "./Store";
import { Banner, Button, Card, ExampleMark, TextField } from "./ui";

const guideItems = [
  "Camera fissa, in alto dietro il fondo campo",
  "Campo intero inquadrato e, nel padel, vetri visibili",
  "Almeno 30 fotogrammi al secondo e luce decente",
  "Non seguire la palla: il telefono resta fermo",
];

export function Wizard({ resumeId }: { resumeId?: string }) {
  const router = useRouter();
  const { state, setProfile, upsertPlayer, upsertMatch, updateJob } = useStore();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [step, setStep] = useState<"profile" | "setup" | "details" | "video" | "guide" | "pick" | "run">(
    state.profile ? "setup" : "profile",
  );
  const [name, setName] = useState(state.profile?.name ?? "");
  const [email, setEmail] = useState(state.profile?.email ?? "");
  const [role, setRole] = useState<"player" | "coach">(state.profile?.role ?? "player");
  const [sport, setSport] = useState<Sport>("padel");
  const [playerId, setPlayerId] = useState("");
  const [side, setSide] = useState<CourtSide>("right");
  const [creating, setCreating] = useState(false);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [place, setPlace] = useState("");
  const [opponents, setOpponents] = useState("");
  const [score, setScore] = useState("");
  const [partner, setPartner] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [checks, setChecks] = useState<boolean[]>(guideItems.map(() => false));
  const [hint, setHint] = useState<{ x: number; y: number } | null>(null);
  const [shirt, setShirt] = useState<[number, number, number] | null>(null);
  const [zoom, setZoom] = useState(1);
  const [progress, setProgress] = useState(0);
  const [log, setLog] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const players = state.players.filter((player) => player.sport === sport && (!player.example || true));
  const mine = players.filter((player) => !player.example);
  const list = mine.length ? mine : players;
  const selected = state.players.find((player) => player.id === playerId) ?? null;

  useEffect(() => {
    if (!playerId) {
      const first = list[0];
      if (first) {
        setPlayerId(first.id);
        if (first.side) setSide(first.side);
        if (first.partnerName) setPartner(first.partnerName);
      }
    }
  }, [list, playerId]);

  useEffect(() => {
    if (!resumeId) return;
    loadVideo(resumeId)
      .then((blob) => {
        if (!blob) return;
        const next = new File([blob], "ripresa.mp4", { type: blob.type || "video/mp4" });
        setFile(next);
        setStep("guide");
      })
      .catch(() => undefined);
  }, [resumeId]);

  useEffect(() => {
    if (!file || !videoRef.current) return;
    const url = URL.createObjectURL(file);
    const video = videoRef.current;
    video.src = url;
    video.onloadeddata = () => {
      video.play().then(() => video.pause()).catch(() => undefined);
    };
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    if (step !== "pick" || !videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const paint = () => {
      const ctx = canvas.getContext("2d");
      if (!ctx || video.readyState < 2) return;
      canvas.width = 720;
      canvas.height = 405;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      setPreview(canvas.toDataURL("image/jpeg", 0.72));
    };
    const target = Math.min(0.4, Number.isFinite(video.duration) ? Math.max(0.1, video.duration / 10) : 0.4);
    const onSeeked = () => paint();
    video.addEventListener("seeked", onSeeked);
    try {
      video.currentTime = target;
    } catch {
      paint();
    }
    const timer = window.setTimeout(paint, 400);
    return () => {
      video.removeEventListener("seeked", onSeeked);
      window.clearTimeout(timer);
    };
  }, [step, file]);

  function pushLog(line: string) {
    setLog((current) => [...current.slice(-8), line]);
  }

  async function runBrowser() {
    const video = videoRef.current;
    const player = state.players.find((item) => item.id === playerId);
    if (!video || !file || !player || !hint) {
      setError("Scegli il giocatore toccando il fotogramma.");
      return;
    }
    setBusy(true);
    setError("");
    setStep("run");
    const controller = new AbortController();
    abortRef.current = controller;
    const matchId = resumeId || uid("m");
    const job: AnalysisJob = {
      id: uid("job"),
      matchId,
      status: "processing",
      progress: 1,
      log: ["Analisi avviata sul telefono."],
      error: "",
      updatedAt: new Date().toISOString(),
    };
    updateJob(job);
    try {
      await saveVideo(matchId, file);
      const analysis = await analyzeVideoElement({
        video,
        sport,
        hand: player.hand,
        hint,
        signal: controller.signal,
        onProgress: (value, line) => {
          setProgress(value);
          pushLog(line);
        },
      });
      const rallies: Rally[] = [];
      const shots: Shot[] = [];
      const groups = new Map<number, typeof analysis.shots>();
      for (const draft of analysis.shots) groups.set(draft.rallyIndex, [...(groups.get(draft.rallyIndex) ?? []), draft]);
      for (const [index, group] of groups) {
        const rallyId = `${matchId}-r${index + 1}`;
        const built = group.map((draft) => {
          const shot: Shot = {
            id: `${matchId}-s${shots.length + 1}`,
            rallyId,
            matchId,
            playerId: player.id,
            team: 1,
            tImpact: draft.tImpact,
            type: draft.type,
            bodySide: draft.bodySide,
            impactX: draft.impactX,
            impactY: draft.impactY,
            landX: draft.landX,
            landY: draft.landY,
            impactHeight: draft.impactHeight,
            outcome: "unclassified",
            errorReason: null,
            errorCause: null,
            situation: "baseline",
            confidence: draft.confidence,
            manuallyCorrected: false,
            serveNumber: draft.serveNumber,
            example: false,
            note: draft.note,
          };
          return shot;
        });
        shots.push(...built);
        rallies.push({
          id: rallyId,
          matchId,
          number: index + 1,
          tStart: group[0].tImpact,
          tEnd: group[group.length - 1].tImpact + 1,
          winnerTeam: null,
          serverTeam: group[0].type === "serve" ? 1 : null,
        });
      }
      const duration = Number.isFinite(video.duration) ? video.duration : analysis.coveredSec;
      const match: Match = {
        id: matchId,
        sport,
        date,
        place: place || "Luogo non indicato",
        format: sport === "padel" ? "Padel" : "Tennis",
        score,
        opponents,
        partner,
        videoUrl: "",
        status: "ready",
        ownerId: state.profile?.id ?? "local",
        focusPlayerId: player.id,
        side: sport === "padel" ? side : null,
        example: false,
        source: "browser_heuristic",
        durationSec: duration,
        confidenceNote:
          "Stima euristica sul dispositivo, senza modello addestrato. Gli esiti restano non classificati perché le linee non sono misurate.",
        observation: {
          court: analysis.greenMean >= 0.08,
          ball: analysis.ballSeenRatio > 0.04,
          pose: false,
          position: false,
        },
        unclassifiedSegments: analysis.segments,
        limitNote: analysis.log[0] ?? "",
      };
      const done: AnalysisJob = { ...job, status: "ready", progress: 100, log: analysis.log, updatedAt: new Date().toISOString() };
      upsertMatch(match, rallies, shots, done);
      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        new Notification("Fondocampo", { body: "L'analisi sul telefono è pronta." });
      }
      router.push(`/partita/?id=${match.id}`);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Analisi interrotta.";
      setError(message);
      updateJob({ ...job, status: "error", error: message, updatedAt: new Date().toISOString() });
      setBusy(false);
    }
  }

  async function runApi() {
    const player = state.players.find((item) => item.id === playerId);
    if (!file || !player || !state.profile || !state.apiBaseUrl) return;
    setBusy(true);
    setStep("run");
    setError("");
    try {
      const token = await openSession(state.apiBaseUrl, state.profile);
      await pushPlayer(state.apiBaseUrl, token, player);
      const matchId = uid("m");
      const draft: Match = {
        id: matchId,
        sport,
        date,
        place: place || "Luogo non indicato",
        format: sport === "padel" ? "Padel" : "Tennis",
        score,
        opponents,
        partner,
        videoUrl: "",
        status: "processing",
        ownerId: state.profile.id,
        focusPlayerId: player.id,
        side: sport === "padel" ? side : null,
        example: false,
        source: "local_api",
        durationSec: 0,
        confidenceNote: "Stima della pipeline locale. Non è un modello addestrato.",
        observation: { court: false, ball: false, pose: false, position: false },
        unclassifiedSegments: [],
        limitNote: "",
      };
      await pushMatch(state.apiBaseUrl, token, draft);
      pushLog("Carico il video sull'API locale…");
      await uploadVideo(state.apiBaseUrl, token, matchId, file);
      const jobId = await startAnalysis(state.apiBaseUrl, token, matchId);
      let status = "processing";
      while (status === "processing" || status === "queued") {
        const job = await readJob(state.apiBaseUrl, token, jobId);
        status = job.status;
        setProgress(job.progress);
        if (job.log.at(-1)) pushLog(job.log.at(-1) as string);
        if (status === "error") throw new Error(job.error || "Analisi locale fallita");
        if (status !== "ready") await new Promise((resolve) => window.setTimeout(resolve, 1200));
      }
      const report = await readReport(state.apiBaseUrl, token, matchId);
      upsertMatch(report.match, report.rallies, report.shots);
      for (const item of report.players) upsertPlayer(item);
      router.push(`/partita/?id=${report.match.id}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "API locale non raggiungibile.");
      setBusy(false);
    }
  }

  const examples = state.matches.filter((match) => match.example && match.sport === sport && match.focusPlayerId.startsWith("p-"));

  return (
    <div className="space-y-4 py-4">
      <div>
        <p className="text-xs uppercase tracking-[0.16em] text-lime">Nuova analisi</p>
        <h1 className="font-display text-3xl font-bold">Segui un giocatore</h1>
        <p className="mt-1 text-sm text-mute">Il video, se lo analizzi qui, non lascia il telefono.</p>
      </div>

      {step === "profile" && (
        <Card>
          <h2 className="font-display text-xl font-bold">Chi sei</h2>
          <p className="mt-1 text-sm text-mute">Niente account online: il profilo resta su questo dispositivo.</p>
          <div className="mt-3 space-y-3">
            <TextField label="Nome" value={name} onChange={setName} />
            <TextField label="Email" value={email} onChange={setEmail} type="email" />
            <div className="grid grid-cols-2 gap-2">
              <Button type="button" variant={role === "player" ? "primary" : "ghost"} onClick={() => setRole("player")}>
                Giocatore
              </Button>
              <Button type="button" variant={role === "coach" ? "primary" : "ghost"} onClick={() => setRole("coach")}>
                Allenatore
              </Button>
            </div>
            <Button
              type="button"
              onClick={() => {
                if (name.trim().length < 2 || !email.includes("@")) {
                  setError("Nome e email servono solo a riconoscere il profilo su questo telefono.");
                  return;
                }
                setProfile({ id: state.profile?.id ?? uid("u"), name: name.trim(), email: email.trim(), role });
                setError("");
                setStep("setup");
              }}
            >
              Continua
            </Button>
          </div>
        </Card>
      )}

      {step === "setup" && (
        <Card>
          <h2 className="font-display text-xl font-bold">Sport e giocatore</h2>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {(["padel", "tennis"] as Sport[]).map((item) => (
              <Button key={item} type="button" variant={sport === item ? "primary" : "ghost"} onClick={() => { setSport(item); setPlayerId(""); }}>
                {sportLabel[item]}
              </Button>
            ))}
          </div>
          <ul className="mt-3 space-y-2">
            {list.map((player) => (
              <li key={player.id}>
                <button
                  type="button"
                  onClick={() => {
                    setPlayerId(player.id);
                    if (player.side) setSide(player.side);
                    if (player.partnerName) setPartner(player.partnerName);
                  }}
                  className={`flex min-h-11 w-full items-center justify-between rounded-2xl px-3 text-left ${playerId === player.id ? "bg-lime text-ink" : "bg-white/5"}`}
                >
                  <span>
                    {player.name}
                    <span className="mt-0.5 block text-xs opacity-70">{handLabel[player.hand]} · {player.example ? "giocatore di esempio" : "tuo giocatore"}</span>
                  </span>
                  {player.example && <ExampleMark />}
                </button>
              </li>
            ))}
          </ul>
          {creating ? (
            <div className="mt-3">
              <PlayerForm
                ownerId={state.profile?.id ?? "local"}
                onCancel={() => setCreating(false)}
                onSave={(player) => {
                  upsertPlayer(player);
                  setPlayerId(player.id);
                  setSport(player.sport);
                  if (player.side) setSide(player.side);
                  setCreating(false);
                }}
              />
            </div>
          ) : (
            <Button type="button" variant="ghost" className="mt-3" onClick={() => setCreating(true)}>
              Nuovo giocatore
            </Button>
          )}
          {sport === "padel" && (
            <div className="mt-3 grid grid-cols-2 gap-2">
              {(["right", "left"] as CourtSide[]).map((item) => (
                <Button key={item} type="button" variant={side === item ? "primary" : "ghost"} onClick={() => setSide(item)}>
                  Lato {sideLabel[item].toLowerCase()}
                </Button>
              ))}
            </div>
          )}
          <Button type="button" className="mt-4 w-full" disabled={!playerId} onClick={() => setStep("details")}>
            Continua
          </Button>
        </Card>
      )}

      {step === "details" && (
        <Card>
          <h2 className="font-display text-xl font-bold">Dati della partita</h2>
          <div className="mt-3 space-y-3">
            <TextField label="Data" type="date" value={date} onChange={setDate} />
            <TextField label="Luogo" value={place} onChange={setPlace} placeholder="Circolo, città" />
            <TextField label="Avversari" value={opponents} onChange={setOpponents} />
            <TextField label="Risultato" value={score} onChange={setScore} placeholder="6-4 3-6" />
            {sport === "padel" && <TextField label="Compagno" value={partner} onChange={setPartner} />}
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={() => setStep("setup")}>Indietro</Button>
              <Button type="button" onClick={() => setStep("video")}>Continua</Button>
            </div>
          </div>
        </Card>
      )}

      {step === "video" && (
        <Card>
          <h2 className="font-display text-xl font-bold">Video</h2>
          <p className="mt-1 text-sm text-mute">Dal rullino o dal computer. Se la pagina si chiude, il file resta salvato e puoi riprendere.</p>
          <label className="mt-3 flex min-h-24 cursor-pointer flex-col items-center justify-center rounded-3xl border border-dashed border-lime/40 bg-lime/5 px-4 py-6 text-center">
            <span className="font-semibold">Scegli un video</span>
            <span className="text-xs text-mute">{file ? file.name : "mp4, mov, clip anche breve"}</span>
            <input
              type="file"
              accept="video/*"
              className="sr-only"
              onChange={(event) => {
                const next = event.target.files?.[0];
                if (!next) return;
                if (next.size > 800_000_000) {
                  setError("Il file è troppo grande per il telefono. Taglia una clip più corta.");
                  return;
                }
                setFile(next);
                setError("");
              }}
            />
          </label>
          <p className="mt-3 text-sm text-mute">
            Non comprimiamo il video: su iPhone un ricodificatore in pagina va spesso in crash. Leggiamo i fotogrammi così come sono.
          </p>
          <p className="mt-2 text-sm text-mute">
            Import da YouTube o Drive non disponibile in questa versione gratuita. Salva il video sul telefono e caricalo da qui.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" variant="ghost" onClick={() => setStep("details")}>Indietro</Button>
            <Button type="button" disabled={!file} onClick={() => setStep("guide")}>Ho il video</Button>
          </div>
          <div className="mt-4 space-y-2">
            <p className="text-sm font-semibold">Oppure apri un esempio</p>
            {examples.slice(0, 3).map((match) => (
              <Link key={match.id} href={`/partita/?id=${match.id}`} className="flex min-h-11 items-center justify-between rounded-2xl bg-white/5 px-3">
                <span className="text-sm">{formatDate(match.date)} · {match.score}</span>
                <ExampleMark />
              </Link>
            ))}
          </div>
          {state.apiBaseUrl && (
            <Button type="button" variant="sand" className="mt-3 w-full" disabled={!file || busy} onClick={runApi}>
              Invia all&apos;analisi locale
            </Button>
          )}
        </Card>
      )}

      {step === "guide" && (
        <Card>
          <h2 className="font-display text-xl font-bold">La ripresa regge?</h2>
          <ul className="mt-3 space-y-2">
            {guideItems.map((item, index) => (
              <li key={item}>
                <label className="flex min-h-11 items-start gap-3 rounded-2xl bg-white/5 px-3 py-2">
                  <input
                    type="checkbox"
                    className="mt-1 h-5 w-5 accent-lime"
                    checked={checks[index]}
                    onChange={(event) => setChecks((current) => current.map((value, itemIndex) => (itemIndex === index ? event.target.checked : value)))}
                  />
                  <span className="text-sm">{item}</span>
                </label>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex gap-2">
            <Button type="button" variant="ghost" onClick={() => setStep("video")}>Indietro</Button>
            <Button type="button" disabled={checks.some((value) => !value)} onClick={() => setStep("pick")}>
              Il video è così
            </Button>
          </div>
        </Card>
      )}

      {step === "pick" && (
        <Card>
          <h2 className="font-display text-xl font-bold">Chi seguiamo?</h2>
          <p className="mt-1 text-sm text-mute">Tocca il giocatore. Se vuoi, ingrandisci. Il colore sotto il dito diventa la maglia di riferimento.</p>
          <div className="mt-3 overflow-auto rounded-3xl bg-black">
            <div className="relative" style={{ transform: `scale(${zoom})`, transformOrigin: "center top" }}>
              <canvas
                ref={canvasRef}
                className="w-full"
                onPointerDown={(event) => {
                  const rect = event.currentTarget.getBoundingClientRect();
                  const x = (event.clientX - rect.left) / rect.width;
                  const y = (event.clientY - rect.top) / rect.height;
                  setHint({ x, y });
                  const ctx = event.currentTarget.getContext("2d");
                  if (!ctx) return;
                  const pixel = ctx.getImageData(Math.floor(x * event.currentTarget.width), Math.floor(y * event.currentTarget.height), 1, 1).data;
                  setShirt([pixel[0], pixel[1], pixel[2]]);
                }}
              />
              {hint && (
                <span
                  className="pointer-events-none absolute h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-lime"
                  style={{ left: `${hint.x * 100}%`, top: `${hint.y * 100}%` }}
                />
              )}
            </div>
          </div>
          {preview && !hint && <p className="mt-2 text-xs text-mute">Fotogramma pronto. Tocca la persona, non il campo vuoto.</p>}
          <div className="mt-3 flex gap-2">
            <Button type="button" variant="ghost" onClick={() => setZoom((value) => Math.max(1, value - 0.5))}>Zoom −</Button>
            <Button type="button" variant="ghost" onClick={() => setZoom((value) => Math.min(3, value + 0.5))}>Zoom +</Button>
          </div>
          <p className="mt-2 text-sm text-mute">Maglia: {shirtColorName(shirt)}. {hint ? "Giocatore segnato." : "Ancora nessun tocco."}</p>
          {selected && <p className="text-sm">Analisi per {selected.name}, mano {handLabel[selected.hand as Hand].toLowerCase()}.</p>}
          <div className="mt-3 flex gap-2">
            <Button type="button" variant="ghost" onClick={() => setStep("guide")}>Indietro</Button>
            <Button type="button" disabled={!hint || busy} onClick={runBrowser}>Avvia analisi</Button>
          </div>
        </Card>
      )}

      {step === "run" && (
        <Card>
          <h2 className="font-display text-xl font-bold">Analisi in corso</h2>
          <div className="mt-3 h-3 overflow-hidden rounded-full bg-white/10">
            <div className="h-3 rounded-full bg-lime" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-2 text-sm">{progress}%</p>
          <ul className="mt-2 space-y-1 text-sm text-mute">
            {log.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <Button
            type="button"
            variant="ghost"
            className="mt-3"
            onClick={() => {
              abortRef.current?.abort();
              setBusy(false);
              setStep("pick");
            }}
          >
            Annulla
          </Button>
        </Card>
      )}

      {error && <Banner tone="clay">{error}</Banner>}
      <video ref={videoRef} playsInline muted preload="auto" className="pointer-events-none fixed left-0 top-0 -z-10 h-32 w-32 opacity-0" />
      <p className="text-xs text-mute">{it.installIos}</p>
    </div>
  );
}
