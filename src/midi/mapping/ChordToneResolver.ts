import type { Chord } from "../../core/model/Chord.js";
import { ChordQuality, ChordExtension } from "../../core/model/Chord.js";
import type { MusicalKey } from "../../core/model/MusicalState.js";
import { toPitchClass, type PitchClass } from "./PitchClass.js";
import { KeySignatureMapper } from "./KeySignatureMapper.js";

/** Semitone intervals from the root for each chord quality. */
const QUALITY_INTERVALS: Record<ChordQuality, readonly number[]> = {
  [ChordQuality.Major]: [0, 4, 7],
  [ChordQuality.Minor]: [0, 3, 7],
  [ChordQuality.Diminished]: [0, 3, 6],
  [ChordQuality.Augmented]: [0, 4, 8],
  [ChordQuality.DominantSeventh]: [0, 4, 7, 10],
  [ChordQuality.HalfDiminished]: [0, 3, 6, 10],
};

/** Semitone offsets for colour extensions. */
const EXTENSION_INTERVALS: Record<ChordExtension, number> = {
  [ChordExtension.MajorSeventh]: 11,
  [ChordExtension.MinorSeventh]: 10,
  [ChordExtension.DominantSeventh]: 10,
  [ChordExtension.Ninth]: 14,
  [ChordExtension.FlatNinth]: 13,
  [ChordExtension.SharpNinth]: 15,
  [ChordExtension.Eleventh]: 17,
  [ChordExtension.SharpEleventh]: 18,
  [ChordExtension.Thirteenth]: 21,
  [ChordExtension.AddNine]: 14,
  [ChordExtension.SuspendedSecond]: 2,
  [ChordExtension.SuspendedFourth]: 5,
};

export interface ChordToneResolverInput {
  readonly chord: Chord;
  readonly key: MusicalKey;
}

/**
 * Resolves a Roman-numeral chord in a given key to an ordered list of
 * pitch classes representing its chord tones, root first.
 *
 * Pure and stateless.
 */
export class ChordToneResolver {
  /**
   * Returns pitch classes for every chord tone (root first, then stacked
   * quality intervals, then any colour extensions).
   */
  static resolve({ chord, key }: ChordToneResolverInput): readonly PitchClass[] {
    const rootPc = KeySignatureMapper.pitchClassFor(key, chord.scaleDegree, chord.accidentalOffset);
    const baseIntervals = QUALITY_INTERVALS[chord.quality] ?? [0, 4, 7];

    const tones: PitchClass[] = baseIntervals.map((interval) => toPitchClass(rootPc + interval));

    for (const ext of chord.extensions) {
      const interval = EXTENSION_INTERVALS[ext];
      if (interval !== undefined) {
        tones.push(toPitchClass(rootPc + interval));
      }
    }

    return tones;
  }
}
