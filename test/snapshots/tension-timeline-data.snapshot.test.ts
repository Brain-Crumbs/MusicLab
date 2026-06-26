import { describe, it, expect } from "vitest";
import { createDefaultMvpGenerator } from "../../src/core/generator/createDefaultMvpGenerator.js";
import { chordId } from "../../src/core/model/ChordId.js";
import { TensionTimelineDataBuilder } from "../../src/visualizations/data/TensionTimelineDataBuilder.js";

/**
 * V9.8 — tension timeline data snapshot test.
 *
 * Generation is deterministic for a fixed seed and the builder is a pure
 * projection of the trace, so the timeline is stable.  The snapshot pins the
 * target-vs-actual tension curve; a diff means either generation or the
 * projection changed.  Floats are rounded so the snapshot stays readable.
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
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [
        k,
        round(v),
      ]),
    );
  }
  return value;
}

describe("V9.8 — tension timeline data snapshot", () => {
  const result = createDefaultMvpGenerator({ seed: SEED }).generate({
    steps: 8,
    initialChord: chordId("I"),
  });
  const timeline = new TensionTimelineDataBuilder().build(result.trace);

  it("matches the recorded tension timeline", () => {
    expect(round(timeline)).toMatchSnapshot();
  });

  // ---------------------------------------------------------------------------
  // Invariants — independent of the snapshot.
  // ---------------------------------------------------------------------------

  it("emits one datum per step, in step order", () => {
    expect(timeline).toHaveLength(result.trace.steps.length);
    timeline.forEach((d, i) => expect(d.stepIndex).toBe(i));
  });

  it("mirrors each step's chord and tension fields", () => {
    timeline.forEach((d, i) => {
      const step = result.trace.steps[i]!;
      expect(d.chord).toBe(step.selectedChord);
      expect(d.targetTension).toBe(step.targetTension);
      expect(d.actualTension).toBe(step.resultingTension);
    });
  });

  it("computes tensionError as actual − target", () => {
    for (const d of timeline) {
      expect(d.tensionError).toBeCloseTo(d.actualTension - d.targetTension, 9);
    }
  });
});
