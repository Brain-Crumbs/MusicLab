import { describe, it, expect } from "vitest";
import { HarmonicGravityFactor } from "../../../src/core/factors/HarmonicGravityFactor.js";
import { contextFor } from "../../fixtures/factorFixtures.js";

const factor = new HarmonicGravityFactor();

describe("HarmonicGravityFactor", () => {
  it("gives V7 -> I a high gravity score", () => {
    const raw = factor.score(contextFor("V7", "I")).rawScore;
    // baseAffinity 0.9 → affinityComponent 1.35, plus proximity/stability.
    expect(raw).toBeGreaterThan(1.0);
  });

  it("scores a strong cadence above a weak retrogression", () => {
    const cadence = factor.score(contextFor("V7", "I")).rawScore;
    const retro = factor.score(contextFor("V", "IV")).rawScore;
    expect(cadence).toBeGreaterThan(retro);
  });

  it("rewards higher base affinity, all else equal", () => {
    // From I: I->V (affinity 0.75) should outscore I->iii (affinity 0.45).
    const strong = factor.score(contextFor("I", "V")).rawScore;
    const weak = factor.score(contextFor("I", "iii")).rawScore;
    expect(strong).toBeGreaterThan(weak);
  });

  it("never returns a negative score (gravity is a pull, not a push)", () => {
    for (const [from, to] of [
      ["I", "IV"],
      ["I", "bVII"],
      ["V", "IV"],
      ["iii", "ii"],
    ] as const) {
      expect(factor.score(contextFor(from, to)).rawScore).toBeGreaterThanOrEqual(0);
    }
  });
});
