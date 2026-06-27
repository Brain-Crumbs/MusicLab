/**
 * A pitch class in the range [0, 11], where 0 = C and 11 = B.
 * Pitch classes are octave-independent: C3 and C5 share pitch class 0.
 */
export type PitchClass = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;

/** Clamps an integer modulo 12 into a valid PitchClass. */
export function toPitchClass(n: number): PitchClass {
  return (((n % 12) + 12) % 12) as PitchClass;
}
