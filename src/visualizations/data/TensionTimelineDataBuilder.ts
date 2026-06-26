import type { ChordId } from "../../core/model/ChordId.js";
import type { GenerationTrace } from "../../core/model/GenerationTrace.js";

// ---------------------------------------------------------------------------
// V9.5 — Tension timeline data builder
//
// Projects a generation trace into the rows behind the "is the resolution pump
// working?" view: target vs. actual tension at each step.
//
//   Step   Chord   Target   Actual
//   0      I       0.20     0.18
//   1      IV      0.50     0.45
//   2      V7      0.85     0.82
//   3      I       0.10     0.22
//
// Pure projection of generation output; building it never affects generation.
// The signed `tensionError` (actual − target) lets a renderer show whether the
// engine ran hot or cold of the phrase's target at each step.
// ---------------------------------------------------------------------------

/** One step on the tension timeline. */
export interface TensionTimelineDatum {
  readonly stepIndex: number;
  /** The chord chosen at this step. */
  readonly chord: ChordId;
  /** Target tension for this phrase position (from the PhraseTemplate). */
  readonly targetTension: number;
  /** Actual tension after the transition. */
  readonly actualTension: number;
  /** Signed deviation: actual − target.  Positive = hotter than intended. */
  readonly tensionError: number;
}

/**
 * Builds the tension timeline from a {@link GenerationTrace}.
 *
 * Stateless and pure; rows follow the trace's step order one-to-one.
 */
export class TensionTimelineDataBuilder {
  build(trace: GenerationTrace): TensionTimelineDatum[] {
    return trace.steps.map((step) => ({
      stepIndex: step.stepIndex,
      chord: step.selectedChord,
      targetTension: step.targetTension,
      actualTension: step.resultingTension,
      tensionError: step.resultingTension - step.targetTension,
    }));
  }
}
