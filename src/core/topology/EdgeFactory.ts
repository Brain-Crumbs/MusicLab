import { edgeId } from "../model/HarmonicEdge.js";
import { StyleTag } from "../model/HarmonicEdge.js";
import { ChordQuality } from "../model/Chord.js";
import { HarmonicFunction, FunctionalMotion, SourceMode } from "../model/HarmonicFunction.js";
import { FunctionalMotionClassifier } from "./FunctionalMotionClassifier.js";
import type { HarmonicEdge } from "../model/HarmonicEdge.js";
import type { Chord } from "../model/Chord.js";

// ---------------------------------------------------------------------------
// Circle-of-fifths distance helpers
// ---------------------------------------------------------------------------

/** Semitone intervals for scale degrees 1-7 in a major key. */
const MAJOR_SCALE_SEMITONES = [0, 2, 4, 5, 7, 9, 11] as const;

/** Maps semitone offset (0–11) to a circle-of-fifths position (0–11, clockwise). */
const SEMITONE_TO_COF = [0, 7, 2, 9, 4, 11, 6, 1, 8, 3, 10, 5] as const;

function cofPosition(chord: Chord): number {
  const natural = MAJOR_SCALE_SEMITONES[chord.scaleDegree - 1] ?? 0;
  const semitones = (((natural + chord.accidentalOffset) % 12) + 12) % 12;
  return SEMITONE_TO_COF[semitones] ?? 0;
}

function computeCircleDistance(from: Chord, to: Chord): number {
  const diff = Math.abs(cofPosition(from) - cofPosition(to));
  return Math.min(diff, 12 - diff);
}

// ---------------------------------------------------------------------------
// Per-chord tension levels
// ---------------------------------------------------------------------------

/**
 * Static tension estimate for each MVP chord, representing how much harmonic
 * tension the chord carries independent of context.
 * Range: [0, 1], where 0 = fully stable and 1 = maximally tense.
 */
const CHORD_TENSION: Record<string, number> = {
  I: 0.1,
  vi: 0.15,
  iii: 0.25,
  bVII: 0.35,
  IV: 0.45,
  ii: 0.5,
  V: 0.7,
  "vii°": 0.85,
  V7: 0.9,
};

function getTension(chord: Chord): number {
  return CHORD_TENSION[chord.id] ?? 0.4;
}

// ---------------------------------------------------------------------------
// Derived edge property calculators
// ---------------------------------------------------------------------------

const BASE_AFFINITY_BY_MOTION: Record<FunctionalMotion, number> = {
  [FunctionalMotion.DominantToTonic]: 0.9,
  [FunctionalMotion.PredominantToDominant]: 0.8,
  [FunctionalMotion.TonicToDominant]: 0.75,
  [FunctionalMotion.TonicToSubdominant]: 0.65,
  [FunctionalMotion.ModalReturn]: 0.6,
  [FunctionalMotion.Deceptive]: 0.55,
  [FunctionalMotion.StepwiseDescending]: 0.5,
  [FunctionalMotion.Retrogression]: 0.35,
  [FunctionalMotion.StepwiseAscending]: 0.45,
  [FunctionalMotion.Neutral]: 0.4,
};

function computeBaseAffinity(motion: FunctionalMotion): number {
  return BASE_AFFINITY_BY_MOTION[motion];
}

function computeTensionDelta(from: Chord, to: Chord): number {
  return getTension(to) - getTension(from);
}

function computeCadenceStrength(from: Chord, to: Chord, motion: FunctionalMotion): number {
  switch (motion) {
    case FunctionalMotion.DominantToTonic:
      // V7->I is the strongest authentic cadence; diminished (vii°->I) is strong;
      // plain triad dominant (V->I) is in between.
      if (from.quality === ChordQuality.DominantSeventh) return 1.0;
      if (from.quality === ChordQuality.Diminished) return 0.75;
      return 0.85;

    case FunctionalMotion.Deceptive:
      return 0.4;

    case FunctionalMotion.ModalReturn:
      return 0.5;

    case FunctionalMotion.Retrogression:
      // Plagal cadence (IV->I or ii->I) has modest cadential weight.
      if (
        from.harmonicFunction === HarmonicFunction.Predominant &&
        to.harmonicFunction === HarmonicFunction.Tonic &&
        to.scaleDegree === 1
      ) {
        return 0.55;
      }
      return 0.1;

    default:
      return 0.0;
  }
}

