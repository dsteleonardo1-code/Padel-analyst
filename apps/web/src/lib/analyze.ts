import type { BodySide, Hand, ShotOutcome, ShotType, Sport } from "./types";

export interface MotionBlob {
  x: number;
  y: number;
  w: number;
  h: number;
  area: number;
}

export interface EnergySample {
  t: number;
  playerEnergy: number;
  ballSeen: boolean;
  playerX: number | null;
  playerY: number | null;
  ballX: number | null;
  ballY: number | null;
}

export interface ImpactCandidate {
  t: number;
  energy: number;
  playerX: number | null;
  playerY: number | null;
  ballX: number | null;
  ballY: number | null;
}

export function motionMask(prev: Uint8ClampedArray, curr: Uint8ClampedArray, threshold = 36): Uint8Array {
  const pixels = curr.length / 4;
  const mask = new Uint8Array(pixels);
  for (let i = 0; i < pixels; i++) {
    const delta =
      Math.abs(curr[i * 4] - prev[i * 4]) +
      Math.abs(curr[i * 4 + 1] - prev[i * 4 + 1]) +
      Math.abs(curr[i * 4 + 2] - prev[i * 4 + 2]);
    mask[i] = delta > threshold ? 1 : 0;
  }
  return mask;
}

export function greenRatio(frame: Uint8ClampedArray): number {
  const pixels = frame.length / 4;
  if (!pixels) return 0;
  let green = 0;
  for (let i = 0; i < pixels; i++) {
    const r = frame[i * 4];
    const g = frame[i * 4 + 1];
    const b = frame[i * 4 + 2];
    if (g > 70 && g > r * 1.15 && g > b * 1.05) green += 1;
  }
  return green / pixels;
}

export function extractBlobs(mask: Uint8Array, width: number, height: number): { players: MotionBlob[]; balls: MotionBlob[] } {
  const seen = new Uint8Array(mask.length);
  const players: MotionBlob[] = [];
  const balls: MotionBlob[] = [];
  const stack: number[] = [];

  for (let start = 0; start < mask.length; start++) {
    if (!mask[start] || seen[start]) continue;
    stack.push(start);
    seen[start] = 1;
    let minX = width;
    let minY = height;
    let maxX = 0;
    let maxY = 0;
    let area = 0;
    while (stack.length) {
      const index = stack.pop() as number;
      const x = index % width;
      const y = (index - x) / width;
      area += 1;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
      const neighbors = [index - 1, index + 1, index - width, index + width];
      for (const next of neighbors) {
        if (next < 0 || next >= mask.length || seen[next] || !mask[next]) continue;
        if (next === index - 1 && x === 0) continue;
        if (next === index + 1 && x === width - 1) continue;
        seen[next] = 1;
        stack.push(next);
      }
    }
    if (area < 3) continue;
    const blob: MotionBlob = {
      x: (minX + maxX) / 2 / width,
      y: (minY + maxY) / 2 / height,
      w: (maxX - minX + 1) / width,
      h: (maxY - minY + 1) / height,
      area,
    };
    if (area >= 24) players.push(blob);
    else balls.push(blob);
  }

  players.sort((a, b) => b.area - a.area);
  balls.sort((a, b) => a.area - b.area);
  return { players, balls };
}

export function nearestBlob(
  blobs: MotionBlob[],
  previous: { x: number; y: number } | null,
  hint: { x: number; y: number } | null,
): MotionBlob | null {
  if (!blobs.length) return null;
  const anchor = previous ?? hint;
  if (!anchor) return blobs[0];
  return [...blobs].sort((a, b) => {
    const da = (a.x - anchor.x) ** 2 + (a.y - anchor.y) ** 2;
    const db = (b.x - anchor.x) ** 2 + (b.y - anchor.y) ** 2;
    return da - db;
  })[0];
}

