import type { RandomSource } from "./RandomSource.js";
import type { ProbabilityDistribution } from "../model/GenerationStep.js";

/**
 * The candidate chosen by a {@link WeightedSampler}, together with the
 * probability it was drawn with (handy for tracing and diagnostics).
 */
export interface SampledCandidate {
  /** Opaque id of the selected candidate (a HarmonicEdge.id in practice). */
  readonly edgeId: string;
  /** The probability that was assigned to the selected candidate. */
  readonly probability: number;
}

/**
 * Draws a single candidate from a {@link ProbabilityDistribution} in proportion
 * to its probability, using a supplied {@link RandomSource}.
 *
 * The sampler is the "how desire becomes a choice" stage: it knows nothing
 * about chords or factors, only ids and probabilities.  Selection uses the
 * inverse-CDF (cumulative) method — a single random draw `r ∈ [0, 1)` is walked
 * against the running cumulative probability, so a candidate with probability
 * `p` is selected with frequency `p`.
 *
 * Because every id in the distribution came from the candidate set, the sampler
 * can never return an "impossible" candidate.  A zero-probability candidate is
 * never selected (its cumulative band has zero width).
 */
export class WeightedSampler {
  private readonly random: RandomSource;

  constructor(random: RandomSource) {
    this.random = random;
  }

  /**
   * Samples one candidate from `distribution`.
   *
   * @throws if the distribution is empty.
   */
  sample(distribution: ProbabilityDistribution): SampledCandidate {
    const entries = distribution.entries;
    if (entries.length === 0) {
      throw new Error("WeightedSampler cannot sample from an empty distribution.");
    }

    const r = this.random.next();

    let cumulative = 0;
    let lastNonZero: { edgeId: string; probability: number } | undefined;

    for (const entry of entries) {
      // Skip zero-probability bands so they can never be selected.
      if (entry.probability > 0) {
        lastNonZero = entry;
        cumulative += entry.probability;
        if (r < cumulative) {
          return { edgeId: entry.edgeId, probability: entry.probability };
        }
      }
    }

    // Floating-point guard: if rounding left `r` just past the final cumulative
    // total, fall back to the last candidate that carried positive probability.
    if (lastNonZero !== undefined) {
      return { edgeId: lastNonZero.edgeId, probability: lastNonZero.probability };
    }

    // Every entry had zero probability — a malformed distribution.
    throw new Error("WeightedSampler cannot sample: all probabilities are zero.");
  }

  /** Convenience wrapper returning only the selected id. */
  sampleEdgeId(distribution: ProbabilityDistribution): string {
    return this.sample(distribution).edgeId;
  }
}
