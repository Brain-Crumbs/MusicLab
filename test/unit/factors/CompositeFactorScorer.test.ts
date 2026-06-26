import { describe, it, expect } from "vitest";
import { CompositeFactorScorer } from "../../../src/core/factors/CompositeFactorScorer.js";
import { makeFactorScore } from "../../../src/core/factors/FactorScore.js";
import type { FactorEngine } from "../../../src/core/factors/FactorEngine.js";
import type { FactorContext } from "../../../src/core/factors/FactorContext.js";
import type { FactorScore } from "../../../src/core/factors/FactorScore.js";
import type { FactorId } from "../../../src/core/model/GenerationConfig.js";
import { createDefaultMvpConfig } from "../../../src/core/model/GenerationConfig.js";
import { contextFor } from "../../fixtures/factorFixtures.js";

/**
 * A deterministic stub factor that reports a fixed raw score, applying the
 * weight from config so weighting behaviour can be asserted precisely.
 */
class StubFactor implements FactorEngine {
  constructor(
    readonly id: FactorId,
    private readonly raw: number,
  ) {}

  score(context: FactorContext): FactorScore {
    const weight = context.config.factorWeights[this.id] ?? 1;
    return makeFactorScore(this.id, this.raw, weight);
  }
}

describe("CompositeFactorScorer — summation", () => {
  it("sums weighted scores into totalScore", () => {
    const ctx = contextFor("V7", "I", {
      config: createDefaultMvpConfig({
        seed: 1,
        factorWeights: { harmonicGravity: 2, tensionFit: 0.5 },
      }),
    });
    const scorer = new CompositeFactorScorer([
      new StubFactor("harmonicGravity", 3), // 3 * 2 = 6
      new StubFactor("tensionFit", 4), // 4 * 0.5 = 2
    ]);

    const result = scorer.scoreCandidate(ctx);
    expect(result.totalScore).toBeCloseTo(8, 10);
  });

  it("keeps a per-factor breakdown in factor order", () => {
    const ctx = contextFor("V7", "I");
    const scorer = new CompositeFactorScorer([
      new StubFactor("harmonicGravity", 1),
      new StubFactor("tensionFit", 1),
      new StubFactor("novelty", 1),
    ]);

    const result = scorer.scoreCandidate(ctx);
    expect(result.factorScores).toHaveLength(3);
    expect(result.factorScores.map((s) => s.factorId)).toEqual([
      "harmonicGravity",
      "tensionFit",
      "novelty",
    ]);
  });

  it("totalScore always equals the sum of the breakdown's weightedScores", () => {
    const ctx = contextFor("V7", "I");
    const scorer = CompositeFactorScorer.createDefault();
    const result = scorer.scoreCandidate(ctx);
    const sum = result.factorScores.reduce((s, fs) => s + fs.weightedScore, 0);
    expect(result.totalScore).toBeCloseTo(sum, 10);
  });

  it("preserves the candidate edge", () => {
    const ctx = contextFor("V7", "I");
    const scorer = CompositeFactorScorer.createDefault();
    expect(scorer.scoreCandidate(ctx).edge).toBe(ctx.edge);
  });

  it("returns totalScore 0 and no breakdown for an empty factor set", () => {
    const ctx = contextFor("V7", "I");
    const result = new CompositeFactorScorer([]).scoreCandidate(ctx);
    expect(result.totalScore).toBe(0);
    expect(result.factorScores).toHaveLength(0);
  });
});

describe("CompositeFactorScorer — multiple candidates", () => {
  it("scores candidates in input order", () => {
    const scorer = CompositeFactorScorer.createDefault();
    const contexts = [contextFor("V7", "I"), contextFor("V7", "vi")];
    const results = scorer.scoreCandidates(contexts);
    expect(results).toHaveLength(2);
    expect(results[0]!.edge.to).toBe("I");
    expect(results[1]!.edge.to).toBe("vi");
  });
});

describe("CompositeFactorScorer — factory sets", () => {
  it("createDefault wires exactly the six MVP factors", () => {
    const scorer = CompositeFactorScorer.createDefault();
    expect(scorer.factorCount).toBe(6);
    expect(scorer.factorIds).toEqual([
      "harmonicGravity",
      "tensionFit",
      "phraseFit",
      "cadenceFit",
      "novelty",
      "surprise",
    ]);
  });

  it("defers style and memory in the MVP set", () => {
    const ids = CompositeFactorScorer.createDefault().factorIds;
    expect(ids).not.toContain("style");
    expect(ids).not.toContain("memory");
  });

  it("createWithAllFactors adds style and memory to the MVP six", () => {
    const scorer = CompositeFactorScorer.createWithAllFactors();
    expect(scorer.factorCount).toBe(8);
    expect(scorer.factorIds).toContain("style");
    expect(scorer.factorIds).toContain("memory");
  });

  it("produces a real, finite total for a real context with the default set", () => {
    const ctx = contextFor("V7", "I", { state: { phrasePosition: 2 } });
    const result = CompositeFactorScorer.createDefault().scoreCandidate(ctx);
    expect(Number.isFinite(result.totalScore)).toBe(true);
    expect(result.factorScores).toHaveLength(6);
  });
});

describe("CompositeFactorScorer — weighting", () => {
  it("a factor weighted 0 contributes nothing to the total", () => {
    const base = contextFor("V7", "I");
    const zeroed = contextFor("V7", "I", {
      config: createDefaultMvpConfig({ seed: 1, factorWeights: { harmonicGravity: 0 } }),
    });

    const scorer = new CompositeFactorScorer([new StubFactor("harmonicGravity", 5)]);
    expect(scorer.scoreCandidate(base).totalScore).toBeCloseTo(5, 10); // weight defaults to 1
    expect(scorer.scoreCandidate(zeroed).totalScore).toBe(0);
  });
});
