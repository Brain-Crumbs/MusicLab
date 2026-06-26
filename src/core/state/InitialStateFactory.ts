import type { GenerateRequest, GeneratorConfig } from "../model/GenerationConfig.js";
import type { MusicalState } from "../model/MusicalState.js";
import type { HarmonicTopology } from "../model/HarmonicTopology.js";
import { HarmonicFunction } from "../model/HarmonicFunction.js";
import { initialCadenceState } from "../model/CadenceState.js";
import { TensionEstimator } from "./TensionEstimator.js";
import { HarmonicRegionTracker } from "./HarmonicRegionTracker.js";

/**
 * Phrase position of the initial (seed) chord.
 *
 * The seed is a pre-phrase anchor, not an emitted step, so it sits one position
 * *before* the phrase starts. The first generated chord therefore lands on
 * position 0 and the emitted tension curve aligns with the template from index 0.
 */
const PRE_PHRASE_POSITION = -1;

/**
 * Constructs the MusicalState that seeds the very first generation step.
 *
 * The initial state is fully populated — all counters, tension, cadence, and
 * budget fields are set so that the first factor evaluation runs without any
 * undefined or zero-fallback values.
 *
 * The topology is required so that the initial chord's harmonic function can
 * be resolved without embedding chord-theory knowledge here.
 */
export class InitialStateFactory {
  static create(
    request: GenerateRequest,
    config: GeneratorConfig,
    topology: HarmonicTopology,
  ): MusicalState {
    const { initialChord } = request;
    const { phraseTemplate, key, mode, surpriseConfig, recentChordsWindow } = config;

    const chord = topology.getChord(initialChord);
    const harmonicRegion = HarmonicRegionTracker.classify(chord);

    // The initial chord is a pre-phrase anchor: it seeds the run but is not
    // itself an emitted step. Seating it at phrase position -1 means the first
    // *generated* chord lands on position 0, so the emitted tension curve lines
    // up with the template from index 0 (rather than being shifted by one). Both
    // StateTransitioner and buildFactorContext advance the position by +1, so
    // (-1 + 1) = 0 for the first step.
    const phrasePosition = PRE_PHRASE_POSITION;

    // Tension of the anchor comes purely from the chord's static identity
    // because there is no prior chord or incoming edge.
    const initialTension = TensionEstimator.estimate(chord, null, 0);
    // The anchor's own target is undefined (it predates the phrase); fall back to
    // the curve's opening value, which is also the target the first move aims at.
    const targetTension = phraseTemplate.tensionCurve[0] ?? initialTension;

    // Time-since counters start at 0 when the initial chord matches the
    // function, or 1 to indicate "it has been 1 step since we last saw that
    // function" (which is the minimum sensible value).
    const timeSinceTonic = chord.harmonicFunction === HarmonicFunction.Tonic ? 0 : 1;
    const timeSinceDominant = chord.harmonicFunction === HarmonicFunction.Dominant ? 0 : 1;
    const timeSinceSubdominant = chord.harmonicFunction === HarmonicFunction.Predominant ? 0 : 1;

    const recentChords = [initialChord].slice(0, recentChordsWindow);

    return {
      key,
      mode,
      currentChord: initialChord,
      // No previousChord at the very start.
      recentChords,
      measureIndex: 0,
      phraseLength: phraseTemplate.phraseLength,
      phrasePosition,
      currentTension: initialTension,
      targetTension,
      tensionVelocity: 0,
      harmonicRegion,
      cadenceState: initialCadenceState(),
      timeSinceTonic,
      timeSinceDominant,
      timeSinceSubdominant,
      // No prior motion at the start.
      repetitionCounts: { [initialChord]: 1 } as Record<string, number>,
      surpriseBudget: surpriseConfig.initialBudget,
    };
  }
}