function computeSurpriseCost(motion: FunctionalMotion): number {
  switch (motion) {
    case FunctionalMotion.DominantToTonic:
    case FunctionalMotion.PredominantToDominant:
    case FunctionalMotion.TonicToSubdominant:
    case FunctionalMotion.TonicToDominant:
      return 0;
    case FunctionalMotion.Deceptive:
    case FunctionalMotion.ModalReturn:
      return 0.1;
    case FunctionalMotion.StepwiseDescending:
    case FunctionalMotion.StepwiseAscending:
      return 0.15;
    case FunctionalMotion.Retrogression:
      return 0.25;
    case FunctionalMotion.Neutral:
    default:
      return 0.35;
  }
}

function computeStyleTags(from: Chord, to: Chord, motion: FunctionalMotion): readonly StyleTag[] {
  const tags = new Set<StyleTag>();

  if (motion === FunctionalMotion.DominantToTonic || motion === FunctionalMotion.Deceptive) {
    tags.add(StyleTag.Cadential);
    tags.add(StyleTag.Classical);
  }

  if (motion === FunctionalMotion.Retrogression && to.scaleDegree === 1) {
    // Plagal cadence (e.g. IV->I) is idiomatic in folk and classical
    tags.add(StyleTag.Cadential);
    tags.add(StyleTag.Folk);
  }

  if (
    motion === FunctionalMotion.ModalReturn ||
    from.sourceMode === SourceMode.Modal ||
    to.sourceMode === SourceMode.Modal
  ) {
    tags.add(StyleTag.Folk);
    tags.add(StyleTag.Modal);
  }

  if (motion === FunctionalMotion.Deceptive) {
    tags.add(StyleTag.Deceptive);
  }

  if (motion === FunctionalMotion.PredominantToDominant) {
    tags.add(StyleTag.Classical);
  }

  return [...tags];
}

// ---------------------------------------------------------------------------
// Public interface
// ---------------------------------------------------------------------------

/**
 * Optional overrides that callers can supply to EdgeFactory.create.
 * Any property left undefined will be computed automatically from the
 * source and target chord data.
 */
export interface EdgeOverrides {
  readonly baseAffinity?: number;
  readonly circleDistance?: number;
  readonly functionalMotion?: FunctionalMotion;
  readonly tensionDelta?: number;
  readonly cadenceStrength?: number;
  readonly surpriseCost?: number;
  readonly styleTags?: readonly StyleTag[];
}

/**
 * Constructs HarmonicEdge objects by deriving properties from the source and
 * target Chord definitions.
 *
 * All computed values are based on key-relative music theory:
 *   - circleDistance  — minimum fifths between the two chord roots
 *   - baseAffinity    — grammar strength of the motion type
 *   - tensionDelta    — static tension change (to − from)
 *   - cadenceStrength — cadential weight of the transition
 *   - surpriseCost    — surprise budget consumption
 *   - styleTags       — idiomatic style contexts
 *
 * Any property can be overridden via the third argument, which is useful when
 * the automatic derivation would be incorrect (e.g. bVII→I should always be
 * ModalReturn, not Retrogression, regardless of function classification).
 */
export class EdgeFactory {
  static create(from: Chord, to: Chord, overrides: EdgeOverrides = {}): HarmonicEdge {
    const motion = overrides.functionalMotion ?? FunctionalMotionClassifier.classify(from, to);

    return {
      id: edgeId(from.id, to.id),
      from: from.id,
      to: to.id,
      baseAffinity: overrides.baseAffinity ?? computeBaseAffinity(motion),
      circleDistance: overrides.circleDistance ?? computeCircleDistance(from, to),
      functionalMotion: motion,
      tensionDelta: overrides.tensionDelta ?? computeTensionDelta(from, to),
      cadenceStrength: overrides.cadenceStrength ?? computeCadenceStrength(from, to, motion),
      surpriseCost: overrides.surpriseCost ?? computeSurpriseCost(motion),
      styleTags: overrides.styleTags ?? computeStyleTags(from, to, motion),
    };
  }
}
