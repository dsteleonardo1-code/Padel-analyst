"use client";

import { Pause, Play, SkipBack, SkipForward } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { formatTime } from "@/lib/format";
import type { Match, Shot } from "@/lib/types";

export function VideoStage({
  match,
  shots,
  videoUrl,
  onReady,
  onPrev,
  onNext,
}: {
  match: Match;
  shots: Shot[];
  videoUrl: string | null;
  onReady: (seek: (time: number) => void) => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const onReadyRef = useRef(onReady);
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const timeRef = useRef(0);
  onReadyRef.current = onReady;

  useEffect(() => {
    onReadyRef.current((next) => {
      const safe = Math.max(0, next);
      timeRef.current = safe;
      setTime(safe);
      if (videoRef.current) {
        videoRef.current.currentTime = safe;
        videoRef.current.play().catch(() => undefined);
      } else {
        setPlaying(true);
      }
    });
  }, [videoUrl]);

  useEffect(() => {
    if (videoUrl) return;
    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      if (playing) {
        const delta = (now - last) / 1000;
        timeRef.current = Math.min(match.durationSec, timeRef.current + delta);
        setTime(timeRef.current);
        if (timeRef.current >= match.durationSec) setPlaying(false);
      }
      last = now;
      draw(canvasRef.current, match, shots, timeRef.current);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [match, shots, playing, videoUrl]);

  return (
    <div id="stage" className="overflow-hidden rounded-3xl border border-white/10 bg-black">
      {videoUrl ? (
        <video
          ref={videoRef}
          src={videoUrl}
          controls
          playsInline
          preload="metadata"
          className="aspect-video w-full bg-black"
          onTimeUpdate={(event) => setTime(event.currentTarget.currentTime)}
        />
      ) : (
        <canvas ref={canvasRef} width={640} height={360} className="aspect-video w-full bg-[#10241c]" />
      )}
      <div className="flex items-center gap-2 px-3 py-2">
        <button type="button" className="grid h-11 w-11 place-items-center rounded-full bg-white/10" onClick={onPrev} aria-label="Punto precedente">
          <SkipBack size={18} />
        </button>
        {!videoUrl && (
          <button
            type="button"
            className="grid h-11 w-11 place-items-center rounded-full bg-lime text-ink"
            onClick={() => setPlaying((value) => !value)}
            aria-label={playing ? "Pausa" : "Play"}
          >
            {playing ? <Pause size={18} /> : <Play size={18} />}
          </button>
        )}
        <button type="button" className="grid h-11 w-11 place-items-center rounded-full bg-white/10" onClick={onNext} aria-label="Punto successivo">
          <SkipForward size={18} />
        </button>
        <span className="ml-auto font-display text-sm tabular-nums text-sand">
          {formatTime(time)} / {formatTime(videoUrl ? videoRef.current?.duration || match.durationSec : match.durationSec)}
        </span>
      </div>
      {!videoUrl && (
        <label className="block px-3 pb-3">
          <span className="sr-only">Posizione nel tempo</span>
          <input
            type="range"
            min={0}
            max={match.durationSec}
            step={0.1}
            value={Math.min(time, match.durationSec)}
            onChange={(event) => {
              const next = Number(event.target.value);
              timeRef.current = next;
              setTime(next);
            }}
            className="w-full accent-lime"
          />
        </label>
      )}
      <p className="px-3 pb-3 text-xs leading-relaxed text-mute">
        {match.example
          ? "Ricostruzione di esempio: non è un video reale. I pallini seguono i colpi dimostrativi."
          : videoUrl
            ? "Video caricato, rimasto su questo telefono."
            : "Ricostruzione dai colpi. Il file video non è in questo link."}
      </p>
    </div>
  );
}

function draw(canvas: HTMLCanvasElement | null, match: Match, shots: Shot[], time: number) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#10241c";
  ctx.fillRect(0, 0, w, h);
  const left = 70;
  const top = 28;
  const width = w - 140;
  const height = h - 64;
  ctx.strokeStyle = "#f4efe4";
  ctx.lineWidth = 2;
  ctx.strokeRect(left, top, width, height);
  ctx.strokeStyle = "#d6ff3f";
  ctx.beginPath();
  ctx.moveTo(left, top + height / 2);
  ctx.lineTo(left + width, top + height / 2);
  ctx.stroke();
  ctx.fillStyle = "#a8b6ad";
  ctx.font = "14px sans-serif";
  ctx.fillText(match.sport === "padel" ? "Padel" : "Tennis", 16, 24);
  ctx.fillText("fondo", left + width / 2 - 18, h - 16);

  const toX = (value: number) => left + value * width;
  const toY = (value: number) => top + height - value * height;
  for (const shot of shots) {
    ctx.fillStyle = shot.outcome === "winner" ? "#d6ff3f" : shot.outcome === "unforced_error" || shot.outcome === "forced_error" ? "#ff5d6c" : "#f4efe4";
    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    ctx.arc(toX(shot.impactX), toY(shot.impactY), 5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  const active = [...shots].reverse().find((shot) => time >= shot.tImpact && time <= shot.tImpact + 0.9);
  if (active) {
    const progress = Math.min(1, (time - active.tImpact) / 0.9);
    const x = active.impactX + (active.landX - active.impactX) * progress;
    const y = active.impactY + (active.landY - active.impactY) * progress;
    ctx.fillStyle = "#d6ff3f";
    ctx.beginPath();
    ctx.arc(toX(x), toY(y), 8, 0, Math.PI * 2);
    ctx.fill();
  }
}
