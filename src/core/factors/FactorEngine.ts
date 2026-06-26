import type { FactorId } from "../model/GenerationConfig.js";
import type { FactorContext } from "./FactorContext.js";
import type { FactorScore } from "./FactorScore.js";
import { makeFactorScore } from "./FactorScore.js";

/**
 * A factor engine is one independent "force" acting on candidate chord
 * transitions.  Each factor inspects a {@link FactorContext} and returns a
 * {@link FactorScore} expressing how much it wants (or doesn't want) that
 * candidate to be chosen.
 *
 * Design contract — every factor MUST be:
 *   - pure:        no side effects, no mutation of the context
 *   - stateless:   all required state arrives via FactorContext
 *   - deterministic: same context in → same score out (no randomness)
 *   - independent: it reasons about a single edge in isolation; combination
 *                  with other factors happens later in CompositeFactorScorer
 *
 * Keeping factors narrow and independent is what makes the engine explainable:
 * the total score for a candidate is simply the sum of each factor's
 * contribution, and each contribution can be inspected on its own.
 */
export interface FactorEngine {
  /** Stable identifier; also the key used to look up this factor's weight. */
  readonly id: FactorId;

  /** Scores a single candidate transition described by the context. */
  score(context: FactorContext): FactorScore;
}

/**
 * Convenience base class that handles the boilerplate shared by all factors:
 * looking up the factor's configured weight and assembling the FactorScore.
 *
 * Subclasses implement {@link computeRaw}, returning the intrinsic (unweighted)
 * score plus an optional explanation.  The weight is read from
 * `context.config.factorWeights[this.id]`, defaulting to 1 when unset.  Setting
 * a factor's weight to 0 effectively disables it (its weightedScore is always
 * 0), which is the intended way to turn a factor off without removing it.
 */
export abstract class BaseFactor implements FactorEngine {
  abstract readonly id: FactorId;

  /**
   * Computes the factor's intrinsic score for the candidate.
   * Return value range is by convention roughly [-2, 2]; see FactorScore.
   */
  protected abstract computeRaw(context: FactorContext): RawFactorResult;

  score(context: FactorContext): FactorScore {
    const { raw, explanation } = this.computeRaw(context);
    const weight = context.config.factorWeights[this.id] ?? 1;
    return makeFactorScore(this.id, raw, weight, explanation);
  }
}

/** Intermediate result returned by {@link BaseFactor.computeRaw}. */
export interface RawFactorResult {
  readonly raw: number;
  readonly explanation?: string;
}

// ---------------------------------------------------------------------------
// Shared numeric helpers used across factor implementations.
// ---------------------------------------------------------------------------

/** Clamps a value into the inclusive [min, max] range. */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
