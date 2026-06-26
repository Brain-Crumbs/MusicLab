import type { Chord } from "../model/Chord.js";
import type { HarmonicEdge } from "../model/HarmonicEdge.js";
import { HarmonicFunction } from "../model/HarmonicFunction.js";

/**
 * Static tension values for each MVP chord.
 * Matches the CHORD_TENSION table used in EdgeFactory so that tension
 * estimates are internally consistent.
 * Range: [0, 1] — 0 = fully relaxed, 1 = maximum tension.
 */
const CHORD_STATIC_TENSION: Readonly<Record<string, number>> = {
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

/** Fallback base tension when a chord id is not in the static table. */
function baseTensionFromFunction(harmonicFunction: HarmonicFunction): number {
  switch (harmonicFunction) {
    case HarmonicFunction.Tonic:
      return 0.15;
    case HarmonicFunction.Mediant:
      return 0.25;
    case HarmonicFunction.Modal:
      return 0.35;
    case HarmonicFunction.Predominant:
      return 0.45;
    case HarmonicFunction.Dominant:
      return 0.75;
  }
}

/**
 * Estimates the actual harmonic tension produced by a chord in context.
 *
 * The estimate blends two signals:
 *   70% — the chord's static tension (determined by its identity and function)
 *   30% — a delta-adjusted value derived from the incoming edge and previous tension
 *
 * This weighting keeps the estimate tethered to the chord's intrinsic tension
 * while allowing the direction of motion to provide a small contextual nudge.
 *
 * When no incoming edge is available (e.g. for the initial chord), only the
 * static tension is returned.
 *
 * All return values are clamped to [0, 1].
 */
export class TensionEstimator {
  estimate(chord: Chord, incomingEdge: HarmonicEdge | null, previousTension: number): number {
    return TensionEstimator.estimate(chord, incomingEdge, previousTension);
  }

  static estimate(
    chord: Chord,
    incomingEdge: HarmonicEdge | null,
    previousTension: number,
  ): number {
    const staticTension =
      CHORD_STATIC_TENSION[chord.id] ?? baseTensionFromFunction(chord.harmonicFunction);

    if (incomingEdge === null) {
      return staticTension;
    }

    const deltaBased = Math.max(0, Math.min(1, previousTension + incomingEdge.tensionDelta));

    return Math.max(0, Math.min(1, staticTension * 0.7 + deltaBased * 0.3));
  }

  static readonly default = new TensionEstimator();
}
