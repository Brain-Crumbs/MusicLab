import { describe, it, expect } from "vitest";
import { PhraseFitFactor } from "../../../src/core/factors/PhraseFitFactor.js";
import { contextFor } from "../../fixtures/factorFixtures.js";

const factor = new PhraseFitFactor();

describe("PhraseFitFactor", () => {
  it("prefers a tonic resolution at the phrase ending", () => {
    // phrasePosition 2 → candidate lands on position 3 → Ending zone.
    const tonic = factor.score(contextFor("V7", "I", { state: { phrasePosition: 2 } })).rawScore;
    const dominant = factor.score(
      contextFor("vi", "V7", { state: { phrasePosition: 2 } }),
    ).rawScore;
    expect(tonic).toBeGreaterThan(dominant);
  });

  it("prefers a dominant in the pre-cadential zone", () => {
    // phrasePosition 1 → candidate lands on position 2 → PreCadential zone.
    const dominant = factor.score(
      contextFor("vi", "V7", { state: { phrasePosition: 1 } }),
    ).rawScore;
    const tonic = factor.score(contextFor("V7", "I", { state: { phrasePosition: 1 } })).rawScore;
    expect(dominant).toBeGreaterThan(tonic);
  });

  it("prefers establishing the tonic at the phrase beginning", () => {
    // phrasePosition 3 → candidate lands on position 0 → Beginning zone.
    const tonic = factor.score(contextFor("V7", "I", { state: { phrasePosition: 3 } })).rawScore;
    const dominant = factor.score(
      contextFor("vi", "V7", { state: { phrasePosition: 3 } }),
    ).rawScore;
    expect(tonic).toBeGreaterThan(dominant);
  });
});
