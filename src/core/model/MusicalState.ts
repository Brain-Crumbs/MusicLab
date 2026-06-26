import type { ChordId } from "./ChordId.js";
import { HarmonicRegion } from "./HarmonicFunction.js";
import type { CadenceState } from "./CadenceState.js";

/**
 * The twelve chromatic pitch classes used as key roots.
 * Enharmonic equivalents are kept separate so that key context is preserved
 * (G# minor ≠ Ab minor in Roman-numeral terms).
 */
export type MusicalKey =
  | "C"
  | "C#"
  | "Db"
  | "D"
  | "D#"
  | "Eb"
  | "E"
  | "F"
  | "F#"
  | "Gb"
  | "G"
  | "G#"
  | "Ab"
  | "A"
  | "A#"
  | "Bb"
  | "B";

/**
 * Scale/mode for interpreting Roman-numeral degree relationships.
 * The generator MVP targets Major; other modes are defined for future use.
 */
export enum Mode {
  Major = "major",
  Minor = "minor",
  Dorian = "dorian",
  Phrygian = "phrygian",
  Lydian = "lydian",
  Mixolydian = "mixolydian",
  Locrian = "locrian",
}

/**
 * Recent direction of motion on the circle of fifths.
 * Sharpward = toward the dominant side (C -> G -> D …).
 * Flatward  = toward the subdominant side (C -> F -> Bb …).
 */
export enum CircleDirection {
  Sharpward = "sharpward",
  Flatward = "flatward",
}

/**
 * Complete snapshot of the musical context at a single generation step.
 *
 * MusicalState is immutable.  StateTransitioner produces a new state object
 * on each step; the old one is kept in GenerationStep for tracing.
 *
 * All tension values are in [0, 1]:  0 = fully relaxed, 1 = maximum tension.
 */
export interface MusicalState {
  // -------------------------------------------------------------------------
  // Key context
  // -------------------------------------------------------------------------

  readonly key: MusicalKey;
  readonly mode: Mode;

  // -------------------------------------------------------------------------
  // Chord history
  // -------------------------------------------------------------------------

  readonly currentChord: ChordId;
  readonly previousChord?: ChordId;

  /**
   * The last N chords played, newest last.
   * Length is bounded by GeneratorConfig.recentChordsWindow.
   */
  readonly recentChords: readonly ChordId[];

  // -------------------------------------------------------------------------
  // Phrase position
  // -------------------------------------------------------------------------

  /** Absolute chord index since generation started (0-based). */
  readonly measureIndex: number;

  /** Total length of the current phrase in steps. */
  readonly phraseLength: number;

  /** Position within the current phrase (0-based, resets at phrase boundary). */
  readonly phrasePosition: number;

  // -------------------------------------------------------------------------
  // Tension
  // -------------------------------------------------------------------------

  /** Estimated actual tension produced by the current chord in context. */
  readonly currentTension: number;

  /** Desired tension at this phrase position (from PhraseTemplate). */
  readonly targetTension: number;

  /**
   * Rate of tension change per step (currentTension - previousTension).
   * Positive = tension is rising; negative = falling.
   */
  readonly tensionVelocity: number;

  // -------------------------------------------------------------------------
  // Harmonic region and cadence
  // -------------------------------------------------------------------------

  /** Coarse region describing where we are in harmonic space. */
  readonly harmonicRegion: HarmonicRegion;

  /** Cadential context — populated by CadenceClassifier after each step. */
  readonly cadenceState: CadenceState;

  // -------------------------------------------------------------------------
  // Time-since counters (steps elapsed)
  // -------------------------------------------------------------------------

  /** Steps since a tonic-function chord was played. */
  readonly timeSinceTonic: number;

  /** Steps since a dominant-function chord was played. */
  readonly timeSinceDominant: number;

  /** Steps since a predominant-function chord was played. */
  readonly timeSinceSubdominant: number;

  // -------------------------------------------------------------------------
  // Motion tracking
  // -------------------------------------------------------------------------

  /**
   * The direction of the most recent move on the circle of fifths.
   * Undefined at the very first step.
   */
  readonly recentCircleDirection?: CircleDirection;

  /**
   * How many times each chord has been played in the current generation.
   * Used by RepetitionTracker and NoveltyFactor.
   */
  readonly repetitionCounts: Readonly<Record<ChordId, number>>;

  // -------------------------------------------------------------------------
  // Surprise budget
  // -------------------------------------------------------------------------

  /**
   * Remaining budget for rare/unexpected chord moves.
   * Depleted by rare moves; replenished on stable tonic landings.
   * SurpriseFactor reads this to penalise or block moves when budget is low.
   */
  readonly surpriseBudget: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns the repetition count for a chord (0 if never played). */
export function repetitionCount(state: MusicalState, chord: ChordId): number {
  return state.repetitionCounts[chord] ?? 0;
}

/** True when the phrase is on its final step. */
export function isAtPhraseEnd(state: MusicalState): boolean {
  return state.phrasePosition >= state.phraseLength - 1;
}

/** True when the phrase is on its penultimate step (pre-cadential). */
export function isPreCadential(state: MusicalState): boolean {
  return state.phrasePosition === state.phraseLength - 2;
}
