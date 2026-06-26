import type { Chord } from "../model/Chord.js";
import { HarmonicFunction, HarmonicRegion } from "../model/HarmonicFunction.js";

/**
 * Classifies a chord into a coarse HarmonicRegion based on its harmonic
 * function.  Used by StateTransitioner to update MusicalState.harmonicRegion
 * after each chord transition.
 *
 * The mapping is intentionally coarse:
 *   Tonic + Mediant   → Tonic region   (stable, home territory)
 *   Predominant       → Predominant    (tension building)
 *   Dominant          → Dominant       (active tension)
 *   Modal             → Modal          (borrowed / outside diatonic)
 */
export class HarmonicRegionTracker {
  classify(chord: Chord): HarmonicRegion {
    return HarmonicRegionTracker.classify(chord);
  }

  static classify(chord: Chord): HarmonicRegion {
    switch (chord.harmonicFunction) {
      case HarmonicFunction.Tonic:
      case HarmonicFunction.Mediant:
        return HarmonicRegion.Tonic;
      case HarmonicFunction.Predominant:
        return HarmonicRegion.Predominant;
      case HarmonicFunction.Dominant:
        return HarmonicRegion.Dominant;
      case HarmonicFunction.Modal:
        return HarmonicRegion.Modal;
    }
  }

  static readonly default = new HarmonicRegionTracker();
}
