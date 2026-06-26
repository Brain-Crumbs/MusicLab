import type { FactorId } from "../model/GenerationConfig.js";
import type { FactorContext } from "./FactorContext.js";
import { BaseFactor, clamp, type RawFactorResult } from "./FactorEngine.js";
import { FunctionalMotion } from "../model/HarmonicFunction.js";
import { PhraseZone } from "../model/PhraseTemplate.js";

/**
 * How much cadential pull each phrase zone exerts.  Cadences should "switch on"
 * as the phrase approaches its end and stay quiet earlier on, so that a strong
 * authentic cadence in the middle of a phrase isn't over-rewarded.
 */
const ZONE_CADENCE_PRESSURE: Readonly<Record<PhraseZone, number>> = {
  [PhraseZone.Beginning]: 0.0,
  [PhraseZone.Middle]: 0.15,
  [PhraseZone.PreCadential]: 0.7,
  [PhraseZone.Ending]: 1.0,
};

/** Bonus for a dominant→tonic resolution when the state is approaching a cadence. */
const APPROACH_RESOLUTION_BONUS = 0.6;

/**
 * When a phrase template names a `desiredFinalFunction`, the final step is
 * biased toward landing on that harmonic function.  A match adds a bonus; a
 * mismatch subtracts a penalty and suppresses the ordinary cadence-strength
 * reward, so a strong authentic cadence can't override an intended half cadence
 * (and vice-versa).
 */
const FINAL_FUNCTION_MATCH_BONUS = 2.6;
const FINAL_FUNCTION_MISMATCH_PENALTY = 2.2;

/**
 * Half/authentic cadences also depend on the *approach*: the pre-cadential
 * chord must be able to reach the desired final function in one move.  Several
 * dominant-area chords are "dead ends" for a half cadence — V7 and vii° only
 * resolve to a tonic — so without steering the approach the engine paints
 * itself into a tonic ending.  At the pre-cadential step we therefore reward
 * landing on a chord that *can* reach the desired final function and penalise
 * dead ends.
 */
const PRE_CADENTIAL_SETUP_BONUS = 0.6;
const PRE_CADENTIAL_DEADEND_PENALTY = 1.4;

/**
 * CadenceFitFactor — rewards cadential motion in proportion to how close the
 * phrase is to ending.
 *
 * Each edge carries a static `cadenceStrength` (V7→I = 1.0, plagal ≈ 0.55,
 * deceptive ≈ 0.4, …).  This factor scales that strength by a per-zone
 * "cadence pressure" so cadences are strongly preferred at the phrase ending,
 * mildly relevant pre-cadentially, and essentially ignored at the start.
 *
 * It also reads the live cadence state: when the current chord is dominant
 * (`isApproachingCadence`) and the candidate genuinely resolves to tonic
 * (a DominantToTonic motion), an extra bonus is added — this is the moment the
 * engine most wants to "land".
 *
 * Raw score range ≈ [0, ~2.0].  Non-cadential moves contribute ~0, which keeps
 * the factor from interfering away from phrase boundaries.
 */
export class CadenceFitFactor extends BaseFactor {
  readonly id: FactorId = "cadenceFit";

  protected computeRaw(context: FactorContext): RawFactorResult {
    const { edge, state, phrase, toChord, topology } = context;

    const pressure = ZONE_CADENCE_PRESSURE[phrase.zone];

    // Strong cadential edges scale up to ~1.4 at the phrase ending.
    let cadenceComponent = clamp(edge.cadenceStrength, 0, 1) * pressure * 1.4;

    // Resolution bonus only when we are genuinely poised to resolve.
    const resolves =
      state.cadenceState.isApproachingCadence &&
      edge.functionalMotion === FunctionalMotion.DominantToTonic;
    let approachComponent = resolves ? APPROACH_RESOLUTION_BONUS * pressure : 0;

    // Final-function targeting: at the phrase ending, steer the landing chord
    // toward the template's desired cadence function.  This is what lets a
    // half cadence rest *on* V (desiredFinalFunction = dominant) rather than
    // being pulled into an authentic resolution by raw cadence strength.
    let finalFunctionComponent = 0;
    let finalFunctionNote = "";
    if (phrase.isAtEnd && phrase.desiredFinalFunction !== undefined) {
      if (toChord.harmonicFunction === phrase.desiredFinalFunction) {
        finalFunctionComponent = FINAL_FUNCTION_MATCH_BONUS;
        finalFunctionNote = ` + final-function match (${phrase.desiredFinalFunction})`;
      } else {
        finalFunctionComponent = -FINAL_FUNCTION_MISMATCH_PENALTY;
        finalFunctionNote = ` − final-function mismatch (wanted ${phrase.desiredFinalFunction})`;
        // Don't let a strong cadence to the "wrong" function still win on
        // cadence strength / approach bonus when a specific ending is intended.
        cadenceComponent = 0;
        approachComponent = 0;
      }
    } else if (phrase.isPreCadential && phrase.desiredFinalFunction !== undefined) {
      // Set up the cadence one step early: prefer a pre-cadential chord that can
      // actually reach the desired final function, and avoid dead ends (e.g.
      // V7/vii° can only fall to a tonic, which would block a half cadence).
      const canReachDesired = topology
        .getOutgoingEdges(toChord.id)
        .some(
          (next) => topology.getChord(next.to).harmonicFunction === phrase.desiredFinalFunction,
        );
      if (canReachDesired) {
        finalFunctionComponent = PRE_CADENTIAL_SETUP_BONUS;
        finalFunctionNote = ` + sets up ${phrase.desiredFinalFunction} ending`;
      } else {
        finalFunctionComponent = -PRE_CADENTIAL_DEADEND_PENALTY;
        finalFunctionNote = ` − dead end for ${phrase.desiredFinalFunction} ending`;
      }
    }

    const raw = cadenceComponent + approachComponent + finalFunctionComponent;

    return {
      raw,
      explanation:
        `cadenceStrength ${edge.cadenceStrength.toFixed(2)} × pressure ${pressure.toFixed(2)}` +
        (resolves ? ` + approach bonus` : "") +
        finalFunctionNote +
        ` → ${raw.toFixed(2)}`,
    };
  }
}
