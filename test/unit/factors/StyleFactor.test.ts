import { describe, it, expect } from "vitest";
import { StyleFactor } from "../../../src/core/factors/StyleFactor.js";
import { contextFor } from "../../fixtures/factorFixtures.js";
import { createDefaultMvpConfig } from "../../../src/core/model/GenerationConfig.js";
import { StyleProfiles } from "../../../src/core/model/StyleProfile.js";

const factor = new StyleFactor();

const folkStable = createDefaultMvpConfig({ seed: 1, styleProfile: StyleProfiles.folkStable });
const classical = createDefaultMvpConfig({
  seed: 1,
  styleProfile: StyleProfiles.classicalCadential,
});
const modal = createDefaultMvpConfig({ seed: 1, styleProfile: StyleProfiles.modalSurprising });

describe("StyleFactor", () => {
  it("scores a neutral edge (all weights 1) at 0", () => {
    // I -> IV is TonicToSubdominant with no style tags under folkStable,
    // so every multiplier is the neutral default of 1 → ln(1) = 0.
    const raw = factor.score(contextFor("I", "IV", { config: folkStable })).rawScore;
    expect(raw).toBeCloseTo(0, 6);
  });

  it("rewards an authentic cadence under a cadential style profile", () => {
    const raw = factor.score(contextFor("V7", "I", { config: classical })).rawScore;
    expect(raw).toBeGreaterThan(0.4);
  });

  it("discourages an authentic cadence under a modal/surprising profile", () => {
    const raw = factor.score(contextFor("V7", "I", { config: modal })).rawScore;
    expect(raw).toBeLessThan(0);
  });

  it("rewards modal return more under a modal profile than a classical one", () => {
    const underModal = factor.score(contextFor("bVII", "I", { config: modal })).rawScore;
    const underClassical = factor.score(contextFor("bVII", "I", { config: classical })).rawScore;
    expect(underModal).toBeGreaterThan(underClassical);
  });

  it("clamps within the documented [-3, 2] range", () => {
    for (const config of [folkStable, classical, modal]) {
      for (const [from, to] of [
        ["V7", "I"],
        ["bVII", "I"],
        ["I", "IV"],
        ["V", "vi"],
      ] as const) {
        const raw = factor.score(contextFor(from, to, { config })).rawScore;
        expect(raw).toBeGreaterThanOrEqual(-3 - 1e-9);
        expect(raw).toBeLessThanOrEqual(2 + 1e-9);
      }
    }
  });
});
