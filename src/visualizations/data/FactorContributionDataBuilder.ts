import type { CandidateScore } from "../../core/model/GenerationStep.js";
import type { GenerationStep } from "../../core/model/GenerationStep.js";
import { selectedCandidateScore } from "../../core/model/GenerationStep.js";

// ---------------------------------------------------------------------------
// V9.6 — Factor contribution data builder
//
// Projects one candidate's factor scores into the rows behind the most valuable
// debugging view — *why* a candidate scored the way it did:
//
//   Candidate: V7 -> I
//   harmonicGravity   +2.0
//   tensionFit        +1.2
//   cadenceFit        +2.4
//   novelty           -0.3
//   surprise          +0.0
//   total             +5.3
//
// Pure projection of generation output; building it never affects generation.
// The numbers are exactly the ones the CompositeFactorScorer produced — this
// builder only reshapes them for display.
// ---------------------------------------------------------------------------

/** One factor's contribution to a candidate's total score. */
export interface FactorContributionDatum {
  readonly factorId: string;
  /** Score before the factor weight is applied. */
  readonly rawScore: number;
  /** rawScore × factor weight — the value that actually enters the total. */
  readonly weightedScore: number;
  /** Optional human-readable reason from the factor. */
  readonly explanation?: string;
}

/**
 * Builds factor-contribution rows from a scored candidate.
 *
 * Stateless and pure.  `build` preserves the scorer's factor order so the
 * breakdown lines up with how the engine summed them; use
 * {@link FactorContributionDataBuilder.byInfluence} for a magnitude-sorted view.
 */
export class FactorContributionDataBuilder {
  /** Rows for an arbitrary scored candidate, in scorer order. */
  build(candidate: CandidateScore): FactorContributionDatum[] {
    return candidate.factorScores.map((s) => ({
      factorId: s.factorId,
      rawScore: s.rawScore,
      weightedScore: s.weightedScore,
      // exactOptionalPropertyTypes: only include explanation when present.
      ...(s.explanation !== undefined ? { explanation: s.explanation } : {}),
    }));
  }

  /**
   * Rows for the candidate that was actually selected at a step.
   * Returns an empty array if the selected edge is not among the candidates
   * (it always should be for a well-formed step).
   */
  buildForSelected(step: GenerationStep): FactorContributionDatum[] {
    const selected = selectedCandidateScore(step);
    return selected ? this.build(selected) : [];
  }

  /**
   * Same rows as {@link build}, re-ordered by absolute weighted influence
   * (largest first) for a "what mattered most" display.  Does not mutate input.
   */
  byInfluence(candidate: CandidateScore): FactorContributionDatum[] {
    return this.build(candidate).sort(
      (a, b) => Math.abs(b.weightedScore) - Math.abs(a.weightedScore),
    );
  }

  /** Sum of weighted contributions — equals the candidate's totalScore. */
  total(candidate: CandidateScore): number {
    return candidate.factorScores.reduce((sum, s) => sum + s.weightedScore, 0);
  }
}
