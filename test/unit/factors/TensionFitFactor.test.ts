import { describe, it, expect } from "vitest";
import { TensionFitFactor } from "../../../src/core/factors/TensionFitFactor.js";
import { contextFor } from "../../fixtures/factorFixtures.js";

const factor = new TensionFitFactor();

describe("TensionFitFactor", () => {
  it("prefers V7 over I when the target tension is high", () => {
    // phrasePosition 1 → candidate lands on position 2 → target 0.85 (high).
    const v7 = factor.score(contextFor("vi", "V7", { state: { phrasePosition: 1 } })).rawScore;
    const tonic = factor.score(contextFor("vi", "I", { state: { phrasePosition: 1 } })).rawScore;
    expect(v7).toBeGreaterThan(tonic);
  });

  it("prefers I over V7 when the target tension is low", () => {
    // phrasePosition 2 → candidate lands on position 3 → target 0.1 (low).
    const v7 = factor.score(contextFor("vi", "V7", { state: { phrasePosition: 2 } })).rawScore;
    const tonic = factor.score(contextFor("vi", "I", { state: { phrasePosition: 2 } })).rawScore;
    expect(tonic).toBeGreaterThan(v7);
  });

  it("peaks near +1.5 when predicted tension matches the target closely", () => {
    // Landing on I at position 3 (target 0.1) is a near-perfect tension match.
    const raw = factor.score(contextFor("V7", "I", { state: { phrasePosition: 2 } })).rawScore;
    expect(raw).toBeGreaterThan(0.8);
    expect(raw).toBeLessThanOrEqual(1.5 + 1e-9);
  });

  it("stays within the documented [-1.5, 1.5] range", () => {
    for (const pos of [0, 1, 2, 3]) {
      for (const to of ["I", "V7", "IV"]) {
        const raw = factor.score(contextFor("vi", to, { state: { phrasePosition: pos } })).rawScore;
        expect(raw).toBeGreaterThanOrEqual(-1.5 - 1e-9);
        expect(raw).toBeLessThanOrEqual(1.5 + 1e-9);
      }
    }
  });
});
