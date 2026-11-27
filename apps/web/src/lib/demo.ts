import type { Sport } from "./types";

const base = process.env.NEXT_PUBLIC_BASE_PATH || "";

/** Free Mixkit tennis clips. Padel examples use a tennis stand-in and say so. */
export function demoVideo(sport: Sport): { src: string; credit: string } {
  if (sport === "padel") {
    return {
      src: `${base}/demo/padel-demo.mp4`,
      credit: "ESEMPIO · Mixkit 877, licenza gratuita. È tennis, non la partita.",
    };
  }
  return {
    src: `${base}/demo/tennis-demo.mp4`,
    credit: "ESEMPIO · Mixkit 869, licenza gratuita. Non è la partita.",
  };
}
