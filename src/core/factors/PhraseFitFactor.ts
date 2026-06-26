import type { FactorId } from "../model/GenerationConfig.js";
import type { FactorContext } from "./FactorContext.js";
import { BaseFactor, type RawFactorResult } from "./FactorEngine.js";
import { HarmonicFunction } from "../model/HarmonicFunction.js";
import { PhraseZone } from "../model/PhraseTemplate.js";

/**
 * Per-zone preference for each harmonic function.  Values are raw scores in
 * roughly [-1, 1]: positive = a good structural fit for that zone, negative =
 * works against the phrase shape.
 *
 * The intent of each zone:
 *   Beginning    — establish the tonal centre; tonic is ideal, dominant is poor.
 *   Middle       — build and move; predominants and modal colour are welcome,
 *                  sitting on the tonic is dull.
 *   PreCadential — set up the cadence; dominant / predominant are ideal.
 *   Ending       — resolve; tonic is ideal, leaving on a predominant is poor.
 */
const ZONE_FUNCTION_FIT: Readonly<Record<PhraseZone, Readonly<Record<HarmonicFunction, number>>>> =
  {
    [PhraseZone.Beginning]: {
      [HarmonicFunction.Tonic]: 1.0,
      [HarmonicFunction.Mediant]: 0.3,
      [HarmonicFunction.Predominant]: 0.2,
      [HarmonicFunction.Modal]: 0.0,
      [HarmonicFunction.Dominant]: -0.6,
    },
    [PhraseZone.Middle]: {
      [HarmonicFunction.Predominant]: 0.8,
      [HarmonicFunction.Modal]: 0.6,
      [HarmonicFunction.Mediant]: 0.5,
      [HarmonicFunction.Dominant]: 0.4,
      [HarmonicFunction.Tonic]: -0.2,
    },
    [PhraseZone.PreCadential]: {
      [HarmonicFunction.Dominant]: 1.0,
      [HarmonicFunction.Predominant]: 0.7,
      [HarmonicFunction.Modal]: 0.2,
      [HarmonicFunction.Mediant]: -0.1,
      [HarmonicFunction.Tonic]: -0.4,
    },
    [PhraseZone.Ending]: {
      [HarmonicFunction.Tonic]: 1.0,
      [HarmonicFunction.Modal]: 0.3,
      [HarmonicFunction.Mediant]: 0.1,
      [HarmonicFunction.Predominant]: -0.4,
      [HarmonicFunction.Dominant]: -0.3,
    },
  };

/**
 * PhraseFitFactor — aligns the candidate's harmonic *role* with where we are in
 * the phrase arc.
 *
 * Where TensionFitFactor cares about the numeric tension target, this factor
 * cares about structural function: a phrase wants to be established at the
 * start, to move in the middle, to tense up before the cadence, and to resolve
 * at the end.  It scores the candidate's harmonic function against the current
 * phrase zone using a small lookup table.
 *
 * Raw score range ≈ [-0.6, 1.0].
 */
export class PhraseFitFactor extends BaseFactor {
  readonly id: FactorId = "phraseFit";

  protected computeRaw(context: FactorContext): RawFactorResult {
    const { toChord, phrase } = context;

    const zoneTable = ZONE_FUNCTION_FIT[phrase.zone];
    const raw = zoneTable[toChord.harmonicFunction];

    return {
      raw,
      explanation: `${toChord.harmonicFunction} in ${phrase.zone} zone → ${raw.toFixed(2)}`,
    };
  }
}
