import { describe, it, expect } from "vitest";
import { CadenceFitFactor } from "../../../src/core/factors/CadenceFitFactor.js";
import { contextFor } from "../../fixtures/factorFixtures.js";
import { PhraseTemplates } from "../../../src/core/phrase/PhraseTemplates.js";

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

  // ---------------------------------------------------------------------------
  // desiredFinalFunction — half-cadence targeting (issue #19)
  // ---------------------------------------------------------------------------
  describe("desiredFinalFunction (half cadence)", () => {
    const halfCadence = PhraseTemplates.fourBarHalfCadence; // wants Dominant ending

    it("rewards a dominant ending over a tonic ending when the template wants a half cadence", () => {
      // phrasePosition 2 → candidate lands on the final position (3, Ending zone).
      const dominantEnding = factor.score(
        contextFor("ii", "V", { template: halfCadence, state: { phrasePosition: 2 } }),
      ).rawScore;
      const tonicEnding = factor.score(
        contextFor("V7", "I", { template: halfCadence, state: { phrasePosition: 2 } }),
      ).rawScore;
      expect(dominantEnding).toBeGreaterThan(tonicEnding);
    });

    it("scores the same dominant ending higher under a half-cadence template than a resolution template", () => {
      const underHalfCadence = factor.score(
        contextFor("ii", "V", { template: halfCadence, state: { phrasePosition: 2 } }),
      ).rawScore;
      // fourBarResolutionPump sets no desiredFinalFunction, so no final-function bias.
      const underResolution = factor.score(
        contextFor("ii", "V", {
          template: PhraseTemplates.fourBarResolutionPump,
          state: { phrasePosition: 2 },
        }),
      ).rawScore;
      expect(underHalfCadence).toBeGreaterThan(underResolution);
    });

    it("at the pre-cadential step, prefers a chord that can reach the dominant over a dead end", () => {
      // phrasePosition 1 → candidate lands on the pre-cadential position (2).
      // V can intensify to V7 (still dominant); V7/vii° only fall to a tonic.
      const setsUpDominant = factor.score(
        contextFor("ii", "V", { template: halfCadence, state: { phrasePosition: 1 } }),
      ).rawScore;
      const deadEnd = factor.score(
        contextFor("ii", "V7", { template: halfCadence, state: { phrasePosition: 1 } }),
      ).rawScore;
      expect(setsUpDominant).toBeGreaterThan(deadEnd);
    });
  });
});
