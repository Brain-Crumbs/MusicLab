import type { ChordId } from "./ChordId.js";
import type { FunctionalMotion } from "./HarmonicFunction.js";

/**
 * Stylistic context tags attached to edges so that StyleFactor can weight
 * transitions according to the active style profile.
 *
 * Tags are non-exclusive — an edge can carry multiple tags.
 */
export enum StyleTag {
  /** Standard four-voice common-practice motion */
  Classical = "classical",
  /** Modal folk idioms (bVII -> I, IV -> I) */
  Folk = "folk",
  /** Jazz extensions and substitutions */
  Jazz = "jazz",
  /** Dorian, Mixolydian, Lydian or other modal colour */
  Modal = "modal",
  /** Characteristic of blues or rock progressions */
  BluesRock = "blues_rock",
  /** Chromatic or non-diatonic motion */
  Chromatic = "chromatic",
  /** Strong cadential motion toward tonic */
  Cadential = "cadential",
  /** Deceptive or unexpected resolution */
  Deceptive = "deceptive",
}

/**
 * A directed edge in the harmonic topology representing a possible chord
 * transition from one chord to another.
 *
 * Edge values are static properties of the transition in the abstract
 * harmonic space — they do not change based on musical state.  Factors
 * read these values and combine them with the live MusicalState to produce
 * a score.
 */
export interface HarmonicEdge {
  /**
   * Unique identifier for the edge, conventionally "{from}->{to}",
   * e.g. "V7->I".  Used as a stable key in probability distributions.
   */
  readonly id: string;

  readonly from: ChordId;
  readonly to: ChordId;

  /**
   * Base attractiveness of the transition, independent of musical context.
   * Encodes the "grammar strength" of the motion (e.g. V7->I is very high,
   * bVII->IV is low).  Range: [0, 1].
   */
  readonly baseAffinity: number;

  /**
   * Absolute distance between the two chords on the circle of fifths.
   * 0 = same root, 1 = adjacent fifth, up to 6 (tritone).
   * Used by HarmonicGravityFactor.
   */
  readonly circleDistance: number;

  /** Directional harmonic motion type. */
  readonly functionalMotion: FunctionalMotion;

  /**
   * How much the transition changes harmonic tension.
   * Positive = tension increases (e.g. I->V7).
   * Negative = tension releases (e.g. V7->I).
   * Zero = roughly neutral.
   */
  readonly tensionDelta: number;

  /**
   * Strength of a cadential gesture on this edge.
   * 0 = no cadential significance, 1 = strong authentic cadence.
   * Used by CadenceFitFactor near phrase endings.
   */
  readonly cadenceStrength: number;

  /**
   * Cost in surprise budget units for taking this transition.
   * Common/expected moves cost 0; unusual or rare moves cost more.
   * Used by SurpriseFactor.
   */
  readonly surpriseCost: number;

  /** Stylistic contexts in which this edge is idiomatic. */
  readonly styleTags: readonly StyleTag[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Canonical edge id from two chord ids. */
export function edgeId(from: ChordId, to: ChordId): string {
  return `${from}->${to}`;
}

/** Returns true when the edge represents a strong cadential move. */
export function isCadential(edge: HarmonicEdge, threshold = 0.5): boolean {
  return edge.cadenceStrength >= threshold;
}

/** Returns true when taking this edge consumes surprise budget. */
export function isRareMove(edge: HarmonicEdge): boolean {
  return edge.surpriseCost > 0;
}
