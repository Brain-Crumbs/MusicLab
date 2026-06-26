import { describe, it, expect } from "vitest";
import { createDefaultMvpGenerator } from "../../src/core/generator/createDefaultMvpGenerator.js";
import { chordId } from "../../src/core/model/ChordId.js";
import { TraceRecorder } from "../../src/core/diagnostics/TraceRecorder.js";

/**
 * D7.6 — generation trace snapshot test.
 *
 * Pins the *explainable* output of a seeded run: the chord sequence, the trace
 * summaries (tension, cadences, chord usage), and the Wave 7 diagnostic
 * projections (distribution snapshots, score breakdowns, state snapshots).
 *
 * Diagnostics must never change generation, so a fixed seed must yield a fixed
 * trace.  The snapshot is the regression guard: if a future change perturbs the
 * recorded decisions or their explanations, this test fails loudly.
 *
 * `generatedAt` is excluded everywhere (it is wall-clock, not run-determined),
 * and floats are rounded so the snapshot is stable and readable.
 */

const SEED = 4242;
const REQUEST = { steps: 8, initialChord: chordId("I") };

/** Recursively rounds every number to 6 dp so snapshots are float-stable. */
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

describe("D7.6 — generation trace snapshot", () => {
  const result = createDefaultMvpGenerator({ seed: SEED }).generate(REQUEST);
  const { trace } = result;

  it("matches the recorded chord sequence", () => {
    expect(result.chords).toMatchSnapshot();
  });

  it("matches the recorded trace summaries", () => {
    expect(
      round({
        chordSequence: trace.chordSequence,
        totalSteps: trace.totalSteps,
        seed: trace.seed,
        tensionSummary: trace.tensionSummary,
        cadenceEvents: trace.cadenceEvents,
        chordUsage: trace.chordUsage,
      }),
    ).toMatchSnapshot();
  });

  it("matches the per-step distribution snapshots", () => {
    expect(round(TraceRecorder.distributionSnapshots(trace))).toMatchSnapshot();
  });

  it("matches the score breakdowns for the first step", () => {
    const firstStep = trace.steps[0]!;
    expect(round(TraceRecorder.scoreBreakdowns(firstStep))).toMatchSnapshot();
  });

  it("matches the state snapshots", () => {
    expect(round(TraceRecorder.stateSnapshots(trace))).toMatchSnapshot();
  });

  // ---------------------------------------------------------------------------
  // Invariants — assert the contracts directly, independent of the snapshot.
  // ---------------------------------------------------------------------------

  it("records the seed and an ISO-8601 timestamp", () => {
    expect(trace.seed).toBe(SEED);
    expect(() => new Date(trace.generatedAt).toISOString()).not.toThrow();
    expect(new Date(trace.generatedAt).toISOString()).toBe(trace.generatedAt);
  });

  it("produces one more state snapshot than steps (before + after each step)", () => {
    const snapshots = TraceRecorder.stateSnapshots(trace);
    expect(snapshots).toHaveLength(trace.steps.length + 1);
    // Last snapshot mirrors the final state's current chord.
    expect(snapshots.at(-1)!.currentChord).toBe(trace.finalState.currentChord);
  });

  it("each distribution snapshot sums to 1, has one selected candidate, and non-negative entropy", () => {
    for (const snap of TraceRecorder.distributionSnapshots(trace)) {
      const sum = snap.candidates.reduce((s, c) => s + c.probability, 0);
      expect(sum).toBeCloseTo(1, 9);

      const selected = snap.candidates.filter((c) => c.selected);
      expect(selected).toHaveLength(1);
      expect(selected[0]!.edgeId).toBe(snap.selectedEdgeId);

      expect(snap.entropy).toBeGreaterThanOrEqual(0);
    }
  });

  it("score breakdown totals equal the sum of weighted contributions", () => {
    for (const step of trace.steps) {
      for (const breakdown of TraceRecorder.scoreBreakdowns(step)) {
        const summed = breakdown.contributions.reduce((s, c) => s + c.weightedScore, 0);
        expect(breakdown.totalScore).toBeCloseTo(summed, 9);
      }
      // Exactly one breakdown per step is the selected edge.
      const selected = TraceRecorder.scoreBreakdowns(step).filter((b) => b.selected);
      expect(selected).toHaveLength(1);
      expect(selected[0]!.edgeId).toBe(step.selectedEdge.id);
    }
  });

  it("is reproducible: the same seed yields an identical trace projection", () => {
    const again = createDefaultMvpGenerator({ seed: SEED }).generate(REQUEST);
    expect(again.chords).toEqual(result.chords);
    expect(round(TraceRecorder.distributionSnapshots(again.trace))).toEqual(
      round(TraceRecorder.distributionSnapshots(trace)),
    );
  });
});
