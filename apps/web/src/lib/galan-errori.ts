import type { Match, Rally, Shot } from "./types";

const SOURCE = "https://www.dailymotion.com/video/xa6xfe4";

/**
 * Hand tags from frames of the Dailymotion highlights (xa6xfe4),
 * on the 0:20–2:50 excerpt served as /demo/galan-prova.mp4.
 * Clip clock = full-video clock minus 20s. Only shots whose ball
 * result is visible are included.
 */
export function buildGalanErrorSheet(): { match: Match; rallies: Rally[]; shots: Shot[] } {
  const shots: Shot[] = [
    {
      id: "m-galan-errori-s1",
      rallyId: "m-galan-errori-r1",
      matchId: "m-galan-errori",
      playerId: "p-galan",
      team: 1,
      tImpact: 90.6,
      type: "unclassified",
      bodySide: "unknown",
      impactX: 0.42,
      impactY: 0.72,
      landX: 0.4,
      landY: 0.78,
      impactHeight: 0.2,
      outcome: "forced_error",
      errorReason: "position",
      errorCause: "position",
      situation: "net",
      zone: "net",
      confidence: 1,
      manuallyCorrected: true,
      serveNumber: null,
      example: true,
      note: "Palla bassa sui piedi, a rete: allunga la racchetta tardi, la palla gli resta addosso e non torna. Abbassarsi prima e fare il passo, invece di arrivare con la racchetta a palla già morta.",
    },
  ];

  const rallies: Rally[] = [
    {
      id: "m-galan-errori-r1",
      matchId: "m-galan-errori",
      number: 1,
      tStart: 87.6,
      tEnd: 93,
      winnerTeam: null,
      serverTeam: null,
    },
  ];

  const match: Match = {
    id: "m-galan-errori",
    sport: "padel",
    date: "2026-03-15",
    place: "Brussels P2",
    format: "Highlight",
    score: "Prova errori",
    opponents: "Guerrero / Navarro",
    partner: "Federico Chingotto",
    videoUrl: "/demo/galan-prova.mp4",
    status: "ready",
    ownerId: "local",
    focusPlayerId: "p-galan",
    side: "left",
    example: true,
    saved: true,
    source: "browser_heuristic",
    durationSec: 150.12,
    confidenceNote:
      "colpi segnati a mano (prova), non riconoscimento automatico. ESEMPIO: solo i colpi visti nei fotogrammi.",
    observation: { court: false, ball: true, pose: false, position: true },
    unclassifiedSegments: [],
    limitNote: `Ale Galán, cappellino bianco e maglia nera. Un errore a 1:31: palla bassa non rimessa. Negli altri fotogrammi non ho visto una sua palla in rete, un fuori o un vincente, e non li ho segnati. Fonte: ${SOURCE} (beIN SPORTS, spezzone 0:20–2:50).`,
  };

  return { match, rallies, shots };
}
