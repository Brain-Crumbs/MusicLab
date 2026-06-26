import {
  DiscreteProbabilityDistribution,
  type ProbabilityWeight,
} from "./ProbabilityDistribution.js";

/**
 * A scored candidate as seen by the probability engine.
 *
 * The engine is intentionally decoupled from music theory: it receives an
 * opaque string `id` and a real-valued `score`, never a chord or edge.  The
 * generator (Wave 6) adapts a music-theory `CandidateScore` into this shape by
 * taking `edge.id` and `totalScore`.
 */
export interface ScoredCandidate {
  /** Opaque candidate key (in practice a HarmonicEdge.id). */
  readonly id: string;
  /** Combined factor score; may be any finite real number. */
  readonly score: number;
}

/**
 * Converts candidate scores into a probability distribution via the
 * temperature-scaled softmax:
 *
 *   p_i = exp(s_i / T) / Σ_j exp(s_j / T)
 *
 * Temperature `T` controls how sharply probability concentrates on the
 * highest-scoring candidate:
 *   - low  T (→ 0)  sharpens toward an argmax (near-deterministic)
 *   - high T (→ ∞)  flattens toward uniform (maximally exploratory)
 *
 * The implementation is numerically stable: it subtracts the maximum score
 * before exponentiating, so large scores cannot overflow `Math.exp`.  Because
 * softmax is shift-invariant this does not change the result.
 *
 * Softmax holds no state and knows nothing about chords — music theory lives
 * upstream in factor scoring, randomness lives downstream in the sampler.
 */
export class Softmax {
  /**
   * Normalises `scores` into a {@link DiscreteProbabilityDistribution} under
   * the given `temperature`.
   *
   * @param scores      candidates to distribute probability over (non-empty).
   * @param temperature softmax temperature; must be finite and > 0.
   * @throws if `scores` is empty, any score is non-finite, or `temperature`
   *   is not a finite positive number.
   */
  static normalize(
    scores: readonly ScoredCandidate[],
    temperature: number,
  ): DiscreteProbabilityDistribution {
    if (scores.length === 0) {
      throw new Error("Softmax.normalize requires at least one candidate.");
    }
    if (!Number.isFinite(temperature) || temperature <= 0) {
      throw new Error(`Softmax temperature must be a finite positive number, got ${temperature}.`);
    }

    let maxScore = -Infinity;
    for (const { id, score } of scores) {
      if (!Number.isFinite(score)) {
        throw new Error(`Score for "${id}" is not finite: ${score}.`);
      }
      if (score > maxScore) {
        maxScore = score;
      }
    }

    // Shift by the max for numerical stability: exp((s - max) / T) ∈ (0, 1].
    // The top candidate exponentiates to exactly 1, guaranteeing a positive
    // total even when every other term underflows to 0.
    const weights: ProbabilityWeight[] = scores.map(({ id, score }) => ({
      edgeId: id,
      weight: Math.exp((score - maxScore) / temperature),
    }));

    return DiscreteProbabilityDistribution.fromWeights(weights);
  }
}
