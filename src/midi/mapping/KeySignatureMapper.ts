import { KEY_PITCH_CLASS, MAJOR_SCALE_SEMITONES } from "../../core/model/PitchClasses.js";
import type { MusicalKey } from "../../core/model/MusicalState.js";
import { toPitchClass, type PitchClass } from "./PitchClass.js";

/**
 * Maps a key + scale degree (+ optional accidental offset) to the root pitch class.
 * Pure and stateless. All music-theory key resolution is centralised here so
 * that ChordToneResolver and ConcreteChordRenderer share the same tables.
 */
export class KeySignatureMapper {
  /**
   * Returns the pitch class of the chord root for the given key and degree.
   *
   * @param key            - Key signature, e.g. "C", "G", "Bb".
   * @param scaleDegree    - Diatonic scale degree (1–7).
   * @param accidentalOffset - Semitone adjustment: 0 = diatonic, -1 = flatted, +1 = sharped.
   */
  static pitchClassFor(
    key: MusicalKey,
    scaleDegree: number,
    accidentalOffset: number,
  ): PitchClass {
    const keyPc = KEY_PITCH_CLASS[key];
    const degreeOffset = MAJOR_SCALE_SEMITONES[scaleDegree - 1] ?? 0;
    return toPitchClass(keyPc + degreeOffset + accidentalOffset);
  }
}