export function detectImpacts(samples: EnergySample[], options?: { minGap?: number; minEnergy?: number }): ImpactCandidate[] {
  const minGap = options?.minGap ?? 0.8;
  const minEnergy = options?.minEnergy ?? 0.45;
  const peaks: ImpactCandidate[] = [];
  for (let i = 1; i < samples.length - 1; i++) {
    const sample = samples[i];
    if (sample.playerEnergy < minEnergy) continue;
    if (sample.playerEnergy < samples[i - 1].playerEnergy || sample.playerEnergy <= samples[i + 1].playerEnergy) continue;
    const candidate: ImpactCandidate = {
      t: sample.t,
      energy: sample.playerEnergy,
      playerX: sample.playerX,
      playerY: sample.playerY,
      ballX: sample.ballX,
      ballY: sample.ballY,
    };
    const prev = peaks[peaks.length - 1];
    if (!prev || sample.t - prev.t >= minGap) peaks.push(candidate);
    else if (candidate.energy > prev.energy) peaks[peaks.length - 1] = candidate;
  }
  return peaks;
}

export function groupByGap<T extends { t: number }>(items: T[], gap = 4.5): T[][] {
  const groups: T[][] = [];
  for (const item of items) {
    const last = groups[groups.length - 1];
    if (!last || item.t - last[last.length - 1].t > gap) groups.push([item]);
    else last.push(item);
  }
  return groups;
}

export interface ClassifyInput {
  sport: Sport;
  hand: Hand;
  indexInRally: number;
  imageX: number;
  imageY: number;
  ballX: number | null;
  ballY: number | null;
  heightProxy: number;
  courtVisible: boolean;
}

export interface ClassifiedGuess {
  type: ShotType;
  bodySide: BodySide;
  outcome: ShotOutcome;
  confidence: number;
  note: string;
}

function bodyFromBall(hand: Hand, playerX: number, ballX: number | null, index: number): "forehand" | "backhand" {
  if (ballX == null) return index % 2 === 0 ? "forehand" : "backhand";
  const ballOnRight = ballX >= playerX;
  if (hand === "right") return ballOnRight ? "forehand" : "backhand";
  return ballOnRight ? "backhand" : "forehand";
}

/** Low-confidence guess. Outcomes stay unclassified: the browser does not measure lines. */
export function classifyHeuristic(input: ClassifyInput): ClassifiedGuess {
  const cap = input.courtVisible ? 0.55 : 0.32;
  const side = bodyFromBall(input.hand, input.imageX, input.ballX, input.indexInRally);
  const note = input.courtVisible
    ? "Stima dal movimento. L'esito non è classificato: senza omografia non distinguiamo rete e fuori."
    : "Campo poco visibile. Colpo non affidabile: trattalo come stima debole o non classificato.";

  let type: ShotType = "unclassified";
  let body: BodySide = "unknown";
  let confidence = 0.18;

  if (!Number.isFinite(input.imageY)) {
    type = "unclassified";
  } else if (input.indexInRally === 0 && input.imageY > 0.5) {
    type = "serve";
    body = input.sport === "padel" ? "forehand" : "overhead";
    confidence = 0.46;
  } else if (input.indexInRally === 1 && input.imageY > 0.45) {
    type = "return";
    body = side;
    confidence = 0.4;
  } else if (input.heightProxy > 0.82) {
    type = "smash";
    body = "overhead";
    confidence = 0.34;
  } else if (input.sport === "padel" && input.heightProxy > 0.62 && input.imageY < 0.7) {
    type = "bandeja";
    body = "overhead";
    confidence = 0.3;
  } else if (input.imageY < 0.5 && input.imageY > 0.28) {
    type = side === "forehand" ? "forehand_volley" : "backhand_volley";
    body = side;
    confidence = 0.33;
  } else if (input.imageY >= 0.5) {
    type = side === "forehand" ? "forehand" : "backhand";
    body = side;
    confidence = 0.3;
  }

  if (!input.courtVisible && type !== "unclassified") confidence *= 0.6;

  return {
    type,
    bodySide: body,
    outcome: "unclassified",
    confidence: Math.min(cap, Math.round(confidence * 100) / 100),
    note,
  };
}

export function shirtColorName(rgb: [number, number, number] | null): string {
  if (!rgb) return "non indicata";
  const [r, g, b] = rgb;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max - min < 28) return max > 170 ? "chiara" : "scura";
  if (r >= g && r >= b) return "rossa o arancione";
  if (b >= r && b >= g) return "blu";
  if (g >= r && g >= b) return "verde";
  return "mista";
}
