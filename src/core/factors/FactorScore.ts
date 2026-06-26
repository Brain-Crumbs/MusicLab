import type { FactorId } from "../model/GenerationConfig.js";

/**
 * The contribution of a single factor to one candidate edge's total score.
 *
 * A FactorScore is the atomic unit of explainability in the engine: every
 * generation decision can be broken down into the list of FactorScores that
 * produced it (see CompositeFactorScorer and the diagnostics layer).
 *
 * Scores are additive.  The CompositeFactorScorer sums `weightedScore` across
 * all factors to obtain a candidate's total score, which is then passed to the
 * softmax.  Because the result is softmaxed, only *relative* differences
 * between candidates matter — a constant offset applied to every candidate has
 * no effect on the resulting probability distribution.
 */
export interface FactorScore {
  /** Which factor produced this score. */
  readonly factorId: FactorId;

  /**
   * The factor's intrinsic score before the per-factor weight is applied.
   * Conventionally in roughly [-2, 2]; positive values make the candidate more
   * attractive, negative values less so, and 0 is neutral.
   */
  readonly rawScore: number;

  /**
   * rawScore multiplied by the factor's configured weight
   * (GeneratorConfig.factorWeights).  This is the value that is summed into the
   * candidate's total score.
   */
  readonly weightedScore: number;

  /**
   * Optional human-readable explanation of why the factor scored the way it
   * did.  Consumed by the factor-contribution debugging view; never required
   * for generation itself.
   */
  readonly explanation?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Constructs a FactorScore, applying the per-factor weight and omitting the
 * `explanation` field when undefined (required by exactOptionalPropertyTypes).
 */
export function makeFactorScore(
  factorId: FactorId,
  rawScore: number,
  weight: number,
  explanation?: string,
): FactorScore {
  return {
    factorId,
    rawScore,
    weightedScore: rawScore * weight,
    ...(explanation !== undefined && { explanation }),
  };
}
