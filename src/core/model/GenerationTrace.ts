import type { ChordId } from "./ChordId.js";
import type { MusicalState } from "./MusicalState.js";
import type { CadenceType } from "./CadenceState.js";
import type { GenerationStep } from "./GenerationStep.js";

// ---------------------------------------------------------------------------
// Aggregate summary types
// ---------------------------------------------------------------------------

/** Tension statistics across all steps in the trace. */
export interface TensionSummary {
  /** Mean actual tension across all steps. */
  readonly meanTension: number;
  /** Maximum actual tension reached. */
  readonly peakTension: number;
  /** Minimum actual tension reached. */
  readonly troughTension: number;
  /** Mean absolute error between target and actual tension. */
  readonly meanTensionError: number;
  /** Step index at which peak tension occurred. */
  readonly peakStepIndex: number;
}

/** Record of a cadence that occurred during generation. */
export interface CadenceEvent {
  readonly stepIndex: number;
  readonly cadenceType: CadenceType;
  readonly toChord: ChordId;
}

/** Chord usage statistics across the full generation run. */
export interface ChordUsageSummary {
  readonly chord: ChordId;
  readonly count: number;
  /** Fraction of total steps (0–1). */
  readonly frequency: number;
}

// ---------------------------------------------------------------------------
// GenerationTrace
// ---------------------------------------------------------------------------

/**
 * The complete, immutable record of a generation run.
 *
 * Produced by TraceRecorder (D7.4) and attached to GenerationResult.
 * All visualisation builders (V9 wave) consume this type — they do not
 * call back into the generator.
 */
export interface GenerationTrace {
  // -------------------------------------------------------------------------
  // Core sequence
  // -------------------------------------------------------------------------

  /** All steps in order, index 0 = first chord chosen. */
  readonly steps: readonly GenerationStep[];

  /**
   * The chord the run started on — the starting state, not an emitted step, so
   * it is not part of `chordSequence`.  Undefined only for an empty (0-step)
   * trace where no starting chord can be recovered.  Renderers prepend it so
   * the displayed progression begins on the requested chord.
   */
  readonly initialChord?: ChordId;

  /** The chord ids in selection order — convenient shorthand over steps. */
  readonly chordSequence: readonly ChordId[];

  /** Final musical state after the last step. */
  readonly finalState: MusicalState;

  // -------------------------------------------------------------------------
  // Metadata
  // -------------------------------------------------------------------------

  readonly totalSteps: number;

  /** ISO 8601 timestamp of when the generation run started. */
  readonly generatedAt: string;

  /**
   * The seed used for this run.  Undefined when generation was not seeded.
   * Storing it here allows exact reproduction via GeneratorConfig.seed.
   */
  readonly seed?: number;

  // -------------------------------------------------------------------------
  // Aggregated summaries (populated by TraceRecorder)
  // -------------------------------------------------------------------------

  readonly tensionSummary: TensionSummary;

  /** All cadences that occurred, in order. */
  readonly cadenceEvents: readonly CadenceEvent[];

  /** Per-chord usage stats, sorted by frequency descending. */
  readonly chordUsage: readonly ChordUsageSummary[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns the step at the given index, or undefined if out of range. */
export function stepAt(trace: GenerationTrace, index: number): GenerationStep | undefined {
  return trace.steps[index];
}

/** Returns steps where the surprise budget was meaningfully consumed. */
export function surpriseSteps(trace: GenerationTrace, minCost = 0.5): readonly GenerationStep[] {
  return trace.steps.filter((s) => s.surpriseBudgetBefore - s.surpriseBudgetAfter >= minCost);
}

/** Returns steps where actual tension deviated from target by more than threshold. */
export function highTensionErrorSteps(
  trace: GenerationTrace,
  threshold = 0.2,
): readonly GenerationStep[] {
  return trace.steps.filter((s) => Math.abs(s.resultingTension - s.targetTension) > threshold);
}

/**
 * Computes a TensionSummary from raw steps.
 * Used by TraceRecorder; exposed here so tests can assert on the math.
 */
export function computeTensionSummary(steps: readonly GenerationStep[]): TensionSummary {
  if (steps.length === 0) {
    return {
      meanTension: 0,
      peakTension: 0,
      troughTension: 0,
      meanTensionError: 0,
      peakStepIndex: 0,
    };
  }

  let sum = 0;
  let errorSum = 0;
  let peak = -Infinity;
  let trough = Infinity;
  let peakStepIndex = 0;

  for (const step of steps) {
    const t = step.resultingTension;
    sum += t;
    errorSum += Math.abs(t - step.targetTension);
    if (t > peak) {
      peak = t;
      peakStepIndex = step.stepIndex;
    }
    if (t < trough) trough = t;
  }

  return {
    meanTension: sum / steps.length,
    peakTension: peak,
    troughTension: trough,
    meanTensionError: errorSum / steps.length,
    peakStepIndex,
  };
}
