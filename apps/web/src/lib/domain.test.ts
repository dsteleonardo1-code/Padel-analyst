import { describe, expect, it } from "vitest";
import { buildAdvice } from "./advice";
import { classifyHeuristic, detectImpacts, extractBlobs, greenRatio, groupByGap, motionMask } from "./analyze";
import { clipWindow, exampleImpact } from "./clips";
import { buildExampleData } from "./examples";
import { judgeOutcome } from "./outcome";
import { decodeShare, encodeShare } from "./share";
import { deltaTone, gifted, percentChange, playerShots, serveStats, skillSnapshots, summarize } from "./stats";
import { mergeWithExamples, parseState } from "./storage";
import type { EnergySample as Sample } from "./analyze";
import type { AppState } from "./types";

function solid(width: number, height: number, paint: (x: number, y: number) => [number, number, number]): Uint8ClampedArray {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const [r, g, b] = paint(x, y);
      const index = (y * width + x) * 4;
      data[index] = r;
      data[index + 1] = g;
      data[index + 2] = b;
      data[index + 3] = 255;
    }
  }
  return data;
}

describe("example matches", () => {
  const data = buildExampleData();

  it("marks every example record and keeps unclassified shots", () => {
    expect(data.matches.every((match) => match.example)).toBe(true);
    expect(data.shots.every((shot) => shot.example)).toBe(true);
    expect(data.players.every((player) => player.example)).toBe(true);
    expect(data.shots.some((shot) => shot.type === "unclassified")).toBe(true);
    expect(data.matches.every((match) => match.confidenceNote.toLowerCase().includes("esempio"))).toBe(true);
  });

  it("gives every error a reason and keeps winners clean", () => {
    for (const shot of data.shots) {
      if (shot.outcome === "unforced_error" || shot.outcome === "forced_error") {
        expect(shot.errorReason).toBeTruthy();
        expect(shot.errorCause).toBeTruthy();
      } else {
        expect(shot.errorReason).toBeNull();
      }
    }
  });

  it("places net, long and wide balls where the label says", () => {
    const luca = playerShots(data.shots, "p-luca", "m-luca-1");
    expect(luca.filter((shot) => shot.type === "bandeja" && shot.errorReason === "net").length).toBeGreaterThanOrEqual(6);
    for (const shot of data.shots) {
      if (shot.errorReason === "net") expect(shot.landY).toBeGreaterThanOrEqual(0.47);
      if (shot.errorReason === "net") expect(shot.landY).toBeLessThanOrEqual(0.53);
      if (shot.errorReason === "long" || shot.errorReason === "double_fault") expect(shot.landY).toBeGreaterThan(1);
      if (shot.errorReason === "wide") expect(shot.landX < 0 || shot.landX > 1).toBe(true);
      if (shot.outcome === "winner") {
        expect(shot.landX).toBeGreaterThan(0);
        expect(shot.landX).toBeLessThan(1);
        expect(shot.landY).toBeGreaterThan(0.5);
        expect(shot.landY).toBeLessThan(1);
      }
    }
  });

  it("tells a progress story for Luca and a serve story for Marco", () => {
    const net = (id: string) =>
      playerShots(data.shots, "p-luca", id).filter((shot) => shot.type === "bandeja" && shot.errorReason === "net").length;
    expect(net("m-luca-1")).toBeGreaterThan(net("m-luca-2"));
    const volleyWinners = (id: string) =>
      playerShots(data.shots, "p-luca", id).filter((shot) => shot.type.includes("volley") && shot.outcome === "winner").length;
    expect(volleyWinners("m-luca-2")).toBeGreaterThan(volleyWinners("m-luca-1"));
    const position = playerShots(data.shots, "p-luca", "m-luca-3").filter((shot) => shot.errorReason === "position").length;
    expect(position).toBeGreaterThanOrEqual(6);

    const advice1 = buildAdvice(playerShots(data.shots, "p-luca", "m-luca-1"), "p-luca");
    expect(advice1.primary?.title.toLowerCase()).toContain("rete");
    expect(advice1.primary?.drill.length).toBeGreaterThan(10);
    expect(advice1.strengths.length).toBeGreaterThan(0);

    const advice3 = buildAdvice(playerShots(data.shots, "p-luca", "m-luca-3"), "p-luca");
    expect(advice3.primary?.title.toLowerCase()).toContain("posizion");

    const skills = skillSnapshots(data.matches, data.shots, "p-luca");
    const volley = skills.find((skill) => skill.id === "volley");
    expect(volley?.trend).toBe("up");

    const marco = serveStats(data.shots, data.rallies, "p-marco", "m-marco-2");
    expect(marco.observed).toBe(true);
    expect(marco.firstInPct).not.toBeNull();
    const before = serveStats(data.shots, data.rallies, "p-marco", "m-marco-1");
    expect((marco.firstInPct ?? 0) > (before.firstInPct ?? 1)).toBe(true);
  });

  it("does not turn a missing skill into a fake zero", () => {
    const giulia = skillSnapshots(data.matches, data.shots, "p-giulia");
    expect(giulia.some((skill) => skill.points.some((point) => !point.observed))).toBe(true);
    const summary = summarize([]);
    expect(summary.errorRate).toBeNull();
    expect(summary.winnerRate).toBeNull();
  });
});

