import { classifyHeuristic, detectImpacts, extractBlobs, greenRatio, groupByGap, motionMask, nearestBlob } from "./analyze";
import type { Hand, ShotType, Sport, UnclassifiedSegment } from "./types";

export interface BrowserShotDraft {
  rallyIndex: number;
  tImpact: number;
  type: ShotType;
  bodySide: "forehand" | "backhand" | "overhead" | "unknown";
  impactX: number;
  impactY: number;
  landX: number;
  landY: number;
  impactHeight: number;
  outcome: "unclassified";
  errorReason: null;
  errorCause: null;
  situation: "baseline";
  confidence: number;
  serveNumber: 1 | 2 | null;
  note: string;
}

export interface BrowserAnalysis {
  shots: BrowserShotDraft[];
  segments: UnclassifiedSegment[];
  greenMean: number;
  ballSeenRatio: number;
  log: string[];
  coveredSec: number;
}

const WIDTH = 96;
const HEIGHT = 54;
const MAX_SECONDS = 8 * 60;
const STEP = 0.5;

function waitSeek(video: HTMLVideoElement, time: number): Promise<void> {
  return new Promise((resolve) => {
    const target = Math.max(0, time);
    if (Math.abs(video.currentTime - target) < 0.04) {
      resolve();
      return;
    }
    const done = () => {
      video.removeEventListener("seeked", done);
      window.clearTimeout(timer);
      resolve();
    };
    const timer = window.setTimeout(done, 700);
    video.addEventListener("seeked", done);
    try {
      video.currentTime = target;
    } catch {
      done();
    }
  });
}

export async function analyzeVideoElement(options: {
  video: HTMLVideoElement;
  sport: Sport;
  hand: Hand;
  hint: { x: number; y: number } | null;
  onProgress: (progress: number, line: string) => void;
  signal?: AbortSignal;
}): Promise<BrowserAnalysis> {
  const { video, sport, hand, hint, onProgress, signal } = options;
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("Canvas non disponibile su questo telefono.");

  const duration = Number.isFinite(video.duration) ? video.duration : MAX_SECONDS;
  const covered = Math.min(duration, MAX_SECONDS);
  const log: string[] = [];
  log.push(
    covered < duration - 1
      ? `Sul telefono analizzo i primi ${Math.round(covered / 60)} minuti. Il resto resta non classificato.`
      : "Leggo il video un fotogramma ogni mezzo secondo.",
  );
  onProgress(2, log[0]);

  let previous: Uint8ClampedArray | null = null;
  const samples: {
    t: number;
    playerEnergy: number;
    ballSeen: boolean;
    playerX: number | null;
    playerY: number | null;
    ballX: number | null;
    ballY: number | null;
  }[] = [];
  let greenSum = 0;
  let frames = 0;
  let ballFrames = 0;
  let sticky: { x: number; y: number } | null = hint;

  for (let time = 0.15; time < covered; time += STEP) {
    if (signal?.aborted) throw new DOMException("Analisi annullata", "AbortError");
    await waitSeek(video, time);
    context.drawImage(video, 0, 0, WIDTH, HEIGHT);
    const frame = context.getImageData(0, 0, WIDTH, HEIGHT).data;
    greenSum += greenRatio(frame);
    frames += 1;
    if (previous) {
      const blobs = extractBlobs(motionMask(previous, frame), WIDTH, HEIGHT);
      const player = nearestBlob(blobs.players, sticky, hint);
      if (player) sticky = { x: player.x, y: player.y };
      const ball = blobs.balls[0] ?? null;
      if (ball) ballFrames += 1;
      const energy = player ? Math.min(1, player.area / 70) : 0;
      samples.push({
        t: time,
        playerEnergy: energy,
        ballSeen: Boolean(ball),
        playerX: player?.x ?? sticky?.x ?? null,
        playerY: player?.y ?? sticky?.y ?? null,
        ballX: ball?.x ?? null,
        ballY: ball?.y ?? null,
      });
    }
    previous = new Uint8ClampedArray(frame);
    if (frames % 2 === 0) {
      onProgress(Math.min(88, Math.round((time / covered) * 88)), `Fotogramma ${frames}, ${Math.round(time)}s`);
      await new Promise((resolve) => window.setTimeout(resolve, 0));
    }
  }

  const greenMean = frames ? greenSum / frames : 0;
  const impacts = detectImpacts(samples, { minEnergy: 0.42, minGap: 0.9 });
  const rallies = groupByGap(impacts, 4.2);
  const courtVisible = greenMean >= 0.08;
  log.push(
    courtVisible
      ? "Vedo del verde, ma non misuro le linee: gli esiti restano non classificati."
      : "Il campo non è abbastanza visibile. I colpi, se ci sono, hanno confidenza bassa.",
  );
  log.push(`Picchi di movimento vicini al giocatore: ${impacts.length}.`);

  const shots: BrowserShotDraft[] = [];
  rallies.forEach((rally, rallyIndex) => {
    rally.forEach((impact, index) => {
      const guess = classifyHeuristic({
        sport,
        hand,
        indexInRally: index,
        imageX: impact.playerX ?? 0.5,
        imageY: impact.playerY ?? 0.7,
        ballX: impact.ballX,
        ballY: impact.ballY,
        heightProxy: 1 - (impact.playerY ?? 0.75),
        courtVisible,
      });
      shots.push({
        rallyIndex,
        tImpact: impact.t,
        type: guess.type,
        bodySide: guess.bodySide,
        impactX: impact.playerX ?? 0.5,
        impactY: Math.min(0.95, Math.max(0.05, 1 - (impact.playerY ?? 0.7))),
        landX: impact.ballX ?? impact.playerX ?? 0.5,
        landY: impact.ballY != null ? Math.min(0.95, Math.max(0.05, 1 - impact.ballY)) : 0.6,
        impactHeight: 1,
        outcome: "unclassified",
        errorReason: null,
        errorCause: null,
        situation: "baseline",
        confidence: guess.confidence,
        serveNumber: guess.type === "serve" ? 1 : null,
        note: guess.note,
      });
    });
  });

  const segments: UnclassifiedSegment[] = [];
  if (!shots.length) {
    segments.push({
      t0: 0,
      t1: duration,
      note: "Nessun colpo distinto. L'intero video resta non classificato: non è stato scartato.",
    });
  }
  if (duration - covered > 1.5) {
    segments.push({
      t0: covered,
      t1: duration,
      note: "Oltre gli 8 minuti analizzabili sul telefono. Questa parte non è classificata.",
    });
  }
  for (const shot of shots) {
    if (shot.type === "unclassified") {
      segments.push({
        t0: Math.max(0, shot.tImpact - 0.4),
        t1: shot.tImpact + 0.4,
        note: "Movimento visto, colpo non classificato.",
      });
    }
  }

  onProgress(100, "Report pronto.");
  return {
    shots,
    segments,
    greenMean,
    ballSeenRatio: frames ? ballFrames / frames : 0,
    log,
    coveredSec: covered,
  };
}
