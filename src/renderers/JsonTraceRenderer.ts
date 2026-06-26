import type { ChordId } from "../core/model/ChordId.js";
import type { GenerationStep } from "../core/model/GenerationStep.js";
import type { GenerationTrace } from "../core/model/GenerationTrace.js";
import type { GenerationResult } from "../core/generator/GenerationResult.js";

// ---------------------------------------------------------------------------
// R8.5 — JSON trace renderer
//
// Serialises a generation trace to a stable, fully self-describing JSON string
// for tooling, archival, and "explain this run" debugging.
//
// It does NOT JSON.stringify the trace directly: the trace carries class
// instances (the ProbabilityDistribution) and back-references (each step holds
// whole previous/next MusicalState objects), which would serialise opaquely or
// redundantly.  Instead it builds an explicit, flat projection — every field is
// a primitive, an array, or a plain object — so the output is predictable and
// diffable.
// ---------------------------------------------------------------------------

export interface JsonTraceOptions {
  /** Pretty-print with indentation.  Default: true. */
  readonly pretty?: boolean;
  /** Indent width when pretty-printing.  Default: 2. */
  readonly indent?: number;
  /**
   * Include `generatedAt` (wall-clock timestamp).  Default: true.
   * Set false for reproducible, diff-stable output across runs.
   */
  readonly includeTimestamp?: boolean;
}

// --- Serialisable shapes ----------------------------------------------------

export interface JsonFactor {
  readonly factorId: string;
  readonly rawScore: number;
  readonly weightedScore: number;
  readonly explanation?: string;
}

export interface JsonCandidate {
  readonly edgeId: string;
  readonly from: ChordId;
  readonly to: ChordId;
  readonly totalScore: number;
  readonly probability: number;
  readonly selected: boolean;
  readonly factors: readonly JsonFactor[];
}

export interface JsonStep {
  readonly stepIndex: number;
  readonly fromChord: ChordId;
  readonly selectedChord: ChordId;
  readonly selectedEdgeId: string;
  readonly targetTension: number;
  readonly resultingTension: number;
  readonly surpriseBudgetBefore: number;
  readonly surpriseBudgetAfter: number;
  readonly candidates: readonly JsonCandidate[];
}

export interface JsonTrace {
  readonly chordSequence: readonly ChordId[];
  readonly totalSteps: number;
  readonly seed?: number;
  readonly generatedAt?: string;
  readonly tensionSummary: GenerationTrace["tensionSummary"];
  readonly cadenceEvents: GenerationTrace["cadenceEvents"];
  readonly chordUsage: GenerationTrace["chordUsage"];
  readonly steps: readonly JsonStep[];
}

/**
 * Renders a {@link GenerationTrace} to JSON.  Pure and stateless.
 */
export class JsonTraceRenderer {
  /** Renders the trace of a finished run as a JSON string. */
  render(result: GenerationResult, options: JsonTraceOptions = {}): string {
    return this.renderTrace(result.trace, options);
  }

  /** Renders a trace directly as a JSON string. */
  renderTrace(trace: GenerationTrace, options: JsonTraceOptions = {}): string {
    const obj = this.toObject(trace, options);
    const pretty = options.pretty ?? true;
    return pretty
      ? JSON.stringify(obj, null, options.indent ?? 2)
      : JSON.stringify(obj);
  }

  /** Builds the plain serialisable projection (exposed for testing/reuse). */
  toObject(trace: GenerationTrace, options: JsonTraceOptions = {}): JsonTrace {
    const includeTimestamp = options.includeTimestamp ?? true;

    return {
      chordSequence: trace.chordSequence,
      totalSteps: trace.totalSteps,
      ...(trace.seed !== undefined ? { seed: trace.seed } : {}),
      ...(includeTimestamp ? { generatedAt: trace.generatedAt } : {}),
      tensionSummary: trace.tensionSummary,
      cadenceEvents: trace.cadenceEvents,
      chordUsage: trace.chordUsage,
      steps: trace.steps.map((step) => toJsonStep(step)),
    };
  }
}

// ---------------------------------------------------------------------------
// Step projection
// ---------------------------------------------------------------------------

function toJsonStep(step: GenerationStep): JsonStep {
  return {
    stepIndex: step.stepIndex,
    fromChord: step.selectedEdge.from,
    selectedChord: step.selectedChord,
    selectedEdgeId: step.selectedEdge.id,
    targetTension: step.targetTension,
    resultingTension: step.resultingTension,
    surpriseBudgetBefore: step.surpriseBudgetBefore,
    surpriseBudgetAfter: step.surpriseBudgetAfter,
    candidates: step.candidates.map((candidate) => ({
      edgeId: candidate.edge.id,
      from: candidate.edge.from,
      to: candidate.edge.to,
      totalScore: candidate.totalScore,
      probability: step.distribution.getProbability(candidate.edge.id),
      selected: candidate.edge.id === step.selectedEdge.id,
      factors: candidate.factorScores.map((f) => ({
        factorId: f.factorId,
        rawScore: f.rawScore,
        weightedScore: f.weightedScore,
        ...(f.explanation !== undefined ? { explanation: f.explanation } : {}),
      })),
    })),
  };
}
