import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { WeightedSampler } from "../../src/core/probability/WeightedSampler.js";
import { SeededRandomSource } from "../../src/core/probability/SeededRandomSource.js";
import { DiscreteProbabilityDistribution } from "../../src/core/probability/ProbabilityDistribution.js";
import type { RandomSource } from "../../src/core/probability/RandomSource.js";

/** A RandomSource that yields each value in order, repeating the last. */
class StubRandomSource implements RandomSource {
  private i = 0;
  constructor(private readonly values: number[]) {}
  next(): number {
    const v = this.values[Math.min(this.i, this.values.length - 1)]!;
    this.i++;
    return v;
  }
}

/** Arbitrary distribution built by normalising positive weights. */
const distribution = fc
  .array(fc.double({ min: 0.01, max: 100, noNaN: true, noDefaultInfinity: true }), {
    minLength: 1,
    maxLength: 10,
  })
  .map((weights) =>
    DiscreteProbabilityDistribution.fromWeights(
      weights.map((weight, i) => ({ edgeId: `e${i}`, weight })),
    ),
  );

/** Any random draw value in [0, 1). */
const drawValue = fc.double({
  min: 0,
  max: 0.9999999,
  noNaN: true,
  noDefaultInfinity: true,
});

describe("WeightedSampler (property)", () => {
  it("never selects an id outside the distribution", () => {
    fc.assert(
      fc.property(distribution, fc.array(drawValue, { minLength: 1 }), (dist, draws) => {
        const ids = new Set(dist.entries.map((e) => e.edgeId));
        const sampler = new WeightedSampler(new StubRandomSource(draws));
        for (let i = 0; i < draws.length; i++) {
          expect(ids.has(sampler.sample(dist).edgeId)).toBe(true);
        }
      }),
    );
  });

  it("never selects a zero-probability candidate", () => {
    const distWithZeros = fc
      .array(
        fc.record({
          edgeId: fc.string({ minLength: 1, maxLength: 4 }),
          weight: fc.double({ min: 0, max: 100, noNaN: true, noDefaultInfinity: true }),
        }),
        { minLength: 2, maxLength: 8 },
      )
      // unique ids, and at least one strictly positive weight
      .map((rows) => {
        const seen = new Set<string>();
        return rows.filter((r) => (seen.has(r.edgeId) ? false : (seen.add(r.edgeId), true)));
      })
      .filter((rows) => rows.length >= 1 && rows.some((r) => r.weight > 0))
      .map((rows) => DiscreteProbabilityDistribution.fromWeights(rows));

    fc.assert(
      fc.property(distWithZeros, fc.array(drawValue, { minLength: 1 }), (dist, draws) => {
        const zeroIds = new Set(
          dist.entries.filter((e) => e.probability === 0).map((e) => e.edgeId),
        );
        const sampler = new WeightedSampler(new StubRandomSource(draws));
        for (let i = 0; i < draws.length; i++) {
          expect(zeroIds.has(sampler.sample(dist).edgeId)).toBe(false);
        }
      }),
    );
  });

  it("the reported probability matches the distribution's probability for that id", () => {
    fc.assert(
      fc.property(distribution, drawValue, (dist, r) => {
        const result = new WeightedSampler(new StubRandomSource([r])).sample(dist);
        expect(result.probability).toBeCloseTo(dist.getProbability(result.edgeId), 12);
      }),
    );
  });

  it("is deterministic: same seed yields the same selections", () => {
    fc.assert(
      fc.property(distribution, fc.integer({ min: 0, max: 2 ** 31 }), (dist, seed) => {
        const run = (): string[] => {
          const sampler = new WeightedSampler(new SeededRandomSource(seed));
          return Array.from({ length: 8 }, () => sampler.sample(dist).edgeId);
        };
        expect(run()).toEqual(run());
      }),
    );
  });
});
