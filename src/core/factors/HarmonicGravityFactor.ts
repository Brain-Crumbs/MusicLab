import type { FactorId } from "../model/GenerationConfig.js";
import type { FactorContext } from "./FactorContext.js";
import { BaseFactor, clamp, type RawFactorResult } from "./FactorEngine.js";

/**
 * Maximum circle-of-fifths distance between any two MVP chords (tritone).
 * Used to normalise proximity into [0, 1].
 */
const MAX_CIRCLE_DISTANCE = 6;

/**
 * HarmonicGravityFactor — the "grammar pull" of a transition.
 *
 * This is the field's baseline attractor.  It does not know about phrase
 * position, tension targets, or history; it only encodes how strongly the
 * abstract harmonic space wants this motion to happen, independent of context.
 *
 * Two static edge properties drive it:
 *   - `baseAffinity`   — the grammar strength of the motion (V7→I is high,
 *                        a retrogression is low).  This is the dominant term.
 *   - `circleDistance` — fifths between the two roots.  Closer chords exert
 *                        more gravity, so a small distance adds a bonus.
 *
 * The active StyleProfile's `stabilityBias` applies a gentle global lean: a
 * stable style amplifies strong, well-formed motions slightly, while an
 * adventurous style flattens gravity so other factors have more say.
 *
 * Raw score range ≈ [0, 2].  V7→I (baseAffinity 1.0, short circle distance)
 * lands near the top; a weak retrogression lands near the bottom.
 */
export class HarmonicGravityFactor extends BaseFactor {
  readonly id: FactorId = "harmonicGravity";

  protected computeRaw(context: FactorContext): RawFactorResult {
    const { edge, config } = context;

    // Grammar strength is the primary attractor (weight 1.5 of the 2.0 range).
    const affinityComponent = clamp(edge.baseAffinity, 0, 1) * 1.5;

    // Proximity bonus: closer on the circle of fifths = stronger pull
    // (up to 0.5 of the range).
    const proximity = 1 - clamp(edge.circleDistance, 0, MAX_CIRCLE_DISTANCE) / MAX_CIRCLE_DISTANCE;
    const proximityComponent = proximity * 0.5;

    const base = affinityComponent + proximityComponent;

    // Global stability lean: bias 0.5 is neutral (factor 1.0); higher biases
    // amplify gravity, lower ones soften it. Mapped to [0.7, 1.3].
    const stabilityBias = config.styleProfile.stabilityBias ?? 0.5;
    const stabilityFactor = 0.7 + clamp(stabilityBias, 0, 1) * 0.6;

    const raw = base * stabilityFactor;

    return {
      raw,
      explanation:
        `affinity ${edge.baseAffinity.toFixed(2)}, ` +
        `circleDist ${edge.circleDistance} (proximity ${proximity.toFixed(2)}), ` +
        `stabilityx${stabilityFactor.toFixed(2)} → ${raw.toFixed(2)}`,
    };
  }
}
