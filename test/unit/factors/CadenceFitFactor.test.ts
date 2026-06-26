import { describe, it, expect } from "vitest";
import { CadenceFitFactor } from "../../../src/core/factors/CadenceFitFactor.js";
import { contextFor } from "../../fixtures/factorFixtures.js";

const factor = new CadenceFitFactor();

describe("CadenceFitFactor", () => {
  it("rewards a cadential move much more at the phrase ending than at the start", () => {
    // Ending: phrasePosition 2 → lands on position 3.
    const ending = factor.score(contextFor("V7", "I", { state: { phrasePosition: 2 } })).rawScore;
    // Beginning: phrasePosition 3 → lands on position 0.
    const beginning = factor.score(
      contextFor("V7", "I", { state: { phrasePosition: 3 } }),
    ).rawScore;
    expect(ending).toBeGreaterThan(beginning);
  });

  it("contributes ~0 for a cadential move at the phrase start (no premature cadence)", () => {
    const beginning = factor.score(
      contextFor("V7", "I", { state: { phrasePosition: 3 } }),
    ).rawScore;
    expect(beginning).toBeCloseTo(0, 5);
  });

  it("scores a stronger cadence above a weaker one at the same position", () => {
    // Both land on the Ending zone (phrasePosition 2).
    const authentic = factor.score(
      contextFor("V7", "I", { state: { phrasePosition: 2 } }),
    ).rawScore; // strength 1.0
    const plagal = factor.score(contextFor("IV", "I", { state: { phrasePosition: 2 } })).rawScore; // strength ~0.55
    expect(authentic).toBeGreaterThan(plagal);
  });

  it("adds an approach bonus when resolving from a dominant that is approaching cadence", () => {
    const withApproach = factor.score(
      contextFor("V7", "I", {
        state: { phrasePosition: 2, cadenceState: { isApproachingCadence: true } },
      }),
    ).rawScore;
    const withoutApproach = factor.score(
      contextFor("V7", "I", {
        state: { phrasePosition: 2, cadenceState: { isApproachingCadence: false } },
      }),
    ).rawScore;
    expect(withApproach).toBeGreaterThan(withoutApproach);
  });
});
