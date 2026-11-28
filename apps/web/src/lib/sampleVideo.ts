import { courtHomography, type Pt } from "./homography";
import { projectFeet, type TrackSample } from "./physical";

export interface IntensityPoint {
  t: number;
  e: number;
}

function seek(video: HTMLVideoElement, time: number): Promise<void> {
  return new Promise((resolve) => {
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      video.removeEventListener("seeked", done);
      resolve();
    };
    if (video.readyState >= 2 && Math.abs(video.currentTime - time) < 0.04) {
      done();
      return;
    }
    video.addEventListener("seeked", done);
    window.setTimeout(done, 1500);
    video.currentTime = Math.max(0, time);
  });
}

function blobFoot(diff: Uint8Array, width: number, height: number, last: Pt | null): Pt | null {
  const local = collect(diff, width, height, last, 28);
  if (local && local.n > 6) return { x: local.sx / local.n / (width - 1), y: local.bottom / (height - 1) };
  const global = collect(diff, width, height, null, 0);
  if (!global || global.n < 8) return null;
  return { x: global.sx / global.n / (width - 1), y: global.bottom / (height - 1) };
}

function collect(diff: Uint8Array, width: number, height: number, last: Pt | null, rad: number) {
  const cx = last ? Math.round(last.x * (width - 1)) : width / 2;
  const cy = last ? Math.round(last.y * (height - 1)) : height / 2;
  let sx = 0;
  let sy = 0;
  let n = 0;
  let bottom = 0;
  const y0 = last ? Math.max(0, cy - rad) : Math.round(height * 0.25);
  const y1 = last ? Math.min(height, cy + rad) : height;
  const x0 = last ? Math.max(0, cx - rad) : 0;
  const x1 = last ? Math.min(width, cx + rad) : width;
  for (let y = y0; y < y1; y += 1) {
    for (let x = x0; x < x1; x += 1) {
      if (!diff[y * width + x]) continue;
      sx += x;
      sy += y;
      bottom = Math.max(bottom, y);
      n += 1;
    }
  }
  return { sx, sy, n, bottom };
}

function gray(data: Uint8ClampedArray, index: number): number {
  return data[index] * 0.3 + data[index + 1] * 0.59 + data[index + 2] * 0.11;
}

/** Samples motion, and the tapped player when a court homography exists. */
export async function sampleVideo(options: {
  video: HTMLVideoElement;
  ranges: Array<{ t0: number; t1: number }>;
  step: number;
  corners: Pt[] | null;
  player: Pt | null;
  onProgress?: (ratio: number) => void;
}): Promise<{ samples: TrackSample[]; intensity: IntensityPoint[] }> {
  const width = 160;
  const height = 90;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return { samples: [], intensity: [] };
  const h = options.corners && options.corners.length === 4 ? courtHomography(options.corners) : null;
  let previous: Uint8ClampedArray | null = null;
  let last = options.player;
  const samples: TrackSample[] = [];
  const intensity: IntensityPoint[] = [];
  const spans = options.ranges.flatMap((range) => {
    const times: number[] = [];
    for (let t = range.t0; t <= range.t1; t += options.step) times.push(t);
    return times;
  });
  for (let index = 0; index < spans.length; index += 1) {
    const t = spans[index];
    await seek(options.video, t);
    await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)));
    ctx.drawImage(options.video, 0, 0, width, height);
    const frame = ctx.getImageData(0, 0, width, height).data;
    let motion = 0;
    let count = 0;
    const diff = new Uint8Array(width * height);
    if (previous) {
      for (let p = 0; p < width * height; p += 1) {
        const d = Math.abs(gray(frame, p * 4) - gray(previous, p * 4));
        diff[p] = d > 10 ? 1 : 0;
        motion += d;
        count += 1;
      }
    }
    const energy = count ? motion / count / 255 : 0;
    intensity.push({ t, e: energy });

    let locked = false;
    let footX = last?.x ?? 0.5;
    let footY = last?.y ?? 0.7;
    const found = previous ? blobFoot(diff, width, height, last) : null;
    if (found) {
      footX = found.x;
      footY = found.y;
      last = found;
      locked = true;
    } else if (last && !previous) {
      locked = true;
    }

    const ground = h && locked ? projectFeet(h, { x: footX, y: footY }) : null;
    samples.push({
      t,
      x: ground?.x ?? null,
      y: ground?.y ?? null,
      footV: footY,
      motion: energy,
      locked: Boolean(locked && ground),
    });
    previous = new Uint8ClampedArray(frame);
    options.onProgress?.((index + 1) / spans.length);
  }
  const peak = Math.max(0.04, ...intensity.map((point) => point.e));
  return { samples, intensity: intensity.map((point) => ({ t: point.t, e: Math.min(1, point.e / peak) })) };
}