describe("corrections and deltas", () => {
  it("recomputes totals when a shot is corrected", () => {
    const data = buildExampleData();
    const before = summarize(playerShots(data.shots, "p-luca", "m-luca-1"));
    const shots = data.shots.map((shot) =>
      shot.id === playerShots(data.shots, "p-luca", "m-luca-1").find((item) => item.outcome === "winner")?.id
        ? { ...shot, outcome: "unforced_error" as const, errorReason: "net" as const, errorCause: "technique" as const, manuallyCorrected: true }
        : shot,
    );
    const after = summarize(playerShots(shots, "p-luca", "m-luca-1"));
    expect(after.errors).toBe(before.errors + 1);
    expect(after.winners).toBe(before.winners - 1);
    expect(shots.some((shot) => shot.manuallyCorrected)).toBe(true);
  });

  it("cuts a short clip around the impact", () => {
    expect(clipWindow(10, 100)).toEqual({ start: 7, end: 12 });
    expect(clipWindow(1, 100).start).toBe(0);
    expect(clipWindow(99, 100).end).toBe(100);
    expect(exampleImpact(0, 4, 20)).toBeLessThan(exampleImpact(3, 4, 20));
  });

  it("turns errors into points and games", () => {
    expect(gifted(10, 0).line).toBe("10 errori = 10 punti = più di 2 game regalati");
    expect(gifted(4, 4).line).toBe("8 errori = 8 punti = 2 game regalati");
    expect(gifted(2, 1).line).toContain("meno di 1 game");
    const data = buildExampleData();
    for (const match of data.matches) {
      const summary = summarize(playerShots(data.shots, match.focusPlayerId, match.id));
      expect(summary.unforced + summary.forced + summary.winners).toBeGreaterThan(0);
      expect(match.example).toBe(true);
    }
  });

  it("colors an error drop as an improvement", () => {
    expect(deltaTone("errors", percentChange(8, 12))).toBe("good");
    expect(deltaTone("winners", percentChange(4, 10))).toBe("bad");
    expect(percentChange(3, 0)).toBeNull();
  });
});

describe("outcome rules", () => {
  const base = { sport: "padel" as const, type: "forehand" as const, lastOfRally: false, opponentWinnerNext: false, pressured: false };

  it("reads the geometry without claiming a trained model", () => {
    expect(judgeOutcome({ ...base, landX: 0.5, landY: 0.5 }).reason).toBe("net");
    expect(judgeOutcome({ ...base, landX: 0.5, landY: 1.1 }).reason).toBe("long");
    expect(judgeOutcome({ ...base, landX: 1.2, landY: 0.7 }).reason).toBe("wide");
    expect(judgeOutcome({ ...base, landX: 0.4, landY: 0.8, hitWallBeforeBounce: true }).reason).toBe("direct_wall");
    expect(judgeOutcome({ ...base, sport: "tennis", type: "serve", serveNumber: 2, landX: 0.2, landY: 1.2 }).reason).toBe("double_fault");
    expect(judgeOutcome({ ...base, landX: 0.3, landY: 0.84, lastOfRally: true }).outcome).toBe("winner");
    expect(judgeOutcome({ ...base, landX: 0.4, landY: 0.7, pressured: true, lastOfRally: false }).outcome).toBe("neutral");
    const forced = judgeOutcome({ ...base, landX: 0.5, landY: 0.5, pressured: true });
    expect(forced.outcome).toBe("forced_error");
    expect(forced.confidence).toBeLessThan(0.7);
    expect(judgeOutcome({ ...base, type: "unclassified", landX: 0.2, landY: 0.2 }).outcome).toBe("unclassified");
  });
});

