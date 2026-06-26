import type { ChordId } from "../model/ChordId.js";
import type { CandidateScore, FactorScore } from "../model/GenerationStep.js";

// ---------------------------------------------------------------------------
// D7.1 — Score breakdown model
//
// A ScoreBreakdown explains *why one candidate scored the way it did* at a
// single generation step.  It pairs the per-factor contributions that produced
// a candidate's total score with the probability the softmax ultimately
// assigned it, and whether it was the move that was sampled.
//
// This is the atomic unit behind the "factor contribution breakdown" debug
// view:
//
//   Candidate: V7 -> I        p = 0.62   (selected)
//     harmonicGravity   +2.0
//     cadenceFit        +2.4
//     novelty           -0.3
//     total             +5.3
//
// It is a pure projection of generation output (a CandidateScore plus the
// step's distribution); building one never affects generation.
// ---------------------------------------------------------------------------

/**
 * One factor's contribution to a candidate's total score.
 *
 * Structurally identical to {@link FactorScore} — the diagnostics layer reuses
 * the factor contract directly rather than redefining it, so a breakdown's
 * numbers are exactly the numbers the scorer produced.
 */
export type FactorContribution = FactorScore;

/**
 * The full factor-level explanation for a single candidate edge at one step.
 *
 * `contributions` preserves the order the scorer emitted (one entry per active
 * factor); `totalScore` is their summed `weightedScore`; `probability` is the
 * post-softmax probability the candidate received; `selected` marks the edge
 * that was actually sampled.
 */
export interface ScoreBreakdown {
  readonly edgeId: string;
  readonly fromChord: ChordId;
  readonly toChord: ChordId;

  readonly contributions: readonly FactorContribution[];
  readonly totalScore: number;
  readonly probability: number;
  readonly selected: boolean;
}

// ---------------------------------------------------------------------------
// Builder
// ---------------------------------------------------------------------------

/**
 * Builds a {@link ScoreBreakdown} from a scored candidate.
 *
 * @param candidate    the scored edge, as produced by CompositeFactorScorer.
 * @param probability  the post-softmax probability assigned to this edge.
 * @param selected     whether this edge was the one sampled at the step.
 */
export function buildScoreBreakdown(
  candidate: CandidateScore,
  probability: number,
  selected: boolean,
): ScoreBreakdown {
  return {
    edgeId: candidate.edge.id,
    fromChord: candidate.edge.from,
    toChord: candidate.edge.to,
    contributions: candidate.factorScores.map((s) => ({ ...s })),
    totalScore: candidate.totalScore,
    probability,
    selected,
  };
}

/**
 * Sorts contributions by the magnitude of their influence on the total
 * (largest absolute `weightedScore` first), for display.  Returns a new array;
 * does not mutate the breakdown.
 */
export function contributionsByInfluence(
  breakdown: ScoreBreakdown,
): readonly FactorContribution[] {
  return [...breakdown.contributions].sort(
    (a, b) => Math.abs(b.weightedScore) - Math.abs(a.weightedScore),
  );
}
