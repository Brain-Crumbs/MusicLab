import { describe, it, expect } from "vitest";
import { HarmonicGravityFactor } from "../../../src/core/factors/HarmonicGravityFactor.js";
import { makeFactorScore } from "../../../src/core/factors/FactorScore.js";
import { buildFactorContext } from "../../../src/core/factors/FactorContext.js";
import { PhraseEngine } from "../../../src/core/phrase/PhraseEngine.js";
import { PhraseTemplates } from "../../../src/core/phrase/PhraseTemplates.js";
import { InitialStateFactory } from "../../../src/core/state/InitialStateFactory.js";
import { createDefaultMvpConfig } from "../../../src/core/model/GenerationConfig.js";
import { chordId } from "../../../src/core/model/ChordId.js";
import { contextFor, topology } from "../../fixtures/factorFixtures.js";

describe("makeFactorScore", () => {
  it("applies the weight to produce weightedScore", () => {
    const score = makeFactorScore("harmonicGravity", 2, 0.5);
    expect(score.rawScore).toBe(2);
    expect(score.weightedScore).toBe(1);
    expect(score.factorId).toBe("harmonicGravity");
  });

  it("omits explanation when undefined (exactOptionalPropertyTypes)", () => {
    const score = makeFactorScore("novelty", 1, 1);
    expect("explanation" in score).toBe(false);
  });

  it("includes explanation when provided", () => {
    const score = makeFactorScore("novelty", 1, 1, "because");
    expect(score.explanation).toBe("because");
  });
});

describe("BaseFactor weighting", () => {
  it("multiplies rawScore by the configured factor weight", () => {
    const ctx = contextFor("V7", "I", {
      config: createDefaultMvpConfig({ seed: 1, factorWeights: { harmonicGravity: 2 } }),
    });
    const score = new HarmonicGravityFactor().score(ctx);
    expect(score.weightedScore).toBeCloseTo(score.rawScore * 2, 10);
  });

  it("defaults missing weights to 1", () => {
    const ctx = contextFor("V7", "I", {
      config: createDefaultMvpConfig({ seed: 1, factorWeights: {} }),
    });
    const score = new HarmonicGravityFactor().score(ctx);
    expect(score.weightedScore).toBeCloseTo(score.rawScore, 10);
  });

  it("disables the factor when its weight is 0", () => {
    const ctx = contextFor("V7", "I", {
      config: createDefaultMvpConfig({ seed: 1, factorWeights: { harmonicGravity: 0 } }),
    });
    const score = new HarmonicGravityFactor().score(ctx);
    expect(score.weightedScore).toBe(0);
  });

  it("exposes the factor id on the score", () => {
    const ctx = contextFor("V7", "I");
    expect(new HarmonicGravityFactor().score(ctx).factorId).toBe("harmonicGravity");
  });
});

describe("buildFactorContext", () => {
  it("resolves fromChord and toChord from the topology", () => {
    const ctx = contextFor("V7", "I");
    expect(ctx.fromChord.id).toBe("V7");
    expect(ctx.toChord.id).toBe("I");
  });

  it("builds the phrase frame for the position the candidate lands on", () => {
    // Initial state phrasePosition 0 → candidate lands on position 1.
    const config = createDefaultMvpConfig({ seed: 1 });
    const phraseEngine = new PhraseEngine(PhraseTemplates.fourBarResolutionPump);
    const state = InitialStateFactory.create(
      { steps: 8, initialChord: chordId("I") },
      config,
      topology,
    );
    const edge = topology.getOutgoingEdges(chordId("I")).find((e) => e.to === chordId("IV"))!;
    const ctx = buildFactorContext({ edge, state, config, topology, phraseEngine });
    expect(ctx.phrase.phrasePosition).toBe(1);
    expect(ctx.phrase.targetTension).toBe(PhraseTemplates.fourBarResolutionPump.tensionCurve[1]);
  });
});
