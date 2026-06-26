import type { Chord } from "../model/Chord.js";
import { ChordQuality } from "../model/Chord.js";
import type { HarmonicEdge } from "../model/HarmonicEdge.js";
import type { CadenceState } from "../model/CadenceState.js";
import { CadenceType } from "../model/CadenceState.js";
import { HarmonicFunction, FunctionalMotion } from "../model/HarmonicFunction.js";

// ---------------------------------------------------------------------------
// Internal cadence detection
// ---------------------------------------------------------------------------

/**
 * Inspects a single chord transition and returns the CadenceType it completes,
 * or undefined if no cadence is formed.
 *
 * Detection priority (most specific first):
 *   1. Perfect authentic   — V7 -> I via DominantToTonic
 *   2. Authentic           — any dominant -> I via DominantToTonic
 *   3. Deceptive           — FunctionalMotion.Deceptive edge
 *   4. Modal               — FunctionalMotion.ModalReturn edge
 *   5. Plagal              — predominant -> I via Retrogression
 *   6. Half                — landing on Dominant at phrase ending position
 */
function detectCompletedCadence(
  fromChord: Chord,
  toChord: Chord,
  edge: HarmonicEdge,
  newPhrasePosition: number,
  phraseLength: number,
): CadenceType | undefined {
  const { functionalMotion } = edge;

  if (functionalMotion === FunctionalMotion.DominantToTonic) {
    if (
      fromChord.quality === ChordQuality.DominantSeventh &&
      toChord.scaleDegree === 1 &&
      toChord.accidentalOffset === 0
    ) {
      return CadenceType.PerfectAuthentic;
    }
    if (
      fromChord.harmonicFunction === HarmonicFunction.Dominant &&
      toChord.scaleDegree === 1 &&
      toChord.accidentalOffset === 0
    ) {
      return CadenceType.Authentic;
    }
  }

  if (functionalMotion === FunctionalMotion.Deceptive) {
    return CadenceType.Deceptive;
  }

  if (functionalMotion === FunctionalMotion.ModalReturn) {
    return CadenceType.Modal;
  }

  if (
    functionalMotion === FunctionalMotion.Retrogression &&
    fromChord.harmonicFunction === HarmonicFunction.Predominant &&
    toChord.scaleDegree === 1 &&
    toChord.accidentalOffset === 0
  ) {
    return CadenceType.Plagal;
  }

  // Half cadence: phrase closes on a dominant-function chord.
  if (
    toChord.harmonicFunction === HarmonicFunction.Dominant &&
    newPhrasePosition === phraseLength - 1
  ) {
    return CadenceType.Half;
  }

  return undefined;
}

// ---------------------------------------------------------------------------
// Public class
// ---------------------------------------------------------------------------

/**
 * Determines the cadential status of a chord transition and produces an
 * updated CadenceState.
 *
 * CadenceClassifier is pure — it never mutates arguments.
 */
export class CadenceClassifier {
  classify(
    fromChord: Chord,
    toChord: Chord,
    edge: HarmonicEdge,
    newPhrasePosition: number,
    phraseLength: number,
    previousCadenceState: CadenceState,
  ): CadenceState {
    return CadenceClassifier.classify(
      fromChord,
      toChord,
      edge,
      newPhrasePosition,
      phraseLength,
      previousCadenceState,
    );
  }

  static classify(
    fromChord: Chord,
    toChord: Chord,
    edge: HarmonicEdge,
    newPhrasePosition: number,
    phraseLength: number,
    previousCadenceState: CadenceState,
  ): CadenceState {
    const completedCadence = detectCompletedCadence(
      fromChord,
      toChord,
      edge,
      newPhrasePosition,
      phraseLength,
    );

    // isApproachingCadence: the chord we just landed on is dominant-function,
    // so the NEXT move could resolve into a cadence.
    const isApproachingCadence = toChord.harmonicFunction === HarmonicFunction.Dominant;

    const expectedCadenceType = isApproachingCadence
      ? toChord.quality === ChordQuality.DominantSeventh
        ? CadenceType.PerfectAuthentic
        : CadenceType.Authentic
      : undefined;

    // Advance the step counter; reset if a cadence just completed.
    const stepsSinceLastCadence =
      completedCadence !== undefined
        ? 0
        : previousCadenceState.stepsSinceLastCadence !== undefined
          ? previousCadenceState.stepsSinceLastCadence + 1
          : undefined;

    const resolvedCadenceType = completedCadence ?? previousCadenceState.lastCadenceType;
    const resolvedCadenceToChord =
      completedCadence !== undefined ? toChord.id : previousCadenceState.lastCadenceToChord;

    return {
      isApproachingCadence,
      ...(resolvedCadenceType !== undefined && {
        lastCadenceType: resolvedCadenceType,
      }),
      ...(resolvedCadenceToChord !== undefined && {
        lastCadenceToChord: resolvedCadenceToChord,
      }),
      ...(stepsSinceLastCadence !== undefined && { stepsSinceLastCadence }),
      ...(isApproachingCadence && expectedCadenceType !== undefined && { expectedCadenceType }),
    };
  }

  static readonly default = new CadenceClassifier();
}
