import { classifyHeuristic, groupByGap } from "./analyze";
import peaksFile from "./galan-peaks.json";
import type { Match, Player, Rally, Shot } from "./types";

const peaks = peaksFile.peaks as Array<{ t: number; e: number; px: number | null; py: number | null; bx: number | null; by: number | null }>;

const SOURCE = "https://www.dailymotion.com/video/xa6xfe4";

/** Motion-only sheet for a private test on a third-party highlights clip. Outcomes stay unclassified. */
export function buildGalanSheet(): { player: Player; match: Match; rallies: Rally[]; shots: Shot[] } {
  const impacts = peaks.map((peak) => ({
    t: peak.t,
    energy: peak.e,
    playerX: peak.px,
    playerY: peak.py,
    ballX: peak.bx,
    ballY: peak.by,
  }));
  const groups = groupByGap(impacts, 4.5);
  const shots: Shot[] = [];
  const rallies: Rally[] = groups.map((group, index) => {
    const rallyId = `m-galan-r${index + 1}`;
    group.forEach((impact, shotIndex) => {
      const guess = classifyHeuristic({
        sport: "padel",
        hand: "right",
        indexInRally: shotIndex,
        imageX: impact.playerX ?? 0.7,
        imageY: impact.playerY ?? 0.7,
        ballX: impact.ballX,
        ballY: impact.ballY,
        heightProxy: 1 - (impact.playerY ?? 0.7),
        courtVisible: false,
      });
      shots.push({
        id: `m-galan-s${shots.length + 1}`,
        rallyId,
        matchId: "m-galan",
        playerId: "p-galan",
        team: 1,
        tImpact: impact.t,
        type: guess.type,
        bodySide: guess.bodySide,
        impactX: impact.playerX ?? 0.7,
        impactY: Math.min(0.95, Math.max(0.05, 1 - (impact.playerY ?? 0.7))),
        landX: impact.ballX ?? impact.playerX ?? 0.5,
        landY: impact.ballY != null ? Math.min(0.95, Math.max(0.05, 1 - impact.ballY)) : 0.6,
        impactHeight: 1,
        outcome: "unclassified",
        errorReason: null,
        errorCause: null,
        situation: "baseline",
        confidence: guess.confidence,
        manuallyCorrected: false,
        serveNumber: guess.type === "serve" ? 1 : null,
        example: true,
        note: "STIMA. Movimento vicino alla zona indicata, non un colpo verificato di Galán.",
      });
    });
    return {
      id: rallyId,
      matchId: "m-galan",
      number: index + 1,
      tStart: group[0].t,
      tEnd: group[group.length - 1].t + 1,
      winnerTeam: null,
      serverTeam: null,
    };
  });

  const player: Player = {
    id: "p-galan",
    name: "Ale Galán",
    sport: "padel",
    hand: "right",
    side: "left",
    level: "competition",
    partnerName: "Federico Chingotto",
    playStyle: "doubles",
    backhand: null,
    ownerId: "local",
    example: true,
  };

  const match: Match = {
    id: "m-galan",
    sport: "padel",
    date: "2026-03-15",
    place: "Brussels P2",
    format: "Highlight",
    score: "spezzone",
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
    durationSec: peaksFile.duration,
    confidenceNote:
      "STIMA automatica, senza modello addestrato. ESEMPIO di prova: gli esiti restano non classificati.",
    observation: { court: false, ball: false, pose: false, position: false },
    unclassifiedSegments: [
      {
        t0: 0,
        t1: peaksFile.duration,
        note: "Nessun errore o vincente assegnato: la stima non misura rete e fuori.",
      },
    ],
    limitNote: `Scelta: Ale Galán, maglia nera, lato sinistro della coppia in nero, in basso quando la camera è dietro di loro. Video di terzi, solo prova privata. Fonte: ${SOURCE} (beIN SPORTS USA, spezzone 0:20–2:50).`,
  };

  return { player, match, rallies, shots };
}
