"use client";

import { ChevronLeft, ChevronRight, Play, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { CLIP_AFTER, CLIP_BEFORE, clipWindow, exampleImpact, isHighlight } from "@/lib/clips";
import { cx, formatTime } from "@/lib/format";
import { shotName } from "@/lib/analyst";
import { outcomeLabel } from "@/lib/i18n";
import type { Shot } from "@/lib/types";

type RailFilter = "all" | "free" | "errors" | "winners";

export function ClipRail({ shots, videoUrl, example }: { shots: Shot[]; videoUrl: string | null; example: boolean }) {
  const [filter, setFilter] = useState<RailFilter>("all");
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const [open, setOpen] = useState<number | null>(null);
  const [highlight, setHighlight] = useState(false);
  const [duration, setDuration] = useState(0);
  const modalRef = useRef<HTMLVideoElement>(null);

  const pool = useMemo(
    () => shots.filter((shot) => isHighlight(shot) || shot.outcome === "unclassified").sort((a, b) => a.tImpact - b.tImpact),
    [shots],
  );
  const errorsOnly = useMemo(
    () => pool.filter((shot) => shot.outcome === "unforced_error" || shot.outcome === "forced_error"),
    [pool],
  );
  const clips = highlight
    ? errorsOnly
    : filter === "free"
      ? pool.filter((shot) => shot.outcome === "unforced_error")
      : filter === "errors"
        ? pool.filter((shot) => shot.outcome === "forced_error")
        : filter === "winners"
          ? pool.filter((shot) => shot.outcome === "winner")
          : pool;

  const impactOf = (shot: Shot, index: number, total: number, length: number) =>
    !example || shot.manuallyCorrected ? shot.tImpact : exampleImpact(index, total, length);

  const boundsOf = (shot: Shot, index: number) => {
    const impact = impactOf(shot, index, clips.length, duration || (example ? 15 : shot.tImpact));
    return clipWindow(impact, duration || impact + CLIP_AFTER);
  };

  useEffect(() => {
    if (!videoUrl || !clips.length) return;
    let cancel = false;
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.src = videoUrl;
    const canvas = document.createElement("canvas");
    canvas.width = 320;
    canvas.height = 180;
    const ctx = canvas.getContext("2d");
    const ready = new Promise<void>((resolve) => {
      video.onloadedmetadata = () => {
        if (Number.isFinite(video.duration)) setDuration(video.duration);
        resolve();
      };
    });
    const run = async () => {
      await ready;
      const next: Record<string, string> = {};
      for (let index = 0; index < Math.min(clips.length, 18); index += 1) {
        if (cancel || !ctx) return;
        const range = clipWindow(
          impactOf(clips[index], index, clips.length, video.duration || 15),
          video.duration || 15,
        );
        video.currentTime = Math.min(Math.max(0, (video.duration || range.start) - 0.05), range.start + 0.35);
        await new Promise((resolve) => {
          const done = () => resolve(undefined);
          video.addEventListener("seeked", done, { once: true });
          setTimeout(done, 700);
        });
        if (cancel) return;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        next[clips[index].id] = canvas.toDataURL("image/jpeg", 0.72);
        setThumbs({ ...next });
      }
    };
    run().catch(() => undefined);
    return () => {
      cancel = true;
      video.src = "";
    };
  }, [videoUrl, clips, example]);

  useEffect(() => {
    const video = modalRef.current;
    if (!video || open == null || !clips[open]) return;
    const range = boundsOf(clips[open], open);
    const onTime = () => {
      if (video.currentTime < range.end - 0.08) return;
      if (highlight && open < clips.length - 1) setOpen(open + 1);
      else video.pause();
    };
    video.addEventListener("timeupdate", onTime);
    const play = () => video.play().catch(() => undefined);
    const seeked = () => play();
    video.addEventListener("seeked", seeked, { once: true });
    video.currentTime = range.start;
    return () => video.removeEventListener("timeupdate", onTime);
  }, [open, highlight, clips, duration, example]);

  function playAt(index: number, asHighlight = false) {
    const list = asHighlight ? errorsOnly : clips;
    const shot = list[index];
    if (!shot) return;
    setHighlight(asHighlight);
    setOpen(index);
    const video = modalRef.current;
    if (!video) return;
    const range = clipWindow(impactOf(shot, index, list.length, duration || 15), duration || shot.tImpact + CLIP_AFTER);
    video.currentTime = range.start;
    video.play().catch(() => undefined);
  }

  return (
    <section>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="font-display text-lg font-bold">Clip</h2>
        <button
          type="button"
          className="min-h-11 rounded-full bg-coral/15 px-3 text-sm font-semibold text-coral"
          onClick={() => playAt(0, true)}
        >
          Highlight errori
        </button>
      </div>
      <div className="no-print mb-3 flex gap-2 overflow-x-auto">
        {(
          [
            ["all", "Tutti"],
            ["free", "Gratuiti"],
            ["errors", "Errori"],
            ["winners", "Vincenti"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => { setHighlight(false); setFilter(id); }}
            className={cx("min-h-11 shrink-0 rounded-full px-3 text-sm transition", filter === id ? "bg-lime font-semibold text-ink" : "bg-white/5")}
          >
            {label}
          </button>
        ))}
      </div>
      <ul className="flex snap-x gap-3 overflow-x-auto pb-1">
        {clips.map((shot, index) => (
          <li key={shot.id} className="w-40 shrink-0 snap-start">
            <button type="button" onClick={() => playAt(index)} className="clip-card w-full overflow-hidden rounded-3xl border border-white/10 bg-pine text-left">
              <span className="relative block aspect-video bg-black">
                {thumbs[shot.id] ? (
                  <img src={thumbs[shot.id]} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="grid h-full place-items-center text-[11px] text-mute">{example ? "ESEMPIO" : "…"}</span>
                )}
                <Play size={16} className="absolute bottom-2 right-2 rounded-full bg-black/70 p-1 text-lime" />
              </span>
              <span className="block px-3 py-2">
                <span className={cx("text-xs font-bold", shot.outcome === "winner" ? "text-lime" : shot.outcome === "unforced_error" ? "text-clay" : "text-coral")}>
                  {outcomeLabel[shot.outcome]}
                </span>
                <span className="mt-0.5 block text-sm">{shotName(shot)}</span>
                {shot.note && <span className="mt-1 line-clamp-4 block text-[11px] leading-snug text-sand">{shot.note}</span>}
                <span className="text-[11px] text-mute">{formatTime(shot.tImpact)} · {CLIP_BEFORE}s+{CLIP_AFTER}s</span>
              </span>
            </button>
          </li>
        ))}
      </ul>

      {open != null && clips[open] && (
        <div className="fixed inset-0 z-40 flex items-end bg-black/80 sm:items-center sm:justify-center" role="dialog" aria-modal="true" aria-label="Clip">
          <div className="w-full max-w-lg overflow-hidden rounded-t-3xl bg-ink sm:rounded-3xl" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
            {videoUrl ? (
              <video
                ref={modalRef}
                src={videoUrl}
                playsInline
                controls
                className="aspect-video w-full bg-black"
              />
            ) : (
              <p className="grid aspect-video place-items-center text-sm text-mute">Video non disponibile</p>
            )}
            <div className="flex items-center gap-2 px-3 py-3">
              <button type="button" className="grid h-11 w-11 place-items-center rounded-full bg-white/10" aria-label="Clip precedente" onClick={() => setOpen(Math.max(0, open - 1))}>
                <ChevronLeft />
              </button>
              <div className="min-w-0 flex-1 text-center">
                <p className="truncate font-semibold">{outcomeLabel[clips[open].outcome]} · {shotName(clips[open])}</p>
                <p className="text-xs text-mute">{highlight ? "Highlight" : "Clip"} {open + 1}/{clips.length}</p>
                {clips[open].note && <p className="mt-1 text-left text-xs leading-relaxed text-sand">{clips[open].note}</p>}
              </div>
              <button type="button" className="grid h-11 w-11 place-items-center rounded-full bg-white/10" aria-label="Clip successiva" onClick={() => setOpen(Math.min(clips.length - 1, open + 1))}>
                <ChevronRight />
              </button>
              <button type="button" className="grid h-11 w-11 place-items-center rounded-full bg-white/10" aria-label="Chiudi" onClick={() => { setOpen(null); setHighlight(false); }}>
                <X />
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
