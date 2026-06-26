import type { ChordId } from "../model/ChordId.js";
import type { MusicalState } from "../model/MusicalState.js";
import type { GenerationStep } from "../model/GenerationStep.js";
import type {
  GenerationTrace,
  CadenceEvent,
  ChordUsageSummary,
} from "../model/GenerationTrace.js";
import { computeTensionSummary } from "../model/GenerationTrace.js";

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
 * Wave 7 introduces a dedicated TraceRecorder with richer diagnostics; this is
 * the lightweight in-generator assembly so Wave 6 can already return a complete,
 * self-describing {@link GenerationResult}.  It computes only what the
 * GenerationTrace contract requires and adds no behaviour of its own.
 *
 * A cadence is recorded for any step whose resulting cadence state shows a
 * cadence completed *at that step* (`stepsSinceLastCadence === 0`), which is
 * exactly how {@link CadenceClassifier} flags a fresh resolution.
 */
export function buildGenerationTrace(args: {
  readonly steps: readonly GenerationStep[];
  readonly finalState: MusicalState;
  readonly seed?: number;
  readonly generatedAt?: string;
}): GenerationTrace {
  const { steps, finalState } = args;

  const chordSequence: ChordId[] = steps.map((s) => s.selectedChord);

  const cadenceEvents: CadenceEvent[] = [];
  for (const step of steps) {
    const cs = step.cadenceState;
    if (cs.stepsSinceLastCadence === 0 && cs.lastCadenceType !== undefined) {
      cadenceEvents.push({
        stepIndex: step.stepIndex,
        cadenceType: cs.lastCadenceType,
        toChord: cs.lastCadenceToChord ?? step.selectedChord,
      });
    }
  }

  return {
    steps,
    chordSequence,
    finalState,
    totalSteps: steps.length,
    generatedAt: args.generatedAt ?? new Date().toISOString(),
    ...(args.seed !== undefined && { seed: args.seed }),
    tensionSummary: computeTensionSummary(steps),
    cadenceEvents,
    chordUsage: computeChordUsage(chordSequence),
  };
}

/** Per-chord counts and frequencies, sorted by frequency descending. */
function computeChordUsage(
  chordSequence: readonly ChordId[],
): ChordUsageSummary[] {
  const total = chordSequence.length;
  const counts = new Map<ChordId, number>();
  for (const chord of chordSequence) {
    counts.set(chord, (counts.get(chord) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([chord, count]) => ({
      chord,
      count,
      frequency: total > 0 ? count / total : 0,
    }))
    .sort((a, b) => b.count - a.count);
}
