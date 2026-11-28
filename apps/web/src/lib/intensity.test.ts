import { describe, expect, it } from "vitest";
import { waveformBars } from "./intensity";

describe("intensity waveform", () => {
  it("keeps every bar unknown when nothing was measured or tagged", () => {
    const bars = waveformBars([], [], 100, 20);
    expect(bars.every((bar) => !bar.known && bar.e === 0)).toBe(true);
  });

  it("raises only the bucket that contains a real sample or a tagged shot", () => {
    const bars = waveformBars(
      [{ t: 10, e: 0.4 }],
      [{ tImpact: 80, type: "forehand", outcome: "forced_error" }],
      100,
      10,
    );
    expect(bars[1].known).toBe(true);
    expect(bars[1].e).toBeCloseTo(0.4);
    expect(bars[8].known).toBe(true);
    expect(bars.filter((bar) => bar.known)).toHaveLength(2);
  });
});
