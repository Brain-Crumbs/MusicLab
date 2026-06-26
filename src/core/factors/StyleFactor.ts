import type { FactorId } from "../model/GenerationConfig.js";
import type { FactorContext } from "./FactorContext.js";
import { BaseFactor, clamp, type RawFactorResult } from "./FactorEngine.js";
import { styleTagWeight, motionWeight } from "../model/StyleProfile.js";

/**
 * Clamp bounds on the log-score so a chord stacked with several strong style
 * tags can't dominate the whole field, and a strongly-discouraged one can't
 * collapse it.  ln(0.05) ≈ -3.0 and ln(8) ≈ 2.08.
 */
const MIN_RAW = -3;
const MAX_RAW = 2;

/**
 * StyleFactor — biases candidates toward the active StyleProfile's taste.
 *
 * The StyleProfile expresses preferences as *multipliers* (1 = neutral, >1 =
 * prefer, <1 = discourage) over edge style tags and functional-motion types.
 * Multipliers compose multiplicatively, but factor scores compose additively
 * (they are summed before the softmax).  Taking the natural log bridges the two
 * cleanly:
 *
 *   raw = ln( Πtag styleTagWeight × motionWeight )
 *       = Σtag ln(styleTagWeight) + ln(motionWeight)
 *
 * Because softmax(Σ scores) ∝ Π(weights), a style multiplier of 2 makes the
 * candidate genuinely ~2× as attractive (before other factors), which is
 * exactly the StyleProfile's documented contract — and a neutral edge (all
 * weights 1) scores ln(1) = 0, contributing nothing.
 */
export class StyleFactor extends BaseFactor {
  readonly id: FactorId = "style";

  protected computeRaw(context: FactorContext): RawFactorResult {
    const { edge, config } = context;
    const profile = config.styleProfile;

    // Combine every style-tag multiplier on this edge with the motion multiplier.
    let combined = motionWeight(profile, edge.functionalMotion);
    for (const tag of edge.styleTags) {
      combined *= styleTagWeight(profile, tag);
    }

    // Guard against a zero/negative multiplier producing -Infinity/NaN.
    const safeCombined = combined > 0 ? combined : 1e-3;
    const raw = clamp(Math.log(safeCombined), MIN_RAW, MAX_RAW);

    return {
      raw,
      explanation: `${profile.id}: combined weight ${combined.toFixed(2)} → ln ${raw.toFixed(2)}`,
    };
  }
}
