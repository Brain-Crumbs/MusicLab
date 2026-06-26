import { describe, it, expect } from "vitest";
import { SurpriseFactor } from "../../../src/core/factors/SurpriseFactor.js";
import { contextFor, defaultConfig } from "../../fixtures/factorFixtures.js";
import type { GeneratorConfig } from "../../../src/core/model/GenerationConfig.js";

const factor = new SurpriseFactor();

/** Builds a config with a modified surprise config (not exposed by the MVP factory). */
function withSurprise(overrides: Partial<GeneratorConfig["surpriseConfig"]>): GeneratorConfig {
  return {
    ...defaultConfig,
    surpriseConfig: { ...defaultConfig.surpriseConfig, ...overrides },
  };
}

describe("SurpriseFactor", () => {
  it("scores expected (cost-free) moves at exactly 0", () => {
    // I -> IV is a free, expected move (surpriseCost 0).
    const raw = factor.score(contextFor("I", "IV")).rawScore;
    expect(raw).toBe(0);
  });

  it("penalises a rare move (negative score)", () => {
    // I -> bVII carries a surprise cost.
    const raw = factor.score(contextFor("I", "bVII")).rawScore;
    expect(raw).toBeLessThan(0);
  });

  it("penalises a rare move more heavily as the budget depletes", () => {
    const config = withSurprise({ emptyBudgetBehavior: "penalize" });
    const full = factor.score(
      contextFor("I", "bVII", {
        config,
        state: { surpriseBudget: config.surpriseConfig.maxBudget },
      }),
    ).rawScore;
    const empty = factor.score(
      contextFor("I", "bVII", { config, state: { surpriseBudget: 0 } }),
    ).rawScore;
    expect(empty).toBeLessThan(full);
  });

  it("blocks an unaffordable rare move when emptyBudgetBehavior is 'block'", () => {
    const config = withSurprise({ emptyBudgetBehavior: "block" });
    const raw = factor.score(
      contextFor("I", "bVII", { config, state: { surpriseBudget: 0.05 } }),
    ).rawScore;
    expect(raw).toBeLessThan(-1000);
  });

  it("does not block an affordable rare move in 'block' mode", () => {
    const config = withSurprise({ emptyBudgetBehavior: "block" });
    const raw = factor.score(
      contextFor("I", "bVII", { config, state: { surpriseBudget: 5 } }),
    ).rawScore;
    expect(raw).toBeGreaterThan(-1000);
    expect(raw).toBeLessThan(0);
  });
});
