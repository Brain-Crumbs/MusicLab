import { describe, it, expect } from "vitest";
import { createDefaultMvpGenerator } from "../../src/core/generator/createDefaultMvpGenerator.js";
import { chordId } from "../../src/core/model/ChordId.js";
import { selectedCandidateScore } from "../../src/core/model/GenerationStep.js";
import { FactorContributionDataBuilder } from "../../src/visualizations/data/FactorContributionDataBuilder.js";

/**
 * V9.9 — factor contribution data snapshot test.
 *
 * For a fixed seed the scorer's per-factor numbers are fixed, and the builder
 * only reshapes them, so the breakdown is stable.  The snapshot pins the factor
 * contributions for the selected candidate at each step; a diff means a factor's
 * scoring or a weight changed.  Floats are rounded so the snapshot stays
 * readable.
 */

const SEED = 4242;

/** Rounds every number to 6 dp so the snapshot is float-stable. */
function round(value: unknown): unknown {
  if (typeof value === "number") {
    return Number.isFinite(value) ? Number(value.toFixed(6)) : value;
  }
  if (Array.isArray(value)) return value.map(round);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, round(v)]),
    );
  }
  return value;
}

describe("V9.9 — factor contribution data snapshot", () => {
  const result = createDefaultMvpGenerator({ seed: SEED }).generate({
    steps: 8,
    initialChord: chordId("I"),
  });
  const builder = new FactorContributionDataBuilder();

  /** Selected-candidate breakdown per step, with its current chord for context. */
  const breakdowns = result.trace.steps.map((step) => ({
    stepIndex: step.stepIndex,
    from: step.previousState.currentChord,
    to: step.selectedChord,
    contributions: builder.buildForSelected(step),
  }));

  it("matches the per-step selected-candidate factor breakdowns", () => {
    expect(round(breakdowns)).toMatchSnapshot();
  });

  // ---------------------------------------------------------------------------
  // Invariants — independent of the snapshot.
  // ---------------------------------------------------------------------------

  it("breakdown rows sum to the selected candidate's total score", () => {
    for (const step of result.trace.steps) {
      const selected = selectedCandidateScore(step)!;
      const summed = builder.build(selected).reduce((s, c) => s + c.weightedScore, 0);
      expect(summed).toBeCloseTo(selected.totalScore, 9);
      expect(builder.total(selected)).toBeCloseTo(selected.totalScore, 9);
    }
  });

  it("byInfluence preserves the rows and orders by absolute weighted score", () => {
    const selected = selectedCandidateScore(result.trace.steps[0]!)!;
    const inOrder = builder.build(selected);
    const byInfluence = builder.byInfluence(selected);

    // Same multiset of factor ids, just reordered.
    expect(new Set(byInfluence.map((c) => c.factorId))).toEqual(
      new Set(inOrder.map((c) => c.factorId)),
    );

    const magnitudes = byInfluence.map((c) => Math.abs(c.weightedScore));
    const sorted = [...magnitudes].sort((a, b) => b - a);
    expect(magnitudes).toEqual(sorted);
  });
});
