import { HarmonicFunction } from "./HarmonicFunction.js";

/**
 * Zone within a phrase — used by PhrasePositionClassifier and PhraseFitFactor
 * to understand where the music currently sits in the arc.
 */
export enum PhraseZone {
  /** First ~25% of the phrase — establish tonal centre */
  Beginning = "beginning",
  /** Middle of the phrase — build tension */
  Middle = "middle",
  /** One or two steps before the phrase end — set up cadence */
  PreCadential = "pre_cadential",
  /** Final step — resolve or conclude */
  Ending = "ending",
}

/**
 * A phrase template describes the desired tension arc over the course of a
 * phrase.  The generator uses this to bias chord choices so the progression
 * follows a musically intentional shape rather than wandering.
 *
 * tensionCurve length must equal phraseLength.
 * Each value is a target tension in [0, 1]:  0 = fully relaxed, 1 = maximum
 * tension.
 */
export interface PhraseTemplate {
  readonly phraseLength: number;
  /** Target tension at each step position (index 0 = first chord). */
  readonly tensionCurve: readonly number[];
  /** Human-readable label for debugging and preset selection. */
  readonly name?: string;
  /**
   * Optional harmonic function the phrase should *land on* at its final
   * position.  A tension level alone (via {@link tensionCurve}) is necessary
   * but not sufficient to pin the ending to a specific harmonic function:
   * several chords can share a tension level.  Setting this biases the final
   * step toward an intended cadence type — e.g. `Dominant` for a half cadence
   * that should rest on V, or `Tonic` for an authentic/full close.
   *
   * Consumed by CadenceFitFactor, which rewards the final chord when its
   * function matches and discourages endings on other functions.
   */
  readonly desiredFinalFunction?: HarmonicFunction;
}

// ---------------------------------------------------------------------------
// Built-in phrase templates
// ---------------------------------------------------------------------------

/**
 * A compact four-bar shape:
 *   begin relaxed → build → peak → resolve.
 * Good default for folk, pop, and simple classical phrases.
 */
const fourBarResolutionPump: PhraseTemplate = {
  name: "fourBarResolutionPump",
  phraseLength: 4,
  tensionCurve: [0.2, 0.5, 0.85, 0.1],
};

/**
 * An eight-bar arc with a gradual build, a plateau, and a strong resolution.
 * Suitable for longer phrases in folk or classical contexts.
 */
const eightBarLongArc: PhraseTemplate = {
  name: "eightBarLongArc",
  phraseLength: 8,
  tensionCurve: [0.2, 0.3, 0.5, 0.7, 0.6, 0.85, 0.95, 0.15],
};

/**
 * An eight-bar shape that reaches peak tension in the middle and releases
 * gently — useful for verse sections or question-answer phrase pairs.
 */
const eightBarMidPeak: PhraseTemplate = {
  name: "eightBarMidPeak",
  phraseLength: 8,
  tensionCurve: [0.15, 0.35, 0.6, 0.85, 0.75, 0.5, 0.3, 0.1],
};

/**
 * A four-bar template that stays unresolved — ends on a half cadence.
 * Pairs naturally with fourBarResolutionPump as an antecedent–consequent.
 */
const fourBarHalfCadence: PhraseTemplate = {
  name: "fourBarHalfCadence",
  phraseLength: 4,
  tensionCurve: [0.2, 0.45, 0.7, 0.6],
  // A half cadence rests *on* the dominant; the tension level alone won't pull
  // the final chord to V, so target the dominant function explicitly.
  desiredFinalFunction: HarmonicFunction.Dominant,
};

export const PhraseTemplates = {
  fourBarResolutionPump,
  eightBarLongArc,
  eightBarMidPeak,
  fourBarHalfCadence,
} as const satisfies Record<string, PhraseTemplate>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns the target tension at a given position within the phrase.
 * Clamps position to valid range.
 */
export function targetTensionAt(
  template: PhraseTemplate,
  phrasePosition: number,
): number {
  const clamped = Math.max(0, Math.min(phrasePosition, template.phraseLength - 1));
  return template.tensionCurve[clamped] ?? 0;
}

/**
 * Classifies a phrase position into a PhraseZone.
 * Pre-cadential zone covers the step immediately before the last position.
 */
export function classifyPhrasePosition(
  phrasePosition: number,
  phraseLength: number,
): PhraseZone {
  if (phrasePosition === 0) return PhraseZone.Beginning;
  if (phrasePosition >= phraseLength - 1) return PhraseZone.Ending;
  if (phrasePosition >= phraseLength - 2) return PhraseZone.PreCadential;
  if (phrasePosition <= Math.floor(phraseLength * 0.25)) return PhraseZone.Beginning;
  return PhraseZone.Middle;
}
