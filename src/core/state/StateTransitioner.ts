import type { MusicalState } from "../model/MusicalState.js";
import { CircleDirection } from "../model/MusicalState.js";
import type { HarmonicEdge } from "../model/HarmonicEdge.js";
import { HarmonicFunction, FunctionalMotion } from "../model/HarmonicFunction.js";
import type { GeneratorConfig } from "../model/GenerationConfig.js";
import type { HarmonicTopology } from "../model/HarmonicTopology.js";
import type { ChordId } from "../model/ChordId.js";
import { CadenceClassifier } from "./CadenceClassifier.js";
import { TensionEstimator } from "./TensionEstimator.js";
import { SurpriseBudgetUpdater } from "./SurpriseBudgetUpdater.js";
import { RepetitionTracker } from "./RepetitionTracker.js";
import { HarmonicRegionTracker } from "./HarmonicRegionTracker.js";
import type { PhraseEngine } from "../phrase/PhraseEngine.js";

// ---------------------------------------------------------------------------
// Circle-of-fifths direction helper
// ---------------------------------------------------------------------------

/**
 * Approximates the circle-of-fifths direction of a transition using the
 * edge's functional motion type.
 *
 * "Sharpward" = toward the dominant side (more tension).
 * "Flatward"  = toward the subdominant / tonic side (less tension).
 * Returns undefined for ambiguous motions (Neutral, Deceptive).
 */
function circleDirectionFromMotion(motion: FunctionalMotion): CircleDirection | undefined {
  switch (motion) {
    case FunctionalMotion.TonicToDominant:
    case FunctionalMotion.PredominantToDominant:
    case FunctionalMotion.StepwiseAscending:
    case FunctionalMotion.ModalReturn:
      return CircleDirection.Sharpward;

    case FunctionalMotion.DominantToTonic:
    case FunctionalMotion.TonicToSubdominant:
    case FunctionalMotion.Retrogression:
    case FunctionalMotion.StepwiseDescending:
      return CircleDirection.Flatward;

    case FunctionalMotion.Deceptive:
    case FunctionalMotion.Neutral:
    default:
      return undefined;
  }
}

/** Appends a chord to the history window, dropping the oldest entry. */
function updateRecentChords(
  recentChords: readonly ChordId[],
  newChord: ChordId,
  windowSize: number,
): readonly ChordId[] {
  const extended = [...recentChords, newChord];
  return extended.length > windowSize ? extended.slice(extended.length - windowSize) : extended;
}

// ---------------------------------------------------------------------------
// StateTransitioner
// ---------------------------------------------------------------------------

export interface ApplyTransitionArgs {
  readonly state: MusicalState;
  readonly selectedEdge: HarmonicEdge;
  readonly phraseEngine: PhraseEngine;
  readonly config: GeneratorConfig;
  readonly topology: HarmonicTopology;
}

/**
 * Produces the next MusicalState by applying one chord transition.
 *
 * StateTransitioner is the single point of truth for how state evolves —
 * all sub-classifiers (cadence, tension, surprise, repetition, region) are
 * invoked here and their outputs assembled into a new, immutable MusicalState.
 *
 * Constructor injection allows each classifier to be replaced in tests.
 */
export class StateTransitioner {
  constructor(
    private readonly cadenceClassifier: CadenceClassifier,
    private readonly tensionEstimator: TensionEstimator,
    private readonly surpriseBudgetUpdater: SurpriseBudgetUpdater,
  ) {}

  applyTransition(args: ApplyTransitionArgs): MusicalState {
    const { state, selectedEdge, phraseEngine, config, topology } = args;

    const fromChord = topology.getChord(state.currentChord);
    const toChord = topology.getChord(selectedEdge.to);

    // -----------------------------------------------------------------------
    // Phrase position
    // -----------------------------------------------------------------------
    const newPhrasePosition = (state.phrasePosition + 1) % state.phraseLength;
    const newMeasureIndex = state.measureIndex + 1;

    // -----------------------------------------------------------------------
    // Tension
    // -----------------------------------------------------------------------
    const newCurrentTension = this.tensionEstimator.estimate(
      toChord,
      selectedEdge,
      state.currentTension,
    );
    const newTargetTension = phraseEngine.getTargetTension(newPhrasePosition);
    const newTensionVelocity = newCurrentTension - state.currentTension;

    // -----------------------------------------------------------------------
    // Cadence
    // -----------------------------------------------------------------------
    const newCadenceState = this.cadenceClassifier.classify(
      fromChord,
      toChord,
      selectedEdge,
      newPhrasePosition,
      state.phraseLength,
      state.cadenceState,
    );

    // -----------------------------------------------------------------------
    // Harmonic region
    // -----------------------------------------------------------------------
    const newHarmonicRegion = HarmonicRegionTracker.classify(toChord);

    // -----------------------------------------------------------------------
    // Time-since counters
    // -----------------------------------------------------------------------
    const newTimeSinceTonic =
      toChord.harmonicFunction === HarmonicFunction.Tonic ? 0 : state.timeSinceTonic + 1;

    const newTimeSinceDominant =
      toChord.harmonicFunction === HarmonicFunction.Dominant ? 0 : state.timeSinceDominant + 1;

    const newTimeSinceSubdominant =
      toChord.harmonicFunction === HarmonicFunction.Predominant
        ? 0
        : state.timeSinceSubdominant + 1;

    // -----------------------------------------------------------------------
    // Circle direction
    // -----------------------------------------------------------------------
    const newCircleDirection =
      circleDirectionFromMotion(selectedEdge.functionalMotion) ?? state.recentCircleDirection;

    // -----------------------------------------------------------------------
    // Repetition counts
    // -----------------------------------------------------------------------
    const newRepetitionCounts = RepetitionTracker.update(state.repetitionCounts, selectedEdge.to);

    // -----------------------------------------------------------------------
    // Surprise budget
    // -----------------------------------------------------------------------
    const newSurpriseBudget = this.surpriseBudgetUpdater.update(
      state.surpriseBudget,
      selectedEdge,
      config.surpriseConfig,
    );

    // -----------------------------------------------------------------------
    // Recent chords history
    // -----------------------------------------------------------------------
    const newRecentChords = updateRecentChords(
      state.recentChords,
      selectedEdge.to,
      config.recentChordsWindow,
    );

    // -----------------------------------------------------------------------
    // Assemble next state (exactOptionalPropertyTypes: omit undefined optionals)
    // -----------------------------------------------------------------------
    const nextState: MusicalState = {
      key: state.key,
      mode: state.mode,
      currentChord: selectedEdge.to,
      previousChord: state.currentChord,
      recentChords: newRecentChords,
      measureIndex: newMeasureIndex,
      phraseLength: state.phraseLength,
      phrasePosition: newPhrasePosition,
      currentTension: newCurrentTension,
      targetTension: newTargetTension,
      tensionVelocity: newTensionVelocity,
      harmonicRegion: newHarmonicRegion,
      cadenceState: newCadenceState,
      timeSinceTonic: newTimeSinceTonic,
      timeSinceDominant: newTimeSinceDominant,
      timeSinceSubdominant: newTimeSinceSubdominant,
      ...(newCircleDirection !== undefined && {
        recentCircleDirection: newCircleDirection,
      }),
      repetitionCounts: newRepetitionCounts,
      surpriseBudget: newSurpriseBudget,
    };

    return nextState;
  }

  /** Factory for the default production instance. */
  static createDefault(): StateTransitioner {
    return new StateTransitioner(
      CadenceClassifier.default,
      TensionEstimator.default,
      SurpriseBudgetUpdater.default,
    );
  }
}
