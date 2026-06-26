import type { ChordId } from "./ChordId.js";
import { HarmonicFunction, SourceMode } from "./HarmonicFunction.js";

/**
 * Chord quality — the interval structure of the triad or seventh chord.
 * Does not encode extensions; those live in ChordExtension[].
 */
export enum ChordQuality {
  Major = "major",
  Minor = "minor",
  Diminished = "diminished",
  Augmented = "augmented",
  /** Dominant seventh triad quality (major triad + minor 7th) */
  DominantSeventh = "dominant_seventh",
  /** Half-diminished / minor 7 flat 5 */
  HalfDiminished = "half_diminished",
}

/**
 * Coloring extensions added on top of the base triad.
 * The 7th is handled via ChordQuality.DominantSeventh for V7;
 * these extensions represent additional colour tones.
 */
export enum ChordExtension {
  MajorSeventh = "major_seventh",
  MinorSeventh = "minor_seventh",
  /** Flat 7 in a dominant context — same interval as MinorSeventh but
   *  semantically distinct when applied to a major triad (V7). */
  DominantSeventh = "dominant_seventh",
  Ninth = "ninth",
  FlatNinth = "flat_ninth",
  SharpNinth = "sharp_ninth",
  Eleventh = "eleventh",
  SharpEleventh = "sharp_eleventh",
  Thirteenth = "thirteenth",
  AddNine = "add_nine",
  SuspendedSecond = "suspended_second",
  SuspendedFourth = "suspended_fourth",
}

/**
 * A chord node in the harmonic topology.
 *
 * Chords are identified by Roman numeral (ChordId) and carry enough
 * metadata for factors to reason about their tonal role, tension level,
 * and relationship to the home key — without encoding any concrete pitch
 * information (that belongs to renderers).
 */
export interface Chord {
  /** Roman-numeral identifier, e.g. "I", "V7", "bVII". */
  readonly id: ChordId;

  /** Scale degree of the root, 1–7. bVII has scaleDegree 7 with accidentalOffset -1. */
  readonly scaleDegree: number;

  /**
   * Semitone offset applied to the natural scale degree.
   * 0 = diatonic, -1 = flattened (bVII, bVI), +1 = sharpened.
   */
  readonly accidentalOffset: number;

  /** Triad/seventh quality. */
  readonly quality: ChordQuality;

  /** Additional colour tones beyond the base quality. Empty for simple triads. */
  readonly extensions: readonly ChordExtension[];

  /**
   * Inversion: 0 = root position, 1 = first, 2 = second, 3 = third.
   * Undefined means root position is assumed.
   */
  readonly inversion?: number;

  /** Primary functional role within the current key. */
  readonly harmonicFunction: HarmonicFunction;

  /** Indicates if the chord is borrowed from a parallel or modal source. */
  readonly sourceMode?: SourceMode;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns true when the chord carries any form of seventh extension. */
export function hasSeventh(chord: Chord): boolean {
  return (
    chord.quality === ChordQuality.DominantSeventh ||
    chord.quality === ChordQuality.HalfDiminished ||
    chord.extensions.some(
      (e) =>
        e === ChordExtension.MajorSeventh ||
        e === ChordExtension.MinorSeventh ||
        e === ChordExtension.DominantSeventh,
    )
  );
}

/** Returns true when the chord is borrowed (modal interchange or parallel). */
export function isBorrowed(chord: Chord): boolean {
  return chord.sourceMode !== undefined && chord.sourceMode !== SourceMode.Diatonic;
}
