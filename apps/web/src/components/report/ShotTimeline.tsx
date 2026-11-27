"use client";

import { formatTime } from "@/lib/format";
import { shotName } from "@/lib/analyst";
import type { Shot } from "@/lib/types";

const color: Record<Shot["outcome"], string> = {
  winner: "#d6ff3f",
  unforced_error: "#ff7a45",
  forced_error: "#ff5d6c",
  neutral: "#8fd0c4",
  unclassified: "#5c6b64",
};

export function ShotTimeline({
  shots,
  duration,
  time,
  onSeek,
}: {
  shots: Shot[];
  duration: number;
  time: number;
  onSeek: (time: number) => void;
}) {
  const span = Math.max(duration, 0.1);
  const play = Math.min(100, Math.max(0, (time / span) * 100));

  return (
    <div className="surface px-3 py-3">
      <div className="mb-2 flex items-center justify-between text-[11px] uppercase tracking-[0.16em] text-mute">
        <span>Timeline</span>
        <span className="tabular-nums">{formatTime(time)}</span>
      </div>
      <div className="relative h-10">
        <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-white/10" />
        <span className="absolute top-1/2 h-3 w-0.5 -translate-y-1/2 bg-sand/80" style={{ left: `${play}%` }} />
        {shots.map((shot) => (
          <button
            key={shot.id}
            type="button"
            aria-label={`${formatTime(shot.tImpact)} ${shotName(shot)}`}
            onClick={() => onSeek(shot.tImpact)}
            className="press absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border border-black/40"
            style={{ left: `${Math.min(100, Math.max(0, (shot.tImpact / span) * 100))}%`, background: color[shot.outcome] }}
          />
        ))}
      </div>
    </div>
  );
}
