import { describe, it, expect } from "vitest";
import { Softmax, type ScoredCandidate } from "../../../src/core/probability/Softmax.js";

/** Sum of all probabilities in a distribution. */
function totalProbability(scores: ScoredCandidate[], temperature: number): number {
  return Softmax.normalize(scores, temperature).entries.reduce((sum, e) => sum + e.probability, 0);
}

describe("Softmax.normalize", () => {
  it("produces probabilities that sum to 1", () => {
    const scores: ScoredCandidate[] = [
      { id: "a", score: 2 },
      { id: "b", score: 1 },
      { id: "c", score: -0.5 },
    ];
    expect(totalProbability(scores, 1)).toBeCloseTo(1, 12);
  });

  it("assigns a single candidate probability 1", () => {
    const dist = Softmax.normalize([{ id: "only", score: 7 }], 1);
    expect(dist.getProbability("only")).toBeCloseTo(1, 12);
    expect(dist.modalEdgeId).toBe("only");
  });

  it("gives equal scores equal (uniform) probability", () => {
    const dist = Softmax.normalize(
      [
        { id: "a", score: 3 },
        { id: "b", score: 3 },
        { id: "c", score: 3 },
      ],
      0.8,
    );
    for (const e of dist.entries) {
      expect(e.probability).toBeCloseTo(1 / 3, 12);
    }
  });

  it("ranks higher scores with higher probability", () => {
    const dist = Softmax.normalize(
      [
        { id: "low", score: 0 },
        { id: "mid", score: 1 },
        { id: "high", score: 2 },
      ],
      1,
    );
    expect(dist.getProbability("high")).toBeGreaterThan(dist.getProbability("mid"));
    expect(dist.getProbability("mid")).toBeGreaterThan(dist.getProbability("low"));
    expect(dist.modalEdgeId).toBe("high");
  });

  it("sharpens the distribution at low temperature", () => {
    const scores: ScoredCandidate[] = [
      { id: "a", score: 2 },
      { id: "b", score: 1 },
    ];
    const cold = Softmax.normalize(scores, 0.2).getProbability("a");
    const hot = Softmax.normalize(scores, 2).getProbability("a");
    // Lower temperature concentrates more mass on the top candidate.
    expect(cold).toBeGreaterThan(hot);
  });

  it("flattens toward uniform at high temperature", () => {
    const scores: ScoredCandidate[] = [
      { id: "a", score: 5 },
      { id: "b", score: 0 },
    ];
    const veryHot = Softmax.normalize(scores, 1000);
    expect(veryHot.getProbability("a")).toBeCloseTo(0.5, 2);
    expect(veryHot.getProbability("b")).toBeCloseTo(0.5, 2);
  });

  it("is numerically stable with very large scores", () => {
    const dist = Softmax.normalize(
      [
        { id: "a", score: 1000 },
        { id: "b", score: 1001 },
      ],
      1,
    );
    const total = dist.entries.reduce((s, e) => s + e.probability, 0);
    expect(total).toBeCloseTo(1, 12);
    expect(dist.getProbability("b")).toBeGreaterThan(dist.getProbability("a"));
    expect(Number.isFinite(dist.getProbability("a"))).toBe(true);
  });

  it("is shift-invariant: adding a constant to every score is a no-op", () => {
    const base = Softmax.normalize(
      [
        { id: "a", score: 1 },
        { id: "b", score: 2 },
      ],
      0.7,
    );
    const shifted = Softmax.normalize(
      [
        { id: "a", score: 101 },
        { id: "b", score: 102 },
      ],
      0.7,
    );
    expect(shifted.getProbability("a")).toBeCloseTo(base.getProbability("a"), 12);
    expect(shifted.getProbability("b")).toBeCloseTo(base.getProbability("b"), 12);
  });

  it("throws on an empty candidate list", () => {
    expect(() => Softmax.normalize([], 1)).toThrow();
  });

  it("throws on non-positive temperature", () => {
    const scores: ScoredCandidate[] = [{ id: "a", score: 1 }];
    expect(() => Softmax.normalize(scores, 0)).toThrow();
    expect(() => Softmax.normalize(scores, -1)).toThrow();
  });

  it("throws on a non-finite score", () => {
    expect(() => Softmax.normalize([{ id: "a", score: NaN }], 1)).toThrow();
    expect(() => Softmax.normalize([{ id: "a", score: Infinity }], 1)).toThrow();
  });
});
