/**
 * Source of uniform pseudo-random numbers in the half-open interval [0, 1).
 *
 * This is the single point at which non-determinism enters the engine.  By
 * funnelling all randomness through this interface, the generator can be made
 * fully reproducible (see {@link SeededRandomSource}) and the
 * {@link WeightedSampler} can be tested with a deterministic stub.
 *
 * The probability engine never calls `Math.random` directly.
 */
export interface RandomSource {
  /**
   * Returns the next pseudo-random number, uniformly distributed in [0, 1).
   * Implementations must never return 1, NaN, or a value outside the range.
   */
  next(): number;
}
