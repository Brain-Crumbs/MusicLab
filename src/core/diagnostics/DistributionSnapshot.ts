import type { ChordId } from "../model/ChordId.js";
import type { GenerationStep } from "../model/GenerationStep.js";

// ---------------------------------------------------------------------------
// D7.2 — Distribution snapshot model
//
// A DistributionSnapshot captures the *whole probability field* the generator
// considered at one step: every candidate's total score and post-softmax
// probability, which edge was the modal (most-probable) one, which was actually
// sampled, and a summary of how concentrated the field was (entropy).
//
// It is the data behind the "candidate distribution per step" debug view:
//
//   Current: ii
//   Candidate   Total Score   Probability
//   V7          4.8           62%
//   IV          1.9           14%
//   vi          1.1            8%
//
// This is a pure projection of generation output; building one never affects
// generation.  Per-candidate factor detail lives in ScoreBreakdown (D7.1); this
// snapshot stays at the distribution level so the two models are orthogonal.
// ---------------------------------------------------------------------------

/** One candidate's place in the distribution, without factor-level detail. */
export interface CandidateSnapshot {
  readonly edgeId: string;
  readonly toChord: ChordId;
  readonly totalScore: number;
  readonly probability: number;
  readonly selected: boolean;
}

/**
 * Snapshot of the candidate probability distribution at a single step.
 *
 * `candidates` preserves the step's ordering (highest total score first).
 * `entropy` is the Shannon entropy of the distribution in **nats** (natural
 * log): 0 when the choice was effectively forced, rising toward `ln(n)` as the
 * field flattens toward uniform over `n` candidates.  It is a temperature-free
 * read on how decisive the step was.
 */
export interface DistributionSnapshot {
  readonly stepIndex: number;
  readonly fromChord: ChordId;

  readonly candidates: readonly CandidateSnapshot[];

  /** Id of the edge that was sampled at this step. */
  readonly selectedEdgeId: string;
  /** Id of the highest-probability edge (may differ from the selected one). */
  readonly modalEdgeId: string;

  /** Shannon entropy of the distribution, in nats. */
  readonly entropy: number;
}

// ---------------------------------------------------------------------------
// Builder
// ---------------------------------------------------------------------------

/**
 * Projects a {@link GenerationStep} into a {@link DistributionSnapshot}.
 *
 * Probabilities are read from the step's own distribution, so the snapshot is
 * exactly the field the engine sampled from — no re-computation, no drift.
 */
export function buildDistributionSnapshot(
  step: GenerationStep,
): DistributionSnapshot {
  const selectedEdgeId = step.selectedEdge.id;

  const candidates: CandidateSnapshot[] = step.candidates.map((c) => ({
    edgeId: c.edge.id,
    toChord: c.edge.to,
    totalScore: c.totalScore,
    probability: step.distribution.getProbability(c.edge.id),
    selected: c.edge.id === selectedEdgeId,
  }));

  return {
    stepIndex: step.stepIndex,
    fromChord: step.previousState.currentChord,
    candidates,
    selectedEdgeId,
    modalEdgeId: step.distribution.modalEdgeId,
    entropy: shannonEntropy(candidates.map((c) => c.probability)),
  };
}

/**
 * Shannon entropy in nats: `H = -Σ pᵢ ln pᵢ`.
 *
 * Zero-probability terms contribute 0 (the `p·ln p → 0` limit), so they are
 * skipped rather than producing `NaN`.
 */
export function shannonEntropy(probabilities: readonly number[]): number {
  let h = 0;
  for (const p of probabilities) {
    if (p > 0) h -= p * Math.log(p);
  }
  return h;
}
