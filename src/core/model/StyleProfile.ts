import { FunctionalMotion } from "./HarmonicFunction.js";
import { StyleTag } from "./HarmonicEdge.js";

/**
 * A style profile describes the musical character the generator should favour.
 *
 * StyleFactor multiplies candidate scores by the weights here, making
 * stylistically appropriate transitions more probable without hard-blocking
 * others.
 *
 * Weights are multipliers:
 *   0   = strongly discourage
 *   1   = neutral (no influence)
 *   >1  = actively prefer (e.g. 2 = twice as attractive)
 */
export interface StyleProfile {
  /** Stable identifier used in config and presets. */
  readonly id: string;

  /** Human-readable display name. */
  readonly name: string;

  /**
   * Per-StyleTag multipliers applied to edges that carry that tag.
   * Missing tags default to 1 (neutral).
   */
  readonly styleTagWeights: Partial<Record<StyleTag, number>>;

  /**
   * Per-FunctionalMotion multipliers.
   * Applied in addition to styleTagWeights.
   * Missing motion types default to 1 (neutral).
   */
  readonly motionWeights?: Partial<Record<FunctionalMotion, number>>;

  /**
   * Overall bias toward harmonic stability.
   * 0 = prefers tension and movement, 1 = prefers resolution and rest.
   * Used by TensionFitFactor and HarmonicGravityFactor as a global lean.
   */
  readonly stabilityBias?: number;
}

// ---------------------------------------------------------------------------
// Built-in style presets
// ---------------------------------------------------------------------------

/**
 * Stable folk — diatonic, cadential, avoids jazz or chromatic colour.
 * Good default for simple diatonic progressions.
 */
const folkStable: StyleProfile = {
  id: "folk_stable",
  name: "Folk — Stable",
  styleTagWeights: {
    [StyleTag.Folk]: 1.8,
    [StyleTag.Classical]: 1.2,
    [StyleTag.Cadential]: 1.5,
    [StyleTag.Modal]: 0.5,
    [StyleTag.Jazz]: 0.2,
    [StyleTag.Chromatic]: 0.1,
    [StyleTag.BluesRock]: 0.3,
  },
  motionWeights: {
    [FunctionalMotion.DominantToTonic]: 1.6,
    [FunctionalMotion.PredominantToDominant]: 1.4,
    [FunctionalMotion.ModalReturn]: 0.6,
  },
  stabilityBias: 0.7,
};

/**
 * Wandering folk — modal motion and unexpected moves are welcome.
 * Produces more adventurous, less cadence-driven progressions.
 */
const folkWandering: StyleProfile = {
  id: "folk_wandering",
  name: "Folk — Wandering",
  styleTagWeights: {
    [StyleTag.Folk]: 1.5,
    [StyleTag.Modal]: 1.4,
    [StyleTag.Cadential]: 0.7,
    [StyleTag.Deceptive]: 1.2,
    [StyleTag.Jazz]: 0.2,
    [StyleTag.Chromatic]: 0.1,
  },
  motionWeights: {
    [FunctionalMotion.ModalReturn]: 1.6,
    [FunctionalMotion.Deceptive]: 1.3,
    [FunctionalMotion.Retrogression]: 1.1,
  },
  stabilityBias: 0.35,
};

/**
 * Modal/surprising — bVII, modal interchange, and deceptive cadences are
 * strongly preferred.  Suitable for Dorian/Mixolydian-flavoured progressions.
 */
const modalSurprising: StyleProfile = {
  id: "modal_surprising",
  name: "Modal — Surprising",
  styleTagWeights: {
    [StyleTag.Modal]: 2.0,
    [StyleTag.Folk]: 1.2,
    [StyleTag.Deceptive]: 1.5,
    [StyleTag.Chromatic]: 0.8,
    [StyleTag.Classical]: 0.6,
    [StyleTag.Cadential]: 0.5,
    [StyleTag.Jazz]: 0.4,
  },
  motionWeights: {
    [FunctionalMotion.ModalReturn]: 2.0,
    [FunctionalMotion.Deceptive]: 1.6,
    [FunctionalMotion.Retrogression]: 1.3,
    [FunctionalMotion.DominantToTonic]: 0.6,
  },
  stabilityBias: 0.2,
};

/**
 * Classical cadential — strong authentic and plagal cadences, no modal colour.
 * Suitable for common-practice or hymn-style progressions.
 */
const classicalCadential: StyleProfile = {
  id: "classical_cadential",
  name: "Classical — Cadential",
  styleTagWeights: {
    [StyleTag.Classical]: 2.0,
    [StyleTag.Cadential]: 2.0,
    [StyleTag.Folk]: 0.8,
    [StyleTag.Modal]: 0.2,
    [StyleTag.BluesRock]: 0.1,
    [StyleTag.Chromatic]: 0.3,
    [StyleTag.Jazz]: 0.3,
  },
  motionWeights: {
    [FunctionalMotion.DominantToTonic]: 2.0,
    [FunctionalMotion.PredominantToDominant]: 1.8,
    [FunctionalMotion.TonicToSubdominant]: 1.4,
    [FunctionalMotion.ModalReturn]: 0.2,
  },
  stabilityBias: 0.8,
};

export const StyleProfiles = {
  folkStable,
  folkWandering,
  modalSurprising,
  classicalCadential,
} as const satisfies Record<string, StyleProfile>;

export type StyleProfileId = keyof typeof StyleProfiles;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns the weight for a given StyleTag in the profile (defaults to 1). */
export function styleTagWeight(profile: StyleProfile, tag: StyleTag): number {
  return profile.styleTagWeights[tag] ?? 1;
}

/** Returns the weight for a given FunctionalMotion in the profile (defaults to 1). */
export function motionWeight(
  profile: StyleProfile,
  motion: FunctionalMotion,
): number {
  return profile.motionWeights?.[motion] ?? 1;
}
