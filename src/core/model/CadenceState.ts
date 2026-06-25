import type { ChordId } from "./ChordId.js";

/**
 * Harmonic cadence types recognised by the engine.
 * Ordered roughly by resolution strength (strongest first).
 */
export enum CadenceType {
  /** V7 -> I, both in root position — strongest resolution */
  PerfectAuthentic = "perfect_authentic",
  /** V -> I (or V7 -> I with inversion) */
  Authentic = "authentic",
  /** IV -> I */
  Plagal = "plagal",
  /** V -> vi — avoids expected tonic, continues motion */
  Deceptive = "deceptive",
  /** Phrase ends on V — tension held, not released */
  Half = "half",
  /** bVII -> I, or IV -> I in a folk/modal context */
  Modal = "modal",
  /** Phrygian: bII -> I */
  Phrygian = "phrygian",
}

/**
 * Resolution strength of each cadence type, for use by CadenceFitFactor.
 * Range [0, 1]: 1 = maximum resolution, 0 = no resolution.
 */
export const CADENCE_RESOLUTION_STRENGTH: Readonly<Record<CadenceType, number>> = {
  [CadenceType.PerfectAuthentic]: 1.0,
  [CadenceType.Authentic]: 0.85,
  [CadenceType.Plagal]: 0.6,
  [CadenceType.Modal]: 0.5,
  [CadenceType.Phrygian]: 0.45,
  [CadenceType.Deceptive]: 0.2,
  [CadenceType.Half]: 0.0,
};

/**
 * Snapshot of the cadential situation within the current musical state.
 *
 * CadenceClassifier produces a new CadenceState after every chord transition.
 * CadenceFitFactor reads this to bias candidate scoring near phrase endings.
 */
export interface CadenceState {
  /**
   * True when the previous chord is a dominant-function chord and the engine
   * is likely approaching a resolution point.
   */
  readonly isApproachingCadence: boolean;

  /**
   * The cadence type that was most recently completed (if any).
   * Undefined at the start of a phrase or before any cadence has occurred.
   */
  readonly lastCadenceType?: CadenceType;

  /**
   * The chord on which the last cadence was completed (target of the motion).
   * Undefined before any cadence.
   */
  readonly lastCadenceToChord?: ChordId;

  /**
   * How many steps ago the last cadence was completed.
   * Undefined before any cadence.
   */
  readonly stepsSinceLastCadence?: number;

  /**
   * The expected cadence type based on the current approach.
   * Set when isApproachingCadence is true; undefined otherwise.
   */
  readonly expectedCadenceType?: CadenceType;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns a fresh cadence state for the start of a phrase or generation. */
export function initialCadenceState(): CadenceState {
  return { isApproachingCadence: false };
}

/** Returns the resolution strength [0, 1] for the given cadence type. */
export function cadenceResolutionStrength(type: CadenceType): number {
  return CADENCE_RESOLUTION_STRENGTH[type];
}
