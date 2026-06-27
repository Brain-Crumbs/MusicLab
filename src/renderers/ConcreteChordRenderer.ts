import type { Chord } from "../core/model/Chord.js";
import { ChordExtension, ChordQuality } from "../core/model/Chord.js";
import type { ChordId } from "../core/model/ChordId.js";
import type { MusicalKey } from "../core/model/MusicalState.js";
import {
  KEY_PITCH_CLASS,
  LETTER_PITCH_CLASS,
  MAJOR_SCALE_SEMITONES,
} from "../core/model/PitchClasses.js";
import { ChordCatalog } from "../core/topology/ChordCatalog.js";

// ---------------------------------------------------------------------------
// R8.2 — Concrete chord renderer
//
// Turns key-relative Roman-numeral chords into concrete chord symbols for a
// given key:
//
//   V7   in C major -> "G7"
//   bVII in C major -> "Bb"
//   ii   in D major -> "Em"
//
// Spelling is letter-aware, not just pitch-class-aware: the root letter is
// derived from the chord's scale degree relative to the key's tonic letter,
// then accidentals are added to reach the correct pitch class.  This keeps
// enharmonic spelling musically sane (bVII in C is "Bb", never "A#").
// ---------------------------------------------------------------------------

/** Anything that can resolve a ChordId to its Chord definition. */
export interface ChordResolver {
  getChord(id: ChordId): Chord;
}

/** Diatonic letter names in scale order. */
const LETTERS = ["C", "D", "E", "F", "G", "A", "B"] as const;

export interface ConcreteChordSymbols {
  /** Suffix for minor triads.  Default: "m". */
  readonly minor?: string;
  /** Suffix for diminished triads.  Default: "dim". */
  readonly diminished?: string;
  /** Suffix for augmented triads.  Default: "aug". */
  readonly augmented?: string;
  /** Suffix for dominant-seventh chords.  Default: "7". */
  readonly dominantSeventh?: string;
  /** Suffix for half-diminished chords.  Default: "m7b5". */
  readonly halfDiminished?: string;
}

const DEFAULT_SYMBOLS: Required<ConcreteChordSymbols> = {
  minor: "m",
  diminished: "dim",
  augmented: "aug",
  dominantSeventh: "7",
  halfDiminished: "m7b5",
};

/**
 * Renders Roman-numeral chords as concrete chord symbols in a chosen key.
 *
 * Pure and stateless.  Holds no key state itself — the key is passed per call,
 * so one renderer instance can serve any key.
 */
export class ConcreteChordRenderer {
  private readonly symbols: Required<ConcreteChordSymbols>;

  constructor(symbols: ConcreteChordSymbols = {}) {
    this.symbols = { ...DEFAULT_SYMBOLS, ...symbols };
  }

  /**
   * Renders a single chord in the given key, e.g. `V7` + `C` -> `"G7"`.
   */
  renderChord(chord: Chord, key: MusicalKey): string {
    return this.renderRoot(chord, key) + this.qualitySuffix(chord);
  }

  /** Renders a list of chords, preserving order. */
  renderChords(chords: readonly Chord[], key: MusicalKey): string[] {
    return chords.map((chord) => this.renderChord(chord, key));
  }

  /**
   * Renders a sequence of chord ids by resolving each through `resolver`.
   * Defaults to the MVP major-key catalog when no resolver is supplied.
   */
  renderSequence(
    chordIds: readonly ChordId[],
    key: MusicalKey,
    resolver: ChordResolver = defaultMvpResolver(),
  ): string[] {
    return chordIds.map((id) => this.renderChord(resolver.getChord(id), key));
  }

  // -------------------------------------------------------------------------
  // Internals
  // -------------------------------------------------------------------------

