import type { ChordId } from "../model/ChordId.js";
import type { MusicalState } from "../model/MusicalState.js";
import type { GenerationStep } from "../model/GenerationStep.js";
import type {
  GenerationTrace,
  CadenceEvent,
  ChordUsageSummary,
} from "../model/GenerationTrace.js";
import { computeTensionSummary } from "../model/GenerationTrace.js";
import { type StateSnapshot, toStateSnapshot } from "./StateSnapshot.js";
import { type ScoreBreakdown, buildScoreBreakdown } from "./ScoreBreakdown.js";
import {
  type DistributionSnapshot,
  buildDistributionSnapshot,
} from "./DistributionSnapshot.js";

// ---------------------------------------------------------------------------
// D7.4 — Trace recorder
//
// TraceRecorder is the single, canonical assembler of a GenerationTrace from a
// finished run's steps, and the entry point for the Wave 7 diagnostic
// projections (ScoreBreakdown, DistributionSnapshot, StateSnapshot).
//
// It is strictly a *consumer* of generation output: it reads finished steps and
// produces immutable summaries and snapshots.  It holds no run state, performs
// no sampling, and can never change what the generator chose.  All methods are
// static and pure.
// ---------------------------------------------------------------------------

/** Inputs needed to assemble a {@link GenerationTrace}. */
export interface RecordTraceArgs {
  readonly steps: readonly GenerationStep[];
  readonly finalState: MusicalState;
  /**
   * The chord the run started on.  When omitted it is recovered from the first
   * step's previous state, so traces assembled directly from steps still record
   * where the progression began.
   */
  readonly initialChord?: ChordId;
  /** Seed used for the run, recorded so it can be replayed exactly. */
  readonly seed?: number;
  /** ISO-8601 timestamp; defaults to now if omitted. */
  readonly generatedAt?: string;
}

export class TraceRecorder {
  /**
   * Assembles the immutable {@link GenerationTrace} aggregate from a finished
   * run's steps.
   *
   * This is the authoritative implementation of trace assembly; the generator
   * routes through it (see {@link GenerationSession}).  It computes exactly what
   * the GenerationTrace contract requires — chord sequence, tension summary,
   * cadence events, and chord usage — and adds no behaviour of its own.
   *
   * A cadence is recorded for any step whose resulting cadence state shows a
   * cadence completed *at that step* (`stepsSinceLastCadence === 0`), which is
   * exactly how {@link CadenceClassifier} flags a fresh resolution.
   */
  static record(args: RecordTraceArgs): GenerationTrace {
    const { steps, finalState } = args;

    const chordSequence: ChordId[] = steps.map((s) => s.selectedChord);
    // Prefer the explicitly-supplied starting chord; otherwise recover it from
    // the first step's previous state.  Undefined only for an empty run.
    const initialChord =
      args.initialChord ?? steps[0]?.previousState.currentChord;

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
      ...(initialChord !== undefined && { initialChord }),
      totalSteps: steps.length,
      generatedAt: args.generatedAt ?? new Date().toISOString(),
      ...(args.seed !== undefined && { seed: args.seed }),
      tensionSummary: computeTensionSummary(steps),
      cadenceEvents,
      chordUsage: computeChordUsage(chordSequence),
    };
  }

  /** Alias for {@link record}, matching the overview's `fromSteps` naming. */
  static fromSteps(args: RecordTraceArgs): GenerationTrace {
    return TraceRecorder.record(args);
  }

  // -------------------------------------------------------------------------
  // Diagnostic projections (D7.1 / D7.2 / D7.3)
  //
  // These derive the Wave 7 diagnostic models from finished steps/traces.  They
  // are what visualisation builders (Wave 9) consume; the generator does not
  // need them, so they are kept off the GenerationTrace itself and produced on
  // demand.
  // -------------------------------------------------------------------------

  /**
   * Per-candidate {@link ScoreBreakdown}s for one step, in the step's own
   * candidate order (highest total score first).
   */
  static scoreBreakdowns(step: GenerationStep): readonly ScoreBreakdown[] {
    const selectedEdgeId = step.selectedEdge.id;
    return step.candidates.map((candidate) =>
      buildScoreBreakdown(
        candidate,
        step.distribution.getProbability(candidate.edge.id),
        candidate.edge.id === selectedEdgeId,
      ),
    );
  }

  /** The {@link DistributionSnapshot} for one step. */
  static distributionSnapshot(step: GenerationStep): DistributionSnapshot {
    return buildDistributionSnapshot(step);
  }

  /** A {@link DistributionSnapshot} per step, in order. */
  static distributionSnapshots(
    trace: GenerationTrace,
  ): readonly DistributionSnapshot[] {
    return trace.steps.map((step) => buildDistributionSnapshot(step));
  }

  /**
   * The sequence of {@link StateSnapshot}s the run passed through.
   *
   * Includes the initial state (each step's `previousState`) for every step,
   * followed by the run's `finalState`, giving `steps.length + 1` snapshots —
   * one before and after every transition.
   */
  static stateSnapshots(trace: GenerationTrace): readonly StateSnapshot[] {
    const snapshots: StateSnapshot[] = trace.steps.map((step) =>
      toStateSnapshot(step.previousState),
    );
    snapshots.push(toStateSnapshot(trace.finalState));
    return snapshots;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Per-chord counts and frequencies, sorted by count descending. */
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
