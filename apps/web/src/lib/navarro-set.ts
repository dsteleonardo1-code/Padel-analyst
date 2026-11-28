import type { Match, Player, Rally, Shot } from "./types";

const SOURCE = "https://www.dailymotion.com/video/x273mqn";

/**
 * Set 1 of a full World Padel Tour match (Lisboa).
 * The file in /demo/lisboa-set.mp4 starts at 14:00 of the broadcast,
 * which is the beginning of the match clock.
 * No shot is pre-tagged: the fixed wide camera does not show the ball
 * result clearly enough to mark winners and errors without guessing.
 */
export function buildNavarroSet(): { player: Player; match: Match; rallies: Rally[]; shots: Shot[] } {
  const player: Player = {
    id: "p-navarro",
    name: "Paquito Navarro",
    sport: "padel",
    hand: "right",
    side: "right",
    level: "competition",
    partnerName: "Adrián Allemandi",
    playStyle: "doubles",
    backhand: null,
    ownerId: "local",
    example: true,
  };

  const match: Match = {
    id: "m-navarro-set",
    sport: "padel",
    date: "2014-01-01",
    place: "Lisboa Open",
    format: "Set 1",
    score: "Set 1",
    opponents: "Company / Escalante",
    partner: "Adrián Allemandi",
    videoUrl: "/demo/lisboa-set.mp4",
    status: "ready",
    ownerId: "local",
    focusPlayerId: "p-navarro",
    side: "right",
    example: true,
    saved: true,
    source: "browser_heuristic",
    durationSec: 1980,
    confidenceNote:
      "colpi segnati a mano (prova), non riconoscimento automatico. ESEMPIO: partita intera, nessun colpo pre-segnato perché il risultato della palla non si legge. Segna tu.",
    observation: { court: true, ball: false, pose: false, position: false },
    unclassifiedSegments: [],
    limitNote: `World Padel Tour, Lisboa Open. Company/Escalante contro Allemandi/Navarro. Il nome Paquito Navarro si legge sulla maglia rossa. Video: set 1, dal via fino al 6-4 letto sul tabellone (circa 14:00–47:00 della diretta). Fonte: ${SOURCE}. Ale Galán non è in questa partita: le finali Premier Padel con lui, su Dailymotion, sono solo highlights.`,
  };

  return { player, match, rallies: [], shots: [] };
}
