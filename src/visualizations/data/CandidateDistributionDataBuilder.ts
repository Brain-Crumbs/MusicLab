import type { ChordId } from "../../core/model/ChordId.js";
import type { GenerationStep } from "../../core/model/GenerationStep.js";
import type { GenerationTrace } from "../../core/model/GenerationTrace.js";

// ---------------------------------------------------------------------------
// V9.4 — Candidate distribution data builder
//
// Projects a single generation step into the rows behind the "what the
// generator was considering" view:
//
//   Current: ii
//   Candidate   Total Score   Probability
//   V7          4.8           62%
//   IV          1.9           14%
//   vi          1.1            8%
//   bVII        0.2            3%
//
// Pure projection of generation output; building it never affects generation.
// Probabilities are read from the step's own distribution, so the rows are
// exactly the field the engine sampled from — no re-computation.
// ---------------------------------------------------------------------------

/** One candidate row in a step's distribution. */
export interface CandidateDistributionDatum {
  readonly edgeId: string;
  /** The chord this candidate would move to (edge target). */
  readonly chord: ChordId;
  /** Total weighted factor score for this candidate. */
  readonly score: number;
  /** Post-softmax probability assigned to this candidate. */
  readonly probability: number;
  /** True for the candidate that was actually sampled. */
  readonly selected: boolean;
}

/** A step's full distribution: the current chord plus its candidate rows. */
export interface StepCandidateDistribution {
  readonly stepIndex: number;
  /** The chord the step departed from. */
  readonly current: ChordId;
  readonly candidates: readonly CandidateDistributionDatum[];
}

/**
 * Builds candidate-distribution rows from generation output.
 *
 * Stateless and pure.  Rows are sorted by probability descending, with ties
 * broken by score then edge id so the ordering is deterministic and stable for
 * snapshots.
 */
export class CandidateDistributionDataBuilder {
  /** Rows for a single step, highest-probability candidate first. */
  build(step: GenerationStep): CandidateDistributionDatum[] {
    const selectedEdgeId = step.selectedEdge.id;

    return step.candidates
      .map((c) => ({
        edgeId: c.edge.id,
        chord: c.edge.to,
        score: c.totalScore,
        probability: step.distribution.getProbability(c.edge.id),
        selected: c.edge.id === selectedEdgeId,
      }))
      .sort(byProbabilityDescending);
  }

  /** Per-step distributions across an entire run, in step order. */
  buildAll(trace: GenerationTrace): StepCandidateDistribution[] {
    return trace.steps.map((step) => ({
      stepIndex: step.stepIndex,
      current: step.previousState.currentChord,
      candidates: this.build(step),
    }));
  }
}

// ---------------------------------------------------------------------------
// Ordering (module-private)
// ---------------------------------------------------------------------------

function byProbabilityDescending(
  a: CandidateDistributionDatum,
  b: CandidateDistributionDatum,
): number {
  if (b.probability !== a.probability) return b.probability - a.probability;
  if (b.score !== a.score) return b.score - a.score;
  return a.edgeId < b.edgeId ? -1 : a.edgeId > b.edgeId ? 1 : 0;
}
