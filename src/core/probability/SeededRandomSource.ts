import type { RandomSource } from "./RandomSource.js";

/**
 * A deterministic {@link RandomSource} backed by the `mulberry32` PRNG.
 *
 * Seeded randomness is used from day one so that generation, tests, and
 * rendering are all reproducible: the same seed always yields the same stream
 * of numbers, and therefore the same progression.
 *
 * `mulberry32` is a small, fast 32-bit generator with a full 2^32 period and
 * good statistical quality for this use case (it is not cryptographically
 * secure, which the engine does not require).  State is a single 32-bit integer
 * advanced on every call to {@link next}.
 */
export class SeededRandomSource implements RandomSource {
  /** The seed this source was constructed with (for reproducibility/logging). */
  readonly seed: number;

  /** Current internal PRNG state, kept as a 32-bit unsigned integer. */
  private state: number;

  /**
   * @param seed any number; it is coerced to a 32-bit unsigned integer.  The
   *   same seed always produces the same sequence.  Defaults to 0.
   */
  constructor(seed = 0) {
    this.seed = seed;
    this.state = SeededRandomSource.normalizeSeed(seed);
  }

  /** Next pseudo-random number in [0, 1). */
  next(): number {
    // mulberry32
    this.state = (this.state + 0x6d2b79f5) | 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * Resets the source back to its initial seeded state, so it replays the
   * exact same sequence.  Useful in tests and when re-running a generation.
   */
  reset(): void {
    this.state = SeededRandomSource.normalizeSeed(this.seed);
  }

  /**
   * Returns an independent source seeded deterministically from this one's
   * current state.  Useful when a sub-process needs its own reproducible
   * stream without consuming this source's sequence beyond a single draw.
   */
  fork(): SeededRandomSource {
    return new SeededRandomSource(Math.floor(this.next() * 0x100000000));
  }

  /** Coerces an arbitrary number into a 32-bit unsigned seed. */
  private static normalizeSeed(seed: number): number {
    // `>>> 0` yields a uint32; flooring first handles non-integer seeds.
    return Math.floor(seed) >>> 0;
  }
}
