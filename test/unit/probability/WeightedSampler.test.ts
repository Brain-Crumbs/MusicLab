import { describe, it, expect } from "vitest";
import { WeightedSampler } from "../../../src/core/probability/WeightedSampler.js";
import { SeededRandomSource } from "../../../src/core/probability/SeededRandomSource.js";
import { DiscreteProbabilityDistribution } from "../../../src/core/probability/ProbabilityDistribution.js";
import type { RandomSource } from "../../../src/core/probability/RandomSource.js";

/** A RandomSource that replays a fixed list of values, then repeats the last. */
class StubRandomSource implements RandomSource {
  private i = 0;
  constructor(private readonly values: number[]) {}
  next(): number {
    const v = this.values[Math.min(this.i, this.values.length - 1)]!;
    this.i++;
    return v;
  }
}

const threeWay = DiscreteProbabilityDistribution.fromEntries([
  { edgeId: "a", probability: 0.5 },
  { edgeId: "b", probability: 0.3 },
  { edgeId: "c", probability: 0.2 },
]);

describe("WeightedSampler.sample", () => {
  it("selects by cumulative band (inverse CDF)", () => {
    // Bands: a=[0,0.5), b=[0.5,0.8), c=[0.8,1.0).
    expect(new WeightedSampler(new StubRandomSource([0.0])).sample(threeWay).edgeId).toBe("a");
    expect(new WeightedSampler(new StubRandomSource([0.49])).sample(threeWay).edgeId).toBe("a");
    expect(new WeightedSampler(new StubRandomSource([0.5])).sample(threeWay).edgeId).toBe("b");
    expect(new WeightedSampler(new StubRandomSource([0.79])).sample(threeWay).edgeId).toBe("b");
    expect(new WeightedSampler(new StubRandomSource([0.8])).sample(threeWay).edgeId).toBe("c");
    expect(new WeightedSampler(new StubRandomSource([0.999])).sample(threeWay).edgeId).toBe("c");
  });

  it("returns the probability of the selected candidate", () => {
    const result = new WeightedSampler(new StubRandomSource([0.6])).sample(threeWay);
    expect(result.edgeId).toBe("b");
    expect(result.probability).toBeCloseTo(0.3, 12);
  });

  it("always returns the sole candidate of a degenerate distribution", () => {
    const certain = DiscreteProbabilityDistribution.fromEntries([
      { edgeId: "only", probability: 1 },
    ]);
    for (const r of [0, 0.25, 0.5, 0.99]) {
      expect(new WeightedSampler(new StubRandomSource([r])).sample(certain).edgeId).toBe("only");
    }
  });

  it("never selects a zero-probability candidate", () => {
    const withZero = DiscreteProbabilityDistribution.fromEntries([
      { edgeId: "impossible", probability: 0 },
      { edgeId: "certain", probability: 1 },
    ]);
    // r = 0 would fall into the first band if zeros were not skipped.
    expect(new WeightedSampler(new StubRandomSource([0])).sample(withZero).edgeId).toBe("certain");
  });

  it("falls back to the last positive candidate when r rounds past the total", () => {
    // A value at the very top of [0,1) must still resolve to a real candidate.
    const result = new WeightedSampler(new StubRandomSource([0.9999999999])).sample(threeWay);
    expect(["a", "b", "c"]).toContain(result.edgeId);
  });

  it("approximates the distribution over many seeded draws", () => {
    const sampler = new WeightedSampler(new SeededRandomSource(12345));
    const counts: Record<string, number> = { a: 0, b: 0, c: 0 };
    const n = 20000;
    for (let i = 0; i < n; i++) {
      counts[sampler.sample(threeWay).edgeId]!++;
    }
    expect(counts.a! / n).toBeCloseTo(0.5, 1);
    expect(counts.b! / n).toBeCloseTo(0.3, 1);
    expect(counts.c! / n).toBeCloseTo(0.2, 1);
  });

  it("is deterministic for a given seed", () => {
    const draw = (): string[] => {
      const sampler = new WeightedSampler(new SeededRandomSource(99));
      return Array.from({ length: 10 }, () => sampler.sample(threeWay).edgeId);
    };
    expect(draw()).toEqual(draw());
  });

  it("sampleEdgeId returns just the id", () => {
    expect(new WeightedSampler(new StubRandomSource([0.1])).sampleEdgeId(threeWay)).toBe("a");
  });
});
