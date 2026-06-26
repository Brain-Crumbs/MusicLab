import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { Softmax, type ScoredCandidate } from "../../src/core/probability/Softmax.js";

/** Arbitrary for a non-empty list of uniquely-keyed scored candidates. */
const scoredCandidates = fc
  .array(fc.double({ min: -50, max: 50, noNaN: true, noDefaultInfinity: true }), {
    minLength: 1,
    maxLength: 12,
  })
  .map((scores): ScoredCandidate[] => scores.map((score, i) => ({ id: `c${i}`, score })));

/** Arbitrary for a valid (finite, positive) softmax temperature. */
const temperature = fc.double({
  min: 0.01,
  max: 50,
  noNaN: true,
  noDefaultInfinity: true,
});

describe("Softmax (property)", () => {
  it("probabilities always sum to 1", () => {
    fc.assert(
      fc.property(scoredCandidates, temperature, (scores, t) => {
        const dist = Softmax.normalize(scores, t);
        const total = dist.entries.reduce((s, e) => s + e.probability, 0);
        expect(total).toBeCloseTo(1, 9);
      }),
    );
  });

  it("never produces a negative or out-of-range probability", () => {
    fc.assert(
      fc.property(scoredCandidates, temperature, (scores, t) => {
        for (const e of Softmax.normalize(scores, t).entries) {
          expect(e.probability).toBeGreaterThanOrEqual(0);
          expect(e.probability).toBeLessThanOrEqual(1);
        }
      }),
    );
  });

  it("preserves score ordering in the probabilities", () => {
    fc.assert(
      fc.property(scoredCandidates, temperature, (scores, t) => {
        const dist = Softmax.normalize(scores, t);
        for (const a of scores) {
          for (const b of scores) {
            if (a.score > b.score) {
              expect(dist.getProbability(a.id)).toBeGreaterThanOrEqual(dist.getProbability(b.id));
            }
          }
        }
      }),
    );
  });

  it("preserves one probability per candidate", () => {
    fc.assert(
      fc.property(scoredCandidates, temperature, (scores, t) => {
        expect(Softmax.normalize(scores, t).entries).toHaveLength(scores.length);
      }),
    );
  });

  it("higher temperature flattens the distribution (lower peak probability)", () => {
    // Only meaningful when scores are not all equal, so force a spread.
    const spreadCandidates = fc
      .array(fc.double({ min: -20, max: 20, noNaN: true, noDefaultInfinity: true }), {
        minLength: 2,
        maxLength: 8,
      })
      .filter((scores) => new Set(scores).size > 1)
      .map((scores): ScoredCandidate[] => scores.map((score, i) => ({ id: `c${i}`, score })));

    fc.assert(
      fc.property(
        spreadCandidates,
        fc.double({ min: 0.05, max: 2, noNaN: true, noDefaultInfinity: true }),
        fc.double({ min: 5, max: 50, noNaN: true, noDefaultInfinity: true }),
        (scores, lowT, highT) => {
          const peak = (t: number): number =>
            Math.max(...Softmax.normalize(scores, t).entries.map((e) => e.probability));
          // The peak under the hotter temperature must not exceed the colder one.
          expect(peak(highT)).toBeLessThanOrEqual(peak(lowT) + 1e-9);
        },
      ),
    );
  });

  it("the modal id is always a candidate with maximal probability", () => {
    fc.assert(
      fc.property(scoredCandidates, temperature, (scores, t) => {
        const dist = Softmax.normalize(scores, t);
        const maxProb = Math.max(...dist.entries.map((e) => e.probability));
        expect(dist.getProbability(dist.modalEdgeId)).toBeCloseTo(maxProb, 12);
      }),
    );
  });
});
