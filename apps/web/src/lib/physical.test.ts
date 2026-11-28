import { describe, expect, it } from "vitest";
import { applyHomography, courtHomography, COURT_CORNERS } from "./homography";
import { summarizeTrack, type TrackSample } from "./physical";
import { playSpan } from "./clips";

describe("court homography", () => {
  it("maps the four tapped corners onto 20 by 10 metres", () => {
    const image = [
      { x: 0.2, y: 0.8 },
      { x: 0.8, y: 0.8 },
      { x: 0.7, y: 0.3 },
      { x: 0.3, y: 0.3 },
    ];
    const h = courtHomography(image);
    expect(h).not.toBeNull();
    image.forEach((point, index) => {
      const world = applyHomography(h!, point);
      expect(world?.x).toBeCloseTo(COURT_CORNERS[index].x, 4);
      expect(world?.y).toBeCloseTo(COURT_CORNERS[index].y, 4);
    });
  });
});

describe("physical summary", () => {
  it("measures a straight 10 m walk and leaves gaps empty when tracking is lost", () => {
    const samples: TrackSample[] = [];
    for (let i = 0; i < 11; i += 1) {
      samples.push({ t: i * 0.5, x: i, y: 1, footV: 0.7, motion: 0.2, locked: true });
    }
    const summary = summarizeTrack(samples);
    expect(summary?.distanceM).toBeCloseTo(10, 5);
    expect(summary?.maxSpeedMps).toBeGreaterThan(1);
    expect(summarizeTrack(samples.slice(0, 3))).toBeNull();
  });

  it("counts a sprint only above the speed threshold", () => {
    const samples: TrackSample[] = [];
    for (let i = 0; i < 12; i += 1) {
      const fast = i >= 4 && i <= 7;
      const x = fast ? 4 + (i - 4) * 2.5 : i * 0.4;
      samples.push({ t: i * 0.4, x, y: 2, footV: 0.6, motion: 0.4, locked: true });
    }
    const summary = summarizeTrack(samples);
    expect(summary?.sprints).toBeGreaterThanOrEqual(1);
    expect(summary?.note.toLowerCase()).toContain("stima");
  });
});

describe("error playback", () => {
  it("plays the whole rally for an error and a short window otherwise", () => {
    const rally = { tStart: 10, tEnd: 18 };
    expect(playSpan({ outcome: "forced_error", tImpact: 14, real: true }, rally, 100)).toEqual({ start: 10, end: 18 });
    expect(playSpan({ outcome: "winner", tImpact: 14, real: true }, rally, 100).start).toBe(11);
  });
});
