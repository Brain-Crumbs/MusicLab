import { chordId } from "../model/ChordId.js";
import { ChordQuality } from "../model/Chord.js";
import { HarmonicFunction, SourceMode } from "../model/HarmonicFunction.js";
import type { Chord } from "../model/Chord.js";

/**
 * Registry of pre-defined chord definitions for use by topology builders.
 *
 * Chords are expressed in key-relative Roman numeral form and carry no
 * concrete pitch information — renderers handle transposition to a specific
 * key later.
 */
export class ChordCatalog {
  /**
   * The nine chords that make up the MVP major-key harmonic graph.
   *
   * Includes the seven diatonic chords (I through vii°) plus the
   * modal-interchange bVII, which is essential for folk/rock idioms.
   */
  static majorKeyMvp(): readonly Chord[] {
    return [
      {
        id: chordId("I"),
        scaleDegree: 1,
        accidentalOffset: 0,
        quality: ChordQuality.Major,
        extensions: [],
        harmonicFunction: HarmonicFunction.Tonic,
        sourceMode: SourceMode.Diatonic,
      },
      {
        id: chordId("ii"),
        scaleDegree: 2,
        accidentalOffset: 0,
        quality: ChordQuality.Minor,
        extensions: [],
        harmonicFunction: HarmonicFunction.Predominant,
        sourceMode: SourceMode.Diatonic,
      },
      {
        id: chordId("iii"),
        scaleDegree: 3,
        accidentalOffset: 0,
        quality: ChordQuality.Minor,
        extensions: [],
        harmonicFunction: HarmonicFunction.Mediant,
        sourceMode: SourceMode.Diatonic,
      },
      {
        id: chordId("IV"),
        scaleDegree: 4,
        accidentalOffset: 0,
        quality: ChordQuality.Major,
        extensions: [],
        harmonicFunction: HarmonicFunction.Predominant,
        sourceMode: SourceMode.Diatonic,
      },
      {
        id: chordId("V"),
        scaleDegree: 5,
        accidentalOffset: 0,
        quality: ChordQuality.Major,
        extensions: [],
        harmonicFunction: HarmonicFunction.Dominant,
        sourceMode: SourceMode.Diatonic,
      },
      {
        id: chordId("V7"),
        scaleDegree: 5,
        accidentalOffset: 0,
        quality: ChordQuality.DominantSeventh,
        extensions: [],
        harmonicFunction: HarmonicFunction.Dominant,
        sourceMode: SourceMode.Diatonic,
      },
      {
        id: chordId("vi"),
        scaleDegree: 6,
        accidentalOffset: 0,
        quality: ChordQuality.Minor,
        extensions: [],
        harmonicFunction: HarmonicFunction.Tonic,
        sourceMode: SourceMode.Diatonic,
      },
      {
        id: chordId("vii°"),
        scaleDegree: 7,
        accidentalOffset: 0,
        quality: ChordQuality.Diminished,
        extensions: [],
        harmonicFunction: HarmonicFunction.Dominant,
        sourceMode: SourceMode.Diatonic,
      },
      {
        id: chordId("bVII"),
        scaleDegree: 7,
        accidentalOffset: -1,
        quality: ChordQuality.Major,
        extensions: [],
        harmonicFunction: HarmonicFunction.Modal,
        sourceMode: SourceMode.Modal,
      },
    ] as const;
  }
}