describe("browser vision helpers", () => {
  it("finds a moving player blob and peaks of energy", () => {
    const prev = solid(20, 20, (x, y) => (x >= 2 && x <= 6 && y >= 2 && y <= 12 ? [240, 240, 240] : [0, 0, 0]));
    const curr = solid(20, 20, (x, y) => (x >= 12 && x <= 16 && y >= 2 && y <= 12 ? [240, 240, 240] : [0, 0, 0]));
    const blobs = extractBlobs(motionMask(prev, curr), 20, 20);
    expect(blobs.players.length).toBeGreaterThanOrEqual(1);

    const samples: Sample[] = [
      { t: 0, playerEnergy: 0.1, ballSeen: false, playerX: 0.2, playerY: 0.7, ballX: null, ballY: null },
      { t: 0.5, playerEnergy: 0.9, ballSeen: true, playerX: 0.3, playerY: 0.7, ballX: 0.3, ballY: 0.6 },
      { t: 1, playerEnergy: 0.1, ballSeen: false, playerX: 0.3, playerY: 0.7, ballX: null, ballY: null },
      { t: 2.2, playerEnergy: 0.8, ballSeen: true, playerX: 0.4, playerY: 0.6, ballX: 0.4, ballY: 0.5 },
      { t: 2.7, playerEnergy: 0.2, ballSeen: false, playerX: 0.4, playerY: 0.6, ballX: null, ballY: null },
    ];
    const impacts = detectImpacts(samples);
    expect(impacts).toHaveLength(2);
    expect(groupByGap(impacts, 1).length).toBe(2);
  });

  it("keeps heuristic confidence low and outcomes unclassified", () => {
    const guess = classifyHeuristic({
      sport: "padel",
      hand: "right",
      indexInRally: 0,
      imageX: 0.6,
      imageY: 0.75,
      ballX: 0.62,
      ballY: 0.7,
      heightProxy: 0.2,
      courtVisible: true,
    });
    expect(guess.type).toBe("serve");
    expect(guess.outcome).toBe("unclassified");
    expect(guess.confidence).toBeLessThanOrEqual(0.55);

    const weak = classifyHeuristic({
      sport: "tennis",
      hand: "right",
      indexInRally: 3,
      imageX: 0.4,
      imageY: 0.8,
      ballX: 0.2,
      ballY: 0.7,
      heightProxy: 0.2,
      courtVisible: false,
    });
    expect(weak.confidence).toBeLessThanOrEqual(0.32);
    expect(greenRatio(solid(4, 4, () => [20, 140, 40]))).toBe(1);
  });
});

describe("share links", () => {
  it("roundtrips a match without the video", async () => {
    const data = buildExampleData();
    const payload = {
      match: data.matches[0],
      rallies: data.rallies.filter((rally) => rally.matchId === data.matches[0].id),
      shots: data.shots.filter((shot) => shot.matchId === data.matches[0].id),
      players: data.players.filter((player) => player.sport === "padel"),
    };
    const encoded = await encodeShare(payload);
    expect(encoded.length).toBeLessThan(20000);
    const decoded = await decodeShare(encoded);
    expect(decoded.match.id).toBe(payload.match.id);
    expect(decoded.match.example).toBe(true);
    expect(decoded.shots).toHaveLength(payload.shots.length);
    expect(decoded.shots[0].type).toBe(payload.shots[0].type);
    expect(decoded.shots[0].outcome).toBe(payload.shots[0].outcome);
  });
});

describe("stored state", () => {
  it("restores missing examples and keeps the user's own match", () => {
    const base = parseState(null);
    const custom = {
      ...base,
      matches: base.matches.filter((match) => match.id !== "m-luca-3"),
      players: [
        ...base.players,
        {
          ...base.players[0],
          id: "p-user",
          name: "Io",
          example: false,
          ownerId: "me",
        },
      ],
    } satisfies AppState;
    const merged = mergeWithExamples(custom);
    expect(merged.matches.some((match) => match.id === "m-luca-3")).toBe(true);
    expect(merged.players.some((player) => player.id === "p-user")).toBe(true);
  });
});
