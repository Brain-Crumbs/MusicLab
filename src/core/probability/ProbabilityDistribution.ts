import type { ProbabilityDistribution as ProbabilityDistributionContract } from "../model/GenerationStep.js";

/**
 * A single (edgeId, probability) pair in a discrete distribution.
 *
 * `edgeId` is an opaque string key — the probability engine attaches no
 * music-theory meaning to it.  In practice it is a {@link HarmonicEdge.id},
 * but nothing here depends on that.
 */
export interface ProbabilityEntry {
  readonly edgeId: string;
  readonly probability: number;
}

/**
 * Tolerance used when checking that a set of probabilities sums to 1.
 * Generous enough to absorb floating-point accumulation error over the small
 * candidate sets the engine deals with.
 */
const NORMALIZATION_EPSILON = 1e-9;

/**
 * An immutable, normalised probability distribution over opaque string keys.
 *
 * This is the concrete implementation of the model-layer
 * {@link ProbabilityDistributionContract} (declared in GenerationStep.ts).
 * It is deliberately music-theory-free: it stores ids and probabilities and
 * nothing else, so the same type serves softmax output, samplers, and the
 * diagnostics layer without coupling them to chords or edges.
 *
 * Invariants guaranteed after construction:
 *   - every probability is in [0, 1]
 *   - probabilities sum to 1 (within {@link NORMALIZATION_EPSILON})
 *   - `entries` is non-empty
 *   - `modalEdgeId` is the id of the highest-probability entry (first one on
 *     ties, so the result is deterministic)
 *
 * Construction goes through the static factories, which enforce these
 * invariants; the constructor itself is private.
 */
export class DiscreteProbabilityDistribution implements ProbabilityDistributionContract {
  readonly entries: readonly ProbabilityEntry[];
  readonly modalEdgeId: string;

  /** edgeId -> probability, for O(1) {@link getProbability}. */
  private readonly index: ReadonlyMap<string, number>;

  private constructor(
    entries: readonly ProbabilityEntry[],
    index: ReadonlyMap<string, number>,
    modalEdgeId: string,
  ) {
    this.entries = entries;
    this.index = index;
    this.modalEdgeId = modalEdgeId;
  }

  /** Probability assigned to `edgeId`, or 0 if it is not in the distribution. */
  getProbability(edgeId: string): number {
    return this.index.get(edgeId) ?? 0;
  }

  /** Number of candidates in the distribution. */
  get size(): number {
    return this.entries.length;
  }

  // -------------------------------------------------------------------------
  // Factories
  // -------------------------------------------------------------------------

  /**
   * Builds a distribution from already-normalised entries.
   *
   * Validates that probabilities are finite, non-negative, and sum to 1.
   * Use this when the caller has produced probabilities directly; use
   * {@link fromWeights} when the caller has unnormalised non-negative weights.
   *
   * @throws if `entries` is empty, contains a duplicate id, has a negative or
   *   non-finite probability, or does not sum to 1.
   */
  static fromEntries(entries: readonly ProbabilityEntry[]): DiscreteProbabilityDistribution {
    if (entries.length === 0) {
      throw new Error("ProbabilityDistribution requires at least one entry.");
    }

    const index = new Map<string, number>();
    let sum = 0;

    for (const { edgeId, probability } of entries) {
      if (!Number.isFinite(probability)) {
        throw new Error(`Probability for "${edgeId}" is not finite: ${probability}.`);
      }
      if (probability < 0) {
        throw new Error(`Probability for "${edgeId}" is negative: ${probability}.`);
      }
      if (index.has(edgeId)) {
        throw new Error(`Duplicate edge id in distribution: "${edgeId}".`);
      }
      index.set(edgeId, probability);
      sum += probability;
    }

    if (Math.abs(sum - 1) > NORMALIZATION_EPSILON) {
      throw new Error(`Probabilities must sum to 1 but summed to ${sum}.`);
    }

    return new DiscreteProbabilityDistribution(
      entries.map((e) => ({ ...e })),
      index,
      modalIdOf(entries),
    );
  }

  /**
   * Builds a distribution by normalising a set of non-negative weights:
   * `p_i = w_i / Σ w_j`.
   *
   * This is the natural constructor for {@link Softmax}, which produces
   * exponentiated (non-negative) weights.  At least one weight must be
   * strictly positive.
   *
   * @throws if `weights` is empty, contains a duplicate id, has a negative or
   *   non-finite weight, or the weights sum to 0.
   */
  static fromWeights(weights: readonly ProbabilityWeight[]): DiscreteProbabilityDistribution {
    if (weights.length === 0) {
      throw new Error("ProbabilityDistribution requires at least one weight.");
    }

    let total = 0;
    for (const { edgeId, weight } of weights) {
      if (!Number.isFinite(weight)) {
        throw new Error(`Weight for "${edgeId}" is not finite: ${weight}.`);
      }
      if (weight < 0) {
        throw new Error(`Weight for "${edgeId}" is negative: ${weight}.`);
      }
      total += weight;
    }

    if (total <= 0) {
      throw new Error("Weights must contain at least one positive value.");
    }

    const entries: ProbabilityEntry[] = weights.map(({ edgeId, weight }) => ({
      edgeId,
      probability: weight / total,
    }));

    return DiscreteProbabilityDistribution.fromEntries(entries);
  }

  /**
   * Builds a uniform distribution over the given ids: each receives `1 / n`.
   * Useful as a fallback (e.g. temperature → ∞) and in tests.
   *
   * @throws if `edgeIds` is empty or contains a duplicate.
   */
  static uniform(edgeIds: readonly string[]): DiscreteProbabilityDistribution {
    return DiscreteProbabilityDistribution.fromWeights(
      edgeIds.map((edgeId) => ({ edgeId, weight: 1 })),
    );
  }
}

/** An unnormalised, non-negative weight for a single candidate. */
export interface ProbabilityWeight {
  readonly edgeId: string;
  readonly weight: number;
}

/**
 * Returns the id of the highest-probability entry, breaking ties toward the
 * earliest entry so the choice is deterministic.  Assumes a non-empty array.
 */
function modalIdOf(entries: readonly ProbabilityEntry[]): string {
  let best: ProbabilityEntry | undefined;
  for (const entry of entries) {
    if (best === undefined || entry.probability > best.probability) {
      best = entry;
    }
  }
  if (best === undefined) {
    throw new Error("Cannot determine the modal id of an empty distribution.");
  }
  return best.edgeId;
}
