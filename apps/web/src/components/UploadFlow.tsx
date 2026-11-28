"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { analyzeVideoElement } from "@/lib/analyzeVideo";
import { demoVideo } from "@/lib/demo";
import { sheetFromExample } from "@/lib/examples";
import { uid } from "@/lib/format";
import { readPlayerCue } from "@/lib/who";
import { saveVideo } from "@/lib/storage";
import type { CourtSide, Match, Rally, Shot, Sport } from "@/lib/types";
import { useStore } from "./Store";
import { Button } from "./ui";

export function UploadFlow() {
  const router = useRouter();
  const { state, upsertPlayer, upsertMatch } = useStore();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [sport, setSport] = useState<Sport>("padel");
  const [step, setStep] = useState<"load" | "who" | "run">("load");
  const [file, setFile] = useState<File | null>(null);
  const [example, setExample] = useState(false);
  const [hint, setHint] = useState<{ x: number; y: number } | null>(null);
  const [cue, setCue] = useState("");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (step !== "who" || !video || !canvas) return;
    const url = example ? demoVideo(sport).src : file ? URL.createObjectURL(file) : "";
    if (!url) return;
    video.src = url;
    const paint = () => {
      const ctx = canvas.getContext("2d");
      if (!ctx || video.readyState < 2) return;
      canvas.width = 720;
      canvas.height = 405;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    };
    const onData = () => {
      const target = Math.min(0.8, Number.isFinite(video.duration) ? video.duration / 3 : 0.4);
      video.currentTime = target;
    };
    video.addEventListener("loadeddata", onData);
    video.addEventListener("seeked", paint);
    return () => {
      video.removeEventListener("loadeddata", onData);
      video.removeEventListener("seeked", paint);
      if (!example) URL.revokeObjectURL(url);
    };
  }, [step, file, example, sport]);

  function openExample() {
    setExample(true);
    setFile(null);
    setHint(null);
    setError("");
    setStep("who");
  }

  async function createSheet() {
    const parsed = readPlayerCue(cue);
    const side = parsed.side ?? (hint && hint.x < 0.5 ? "left" : hint ? "right" : null);
    const label = parsed.label || (hint ? "Giocatore toccato" : "");
    if (!label && !hint) {
      setError("Tocca il giocatore oppure descrivilo.");
      return;
    }
    if (example) {
      const sheet = sheetFromExample(sport, label || "Giocatore indicato", side);
      sheet.player.side = side;
      sheet.match.side = side;
      sheet.match.limitNote = parsed.label;
      upsertPlayer(sheet.player);
      upsertMatch(sheet.match, sheet.rallies, sheet.shots);
      const blob = await fetch(demoVideo(sport).src).then((response) => response.blob());
      await saveVideo(sheet.match.id, blob);
      router.push(`/partita/?id=${sheet.match.id}`);
      return;
    }
    const video = videoRef.current;
    const playerId = uid("p");
    if (!video || !file) return;
    setStep("run");
    setError("");
    const player = {
      id: playerId,
      name: label || "Giocatore toccato",
      sport,
      hand: "right" as const,
      side,
      level: "intermediate" as const,
      partnerName: "",
      playStyle: sport === "padel" ? ("doubles" as const) : ("singles" as const),
      backhand: sport === "tennis" ? ("two" as const) : null,
      ownerId: state.profile?.id ?? "local",
      example: false,
    };
    upsertPlayer(player);
    try {
      const analysis = await analyzeVideoElement({
        video,
        sport,
        hand: "right",
        hint,
        onProgress: setProgress,
      });
      const matchId = uid("m");
      await saveVideo(matchId, file);
      const rallies: Rally[] = [];
      const shots: Shot[] = [];
      const groups = new Map<number, typeof analysis.shots>();
      for (const draft of analysis.shots) groups.set(draft.rallyIndex, [...(groups.get(draft.rallyIndex) ?? []), draft]);
      for (const [index, group] of groups) {
        const rallyId = `${matchId}-r${index + 1}`;
        group.forEach((draft) => {
          shots.push({
            id: `${matchId}-s${shots.length + 1}`,
            rallyId,
            matchId,
            playerId,
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
          });
        });
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
      const match: Match = {
        id: matchId,
        sport,
        date: new Date().toISOString().slice(0, 10),
        place: "",
        format: sport === "padel" ? "Padel" : "Tennis",
        score: "",
        opponents: "",
        partner: "",
        videoUrl: "",
        status: "ready",
        ownerId: state.profile?.id ?? "local",
        focusPlayerId: playerId,
        side,
        example: false,
        saved: false,
        source: "browser_heuristic",
        durationSec: Number.isFinite(video.duration) ? video.duration : analysis.coveredSec,
        confidenceNote: "Stima sul telefono, sul giocatore che hai indicato.",
        observation: { court: analysis.greenMean >= 0.08, ball: analysis.ballSeenRatio > 0.04, pose: false, position: false },
        unclassifiedSegments: analysis.segments,
        limitNote: parsed.label,
      };
      upsertMatch(match, rallies, shots);
      router.push(`/partita/?id=${match.id}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Analisi interrotta.");
      setStep("who");
    }
  }

  const stepIndex = step === "load" ? 1 : step === "who" ? 2 : 3;

  return (
    <div className="space-y-6 py-4">
      <Steps current={stepIndex} />
      {step === "load" && (
        <section className="rise space-y-5">
          <h1 className="font-display text-4xl font-extrabold leading-none">Video</h1>
          <div className="grid grid-cols-2 gap-2">
            {(["padel", "tennis"] as Sport[]).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setSport(item)}
                className={`press min-h-12 rounded-2xl text-sm font-semibold ${sport === item ? "bg-lime text-ink" : "bg-white/5 text-sand"}`}
              >
                {item === "padel" ? "Padel" : "Tennis"}
              </button>
            ))}
          </div>
          <label className="press flex min-h-16 cursor-pointer items-center justify-center rounded-full bg-lime px-4 text-lg font-bold text-ink shadow-glow">
            Carica video
            <input
              type="file"
              accept="video/*"
              className="sr-only"
              onChange={(event) => {
                const next = event.target.files?.[0];
                if (!next) return;
                setFile(next);
                setExample(false);
                setHint(null);
                setStep("who");
              }}
            />
          </label>
          <button type="button" onClick={openExample} className="press min-h-12 w-full text-sm font-semibold text-lime">
            Prova con l'esempio
          </button>
        </section>
      )}

      {step === "who" && (
        <section className="rise space-y-4">
          <h1 className="font-display text-4xl font-extrabold leading-none">Giocatore</h1>
          <p className="text-sm text-mute">Tocca chi vuoi seguire.</p>
          <div className="relative mt-3 overflow-hidden rounded-[2rem] bg-black">
            <canvas
              ref={canvasRef}
              className="w-full"
              onPointerDown={(event) => {
                const rect = event.currentTarget.getBoundingClientRect();
                setHint({
                  x: (event.clientX - rect.left) / rect.width,
                  y: (event.clientY - rect.top) / rect.height,
                });
              }}
            />
            {hint && (
              <span
                className="pointer-events-none absolute h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-lime"
                style={{ left: `${hint.x * 100}%`, top: `${hint.y * 100}%` }}
              />
            )}
          </div>
          <label className="mt-3 block text-sm">
            <span className="mb-1 block text-mute">Descrizione</span>
            <textarea
              value={cue}
              onChange={(event) => setCue(event.target.value)}
              placeholder="Maglia rossa, lato sinistro, in basso"
              rows={2}
              className="w-full rounded-2xl border border-white/10 bg-ink/60 px-3 py-2 text-base text-sand"
            />
          </label>
          <Button type="button" className="min-h-16 w-full text-lg" disabled={!hint && cue.trim().length < 3} onClick={createSheet}>
            Crea la scheda
          </Button>
          <button type="button" className="min-h-11 w-full text-sm text-mute" onClick={() => setStep("load")}>Indietro</button>
        </section>
      )}

      {step === "run" && (
        <section className="rise space-y-4">
          <h1 className="font-display text-4xl font-extrabold leading-none">Scheda</h1>
          <p className="font-display text-6xl font-extrabold text-lime">{progress}%</p>
          <div className="h-3 overflow-hidden rounded-full bg-white/10">
            <div className="h-3 rounded-full bg-lime transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        </section>
      )}

      {error && <p className="text-sm text-coral">{error}</p>}
      <video ref={videoRef} playsInline muted preload="auto" className="pointer-events-none fixed left-0 top-0 -z-10 h-32 w-32 opacity-0" />
    </div>
  );
}

function Steps({ current }: { current: 1 | 2 | 3 }) {
  return (
    <ol className="grid grid-cols-3 gap-2">
      {["Video", "Giocatore", "Scheda"].map((label, index) => {
        const number = index + 1;
        const on = number === current;
        return (
          <li key={label} className={`rounded-2xl px-2 py-3 text-center ${on ? "bg-lime text-ink" : "bg-white/5 text-mute"}`}>
            <span className="block font-display text-lg font-extrabold leading-none">{number}</span>
            <span className="mt-1 block text-[11px] font-semibold">{label}</span>
          </li>
        );
      })}
    </ol>
  );
}
