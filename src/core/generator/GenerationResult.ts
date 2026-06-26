import type { ChordId } from "../model/ChordId.js";
import type { MusicalState } from "../model/MusicalState.js";
import type { GenerationStep } from "../model/GenerationStep.js";
import type { GenerationTrace } from "../model/GenerationTrace.js";
import { TraceRecorder } from "../diagnostics/TraceRecorder.js";

/**
 * The complete output of one generation run.
 *
 * `chords` is the convenient shorthand most callers want; `steps`, `finalState`,
 * and `trace` carry the full explainable record so renderers and visualisation
 * builders can reconstruct *why* each chord was chosen without calling back into
 * the generator.
 */
export interface GenerationResult {
  /** The chosen chord ids in order — `steps.map(s => s.selectedChord)`. */
  readonly chords: readonly ChordId[];

  /** Every generation step, in order, with full candidate/score detail. */
  readonly steps: readonly GenerationStep[];

  /** The musical state after the final step. */
  readonly finalState: MusicalState;

  /** The aggregated, immutable record of the whole run. */
  readonly trace: GenerationTrace;
}

// ---------------------------------------------------------------------------
// Trace assembly
// ---------------------------------------------------------------------------

/**
 * Builds the {@link GenerationTrace} aggregate from a finished run's steps.
 *
 * Thin wrapper kept for backward compatibility: trace assembly now lives in the
 * Wave 7 {@link TraceRecorder} (the single source of truth), which also exposes
 * the diagnostic snapshot projections.  This delegates so existing callers and
 * the public export keep working unchanged.
 */
export function buildGenerationTrace(args: {
  readonly steps: readonly GenerationStep[];
  readonly finalState: MusicalState;
  readonly seed?: number;
  readonly generatedAt?: string;
}): GenerationTrace {
  return TraceRecorder.record(args);
}
