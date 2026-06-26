import type { FactorId } from "../model/GenerationConfig.js";
import type { FactorContext } from "./FactorContext.js";
import { BaseFactor, type RawFactorResult } from "./FactorEngine.js";
import { TensionEstimator } from "../state/TensionEstimator.js";

/**
 * TensionFitFactor — rewards candidates whose resulting tension matches the
 * tension the phrase wants at the position the candidate lands on.
 *
 * The phrase engine supplies a *target* tension for every position
 * (FactorContext.phrase.targetTension).  This factor predicts the *actual*
 * tension the candidate chord would produce — using the same TensionEstimator
 * the StateTransitioner uses, so the estimate is consistent with the state the
 * engine will later record — and scores by how close the two are.
 *
 * The match is symmetric around the target:
 *   error = |predictedTension - targetTension|   (in [0, 1])
 *   raw   = 1.5 * (1 - 2 * error)                 (in [-1.5, 1.5])
 * A perfect match scores +1.5; landing half the tension scale away scores 0;
 * the opposite extreme scores -1.5.
 *
 * This is what lets the engine choose V7 over I when the phrase wants high
 * tension, and I over V7 when it wants release — without any hard rule.
 */
export class TensionFitFactor extends BaseFactor {
  readonly id: FactorId = "tensionFit";

  protected computeRaw(context: FactorContext): RawFactorResult {
    const { toChord, edge, state, phrase } = context;

    const predictedTension = TensionEstimator.estimate(toChord, edge, state.currentTension);

    const target = phrase.targetTension;
    const error = Math.abs(predictedTension - target);
    const raw = 1.5 * (1 - 2 * error);

    return {
      raw,
      explanation:
        `predicted ${predictedTension.toFixed(2)} vs target ${target.toFixed(2)} ` +
        `(err ${error.toFixed(2)}) → ${raw.toFixed(2)}`,
    };
  }
}
