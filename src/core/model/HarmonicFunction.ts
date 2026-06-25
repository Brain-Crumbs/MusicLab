/**
 * Broad functional role of a chord within a key, used by factors and the
 * state machine to reason about harmonic momentum and resolution.
 */
export enum HarmonicFunction {
  /** Stable home chords: I, vi (in major) */
  Tonic = "tonic",

  /** Pre-dominant chords that increase tension toward the dominant: ii, IV */
  Predominant = "predominant",

  /** High-tension chords that strongly imply resolution: V, V7, vii° */
  Dominant = "dominant",

  /**
   * Chords borrowed from parallel or relative modes that operate outside
   * standard diatonic function: bVII, iii, bVI.
   * bVII -> I is a modal return, not a dominant resolution.
   */
  Modal = "modal",

  /**
   * Chords whose function depends heavily on context and cannot be pinned
   * to one of the four primary roles (e.g. iii in certain progressions).
   */
  Mediant = "mediant",
}

/**
 * Directional motion between harmonic functions — used by edges and factors
 * to classify what kind of move a transition represents.
 */
export enum FunctionalMotion {
  TonicToSubdominant = "tonic_to_subdominant",
  TonicToDominant = "tonic_to_dominant",
  PredominantToDominant = "predominant_to_dominant",
  DominantToTonic = "dominant_to_tonic",
  /** V -> vi: avoids expected tonic resolution */
  Deceptive = "deceptive",
  /** bVII -> I, IV -> I in modal contexts */
  ModalReturn = "modal_return",
  /** Backward motion along the circle of fifths */
  Retrogression = "retrogression",
  /** Adjacent step motion (iii, vi neighbors) */
  StepwiseDescending = "stepwise_descending",
  StepwiseAscending = "stepwise_ascending",
  /** Motion whose function is ambiguous or context-dependent */
  Neutral = "neutral",
}

/**
 * Coarse classification of harmonic regions — used by HarmonicRegionTracker
 * to track where in the tonal landscape the music currently sits.
 */
export enum HarmonicRegion {
  Tonic = "tonic",
  Predominant = "predominant",
  Dominant = "dominant",
  Modal = "modal",
}

/**
 * Source mode of a chord, indicating whether it belongs to the home key or
 * has been borrowed from another mode.
 */
export enum SourceMode {
  Diatonic = "diatonic",
  /** Borrowed from the parallel minor */
  ParallelMinor = "parallel_minor",
  /** Borrowed from a modal (Dorian, Mixolydian, etc.) colour */
  Modal = "modal",
}
