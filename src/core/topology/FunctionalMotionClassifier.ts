import { HarmonicFunction, FunctionalMotion } from "../model/HarmonicFunction.js";
import type { Chord } from "../model/Chord.js";

/**
 * Semitone intervals from the tonic for each scale degree in a major key.
 * Index 0 = degree 1 (tonic), index 6 = degree 7.
 */
const MAJOR_SCALE_SEMITONES = [0, 2, 4, 5, 7, 9, 11] as const;

function toSemitones(chord: Chord): number {
  const natural = MAJOR_SCALE_SEMITONES[chord.scaleDegree - 1] ?? 0;
  return (((natural + chord.accidentalOffset) % 12) + 12) % 12;
}

/**
 * Classifies the directional motion between two chords as a FunctionalMotion.
 *
 * Classification priority (highest to lowest):
 *   1. Deceptive resolution  — dominant moves to tonic-substitute (vi)
 *   2. Modal return          — modal chord resolves to tonic function
 *   3. Standard function pairs (T→PD, T→D, PD→D, D→T)
 *   4. Retrogression         — backward motion against functional gravity
 *   5. Stepwise motion       — adjacent semitone roots
 *   6. Neutral               — everything else
 */
export class FunctionalMotionClassifier {
  static classify(from: Chord, to: Chord): FunctionalMotion {
    const ff = from.harmonicFunction;
    const tf = to.harmonicFunction;

    // 1. Deceptive: dominant resolves to tonic-function chord that is NOT the
    //    primary tonic (scaleDegree 1). The most common case is V→vi.
    if (ff === HarmonicFunction.Dominant && tf === HarmonicFunction.Tonic && to.scaleDegree !== 1) {
      return FunctionalMotion.Deceptive;
    }

    // 2. Modal return: a modal-function chord (e.g. bVII) moves to tonic.
    if (ff === HarmonicFunction.Modal && tf === HarmonicFunction.Tonic) {
      return FunctionalMotion.ModalReturn;
    }

    // 3. Standard function pairs.
    if (ff === HarmonicFunction.Tonic && tf === HarmonicFunction.Predominant) {
      return FunctionalMotion.TonicToSubdominant;
    }
    if (ff === HarmonicFunction.Tonic && tf === HarmonicFunction.Dominant) {
      return FunctionalMotion.TonicToDominant;
    }
    if (ff === HarmonicFunction.Predominant && tf === HarmonicFunction.Dominant) {
      return FunctionalMotion.PredominantToDominant;
    }
    if (ff === HarmonicFunction.Dominant && tf === HarmonicFunction.Tonic) {
      return FunctionalMotion.DominantToTonic;
    }

    // 4. Retrogression: moving against the standard T→PD→D→T ordering.
    if (
      (ff === HarmonicFunction.Dominant && tf === HarmonicFunction.Predominant) ||
      (ff === HarmonicFunction.Predominant && tf === HarmonicFunction.Tonic)
    ) {
      return FunctionalMotion.Retrogression;
    }

    // 5. Stepwise motion: roots separated by at most a whole step (2 semitones).
    const semiDiff = toSemitones(to) - toSemitones(from);
    // Normalise to [-6, 6] for directional comparison
    const normDiff = semiDiff > 6 ? semiDiff - 12 : semiDiff < -6 ? semiDiff + 12 : semiDiff;

    if (normDiff === -1 || normDiff === -2) {
      return FunctionalMotion.StepwiseDescending;
    }
    if (normDiff === 1 || normDiff === 2) {
      return FunctionalMotion.StepwiseAscending;
    }

    return FunctionalMotion.Neutral;
  }
}
