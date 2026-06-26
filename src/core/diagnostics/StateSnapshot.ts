import type { ChordId } from "../model/ChordId.js";
import type { HarmonicRegion } from "../model/HarmonicFunction.js";
import type { CadenceType } from "../model/CadenceState.js";
import type { MusicalState, CircleDirection } from "../model/MusicalState.js";

// ---------------------------------------------------------------------------
// D7.3 — State snapshot model
//
// A StateSnapshot is a flat, serialisable projection of the time-varying parts
// of a MusicalState, captured for diagnostics and visualisation.  It is a pure
// *view* over generation output: building one never mutates state and never
// feeds back into generation.
//
// Why a projection instead of exposing MusicalState directly?
//   - Stability: the snapshot is the diagnostics contract.  MusicalState can
//     grow internal fields without changing what visualisers depend on.
//   - Serialisability: every field here is a primitive, a string enum, or an
//     array/record of those, so a snapshot round-trips cleanly through JSON.
//   - Focus: constant per-run context (key/mode) is omitted; the trace records
//     it once on finalState rather than on every step.
// ---------------------------------------------------------------------------

/** The cadential fields worth surfacing per step, flattened from CadenceState. */
export interface CadenceSnapshot {
  readonly isApproachingCadence: boolean;
  readonly lastCadenceType?: CadenceType;
  readonly stepsSinceLastCadence?: number;
  readonly expectedCadenceType?: CadenceType;
}

/**
 * Flattened, serialisable snapshot of the diagnostically-relevant parts of a
 * {@link MusicalState}.
 *
 * Tension values are in [0, 1].  Time-since counters are step counts.
 */
export interface StateSnapshot {
  // Chord history -----------------------------------------------------------
  readonly currentChord: ChordId;
  readonly previousChord?: ChordId;
  readonly recentChords: readonly ChordId[];

  // Phrase position ---------------------------------------------------------
  readonly measureIndex: number;
  readonly phraseLength: number;
  readonly phrasePosition: number;

  // Tension -----------------------------------------------------------------
  readonly currentTension: number;
  readonly targetTension: number;
  readonly tensionVelocity: number;

  // Harmonic region and cadence --------------------------------------------
  readonly harmonicRegion: HarmonicRegion;
  readonly cadence: CadenceSnapshot;

  // Time-since counters (steps elapsed) ------------------------------------
  readonly timeSinceTonic: number;
  readonly timeSinceDominant: number;
  readonly timeSinceSubdominant: number;

  // Motion and budget -------------------------------------------------------
  readonly recentCircleDirection?: CircleDirection;
  readonly surpriseBudget: number;
}

// ---------------------------------------------------------------------------
// Builder
// ---------------------------------------------------------------------------

/**
 * Projects a {@link MusicalState} into a flat {@link StateSnapshot}.
 *
 * Optional fields are omitted (rather than set to `undefined`) when absent, so
 * the result satisfies `exactOptionalPropertyTypes` and serialises without
 * stray `null`/`undefined` keys.
 */
export function toStateSnapshot(state: MusicalState): StateSnapshot {
  const cs = state.cadenceState;
  const cadence: CadenceSnapshot = {
    isApproachingCadence: cs.isApproachingCadence,
    ...(cs.lastCadenceType !== undefined && {
      lastCadenceType: cs.lastCadenceType,
    }),
    ...(cs.stepsSinceLastCadence !== undefined && {
      stepsSinceLastCadence: cs.stepsSinceLastCadence,
    }),
    ...(cs.expectedCadenceType !== undefined && {
      expectedCadenceType: cs.expectedCadenceType,
    }),
  };

  return {
    currentChord: state.currentChord,
    ...(state.previousChord !== undefined && {
      previousChord: state.previousChord,
    }),
    recentChords: [...state.recentChords],
    measureIndex: state.measureIndex,
    phraseLength: state.phraseLength,
    phrasePosition: state.phrasePosition,
    currentTension: state.currentTension,
    targetTension: state.targetTension,
    tensionVelocity: state.tensionVelocity,
    harmonicRegion: state.harmonicRegion,
    cadence,
    timeSinceTonic: state.timeSinceTonic,
    timeSinceDominant: state.timeSinceDominant,
    timeSinceSubdominant: state.timeSinceSubdominant,
    ...(state.recentCircleDirection !== undefined && {
      recentCircleDirection: state.recentCircleDirection,
    }),
    surpriseBudget: state.surpriseBudget,
  };
}
