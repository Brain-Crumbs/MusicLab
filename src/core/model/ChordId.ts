/**
 * Roman-numeral chord identifier used throughout the harmonic engine.
 * Examples: "I", "ii", "V7", "bVII", "vii°"
 *
 * Using a branded string so raw strings can't be accidentally passed where
 * a ChordId is expected without an explicit cast.
 */
export type ChordId = string & { readonly __brand: "ChordId" };

/**
 * Cast a plain string to ChordId. Use only at system boundaries (config
 * parsing, user input, catalog definitions) — internal code should propagate
 * ChordId values rather than constructing them.
 */
export function chordId(value: string): ChordId {
  return value as ChordId;
}

/**
 * The complete set of chord identifiers supported in the MVP major-key graph.
 */
export const MVP_CHORD_IDS = [
  "I",
  "ii",
  "iii",
  "IV",
  "V",
  "V7",
  "vi",
  "vii°",
  "bVII",
] as const satisfies string[];

export type MvpChordId = (typeof MVP_CHORD_IDS)[number];