  /** Computes the concrete root note (letter + accidentals) for the key. */
  private renderRoot(chord: Chord, key: MusicalKey): string {
    const degreeIndex = chord.scaleDegree - 1; // 0–6
    const tonicLetter = key[0] as string; // "Eb" -> "E"
    const tonicLetterIndex = LETTERS.indexOf(tonicLetter as (typeof LETTERS)[number]);

    const rootLetter = LETTERS[(tonicLetterIndex + degreeIndex) % 7] ?? "C";
    const naturalPitchClass = LETTER_PITCH_CLASS[rootLetter] ?? 0;

    const targetPitchClass =
      (((KEY_PITCH_CLASS[key] +
        (MAJOR_SCALE_SEMITONES[degreeIndex] ?? 0) +
        chord.accidentalOffset) %
        12) +
        12) %
      12;

    return rootLetter + accidentalString(targetPitchClass - naturalPitchClass);
  }

  /** Builds the quality + extension suffix (everything after the root). */
  private qualitySuffix(chord: Chord): string {
    const base = this.baseQualitySuffix(chord.quality);
    return base + this.extensionSuffix(chord.extensions);
  }

  private baseQualitySuffix(quality: ChordQuality): string {
    switch (quality) {
      case ChordQuality.Major:
        return "";
      case ChordQuality.Minor:
        return this.symbols.minor;
      case ChordQuality.Diminished:
        return this.symbols.diminished;
      case ChordQuality.Augmented:
        return this.symbols.augmented;
      case ChordQuality.DominantSeventh:
        return this.symbols.dominantSeventh;
      case ChordQuality.HalfDiminished:
        return this.symbols.halfDiminished;
      default:
        return "";
    }
  }

  /** Best-effort suffix for colour extensions (MVP chords have none). */
  private extensionSuffix(extensions: readonly ChordExtension[]): string {
    return extensions.map((e) => EXTENSION_SUFFIX[e] ?? "").join("");
  }
}

/** Compact suffixes for colour extensions beyond the base quality. */
const EXTENSION_SUFFIX: Readonly<Record<ChordExtension, string>> = {
  [ChordExtension.MajorSeventh]: "maj7",
  [ChordExtension.MinorSeventh]: "7",
  [ChordExtension.DominantSeventh]: "7",
  [ChordExtension.Ninth]: "9",
  [ChordExtension.FlatNinth]: "b9",
  [ChordExtension.SharpNinth]: "#9",
  [ChordExtension.Eleventh]: "11",
  [ChordExtension.SharpEleventh]: "#11",
  [ChordExtension.Thirteenth]: "13",
  [ChordExtension.AddNine]: "add9",
  [ChordExtension.SuspendedSecond]: "sus2",
  [ChordExtension.SuspendedFourth]: "sus4",
};

/**
 * Converts a signed accidental count to sharps/flats, choosing the spelling
 * with the fewest accidentals (e.g. +11 semitones reads as one flat down).
 */
function accidentalString(rawDiff: number): string {
  let diff = ((rawDiff % 12) + 12) % 12; // 0–11
  if (diff > 6) diff -= 12; // collapse to [-5, 6]
  if (diff > 0) return "#".repeat(diff);
  if (diff < 0) return "b".repeat(-diff);
  return "";
}

// ---------------------------------------------------------------------------
// Default resolver
// ---------------------------------------------------------------------------

let cachedMvpResolver: ChordResolver | undefined;

/**
 * A resolver backed by the MVP major-key catalog — lets callers render
 * progressions of standard Roman numerals without wiring up a topology.
 */
export function defaultMvpResolver(): ChordResolver {
  if (cachedMvpResolver === undefined) {
    const byId = new Map<ChordId, Chord>(ChordCatalog.majorKeyMvp().map((c) => [c.id, c]));
    cachedMvpResolver = {
      getChord(id: ChordId): Chord {
        const chord = byId.get(id);
        if (chord === undefined) {
          throw new Error(`ConcreteChordRenderer: unknown chord id "${id}"`);
        }
        return chord;
      },
    };
  }
  return cachedMvpResolver;
}
