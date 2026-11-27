import type { CourtSide } from "./types";

export function readPlayerCue(text: string): { side: CourtSide | null; label: string } {
  const clean = text.trim().replace(/\s+/g, " ");
  const lower = clean.toLowerCase();
  const side: CourtSide | null = lower.includes("sinistr") ? "left" : lower.includes("destr") ? "right" : null;
  return { side, label: clean };
}
