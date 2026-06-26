import type { FactorId } from "../model/GenerationConfig.js";
import type { FactorContext } from "./FactorContext.js";
import { BaseFactor, type RawFactorResult } from "./FactorEngine.js";
import { HarmonicFunction } from "../model/HarmonicFunction.js";

/** How strongly the pull-home grows per step away from the tonic. */
const HOME_PULL_PER_STEP = 0.2;

/** Cap on the accumulated pull-home reward. */
const MAX_HOME_PULL = 1.2;

/** Number of steps away from tonic before the pull-home begins. */
const HOME_PULL_GRACE = 2;

/** Small reward for reinforcing a chord still held in recent memory. */
const FAMILIARITY_REWARD = 0.25;

/**
 * MemoryFactor — gives the progression a sense of harmonic return.
 *
 * Where NoveltyFactor pushes *away* from repetition, MemoryFactor pulls *back*
 * toward established material so the music doesn't wander indefinitely.  It
 * contributes two complementary pulls:
 *
 *   1. Pull home — the longer it has been since a tonic-function chord
 *      (MusicalState.timeSinceTonic), the more a candidate that *is* tonic is
 *      rewarded.  A short grace period lets the phrase leave home first.
 *   2. Familiarity — a small reward for moving to a chord that is still in the
 *      recent-chords window, reinforcing local motifs.
 *
 * These two effects are mutually exclusive in practice (the home pull only
 * applies to tonic targets, the familiarity reward to recently-seen ones), and
 * the factor is deliberately gentle so Novelty and Memory can be balanced by
 * their configured weights rather than fighting at full strength.
 *
 * Raw score range ≈ [0, ~1.2].
 */
export class MemoryFactor extends BaseFactor {
  readonly id: FactorId = "memory";

  protected computeRaw(context: FactorContext): RawFactorResult {
    const { toChord, state } = context;

    let raw = 0;
    const reasons: string[] = [];

    // 1. Pull home: reward returning to tonic after drifting away.
    if (toChord.harmonicFunction === HarmonicFunction.Tonic) {
      const stepsAway = Math.max(0, state.timeSinceTonic - HOME_PULL_GRACE);
      const homePull = Math.min(stepsAway * HOME_PULL_PER_STEP, MAX_HOME_PULL);
      if (homePull > 0) {
        raw += homePull;
        reasons.push(`home pull ${homePull.toFixed(2)} (away ${state.timeSinceTonic})`);
      }
    }

    // 2. Familiarity: small reinforcement for a recently-heard chord that is
    // not the chord we are currently on (that case belongs to Novelty).
    const inRecentMemory =
      toChord.id !== state.currentChord && state.recentChords.includes(toChord.id);
    if (inRecentMemory) {
      raw += FAMILIARITY_REWARD;
      reasons.push(`familiar (+${FAMILIARITY_REWARD})`);
    }

    return {
      raw,
      explanation: reasons.length > 0 ? reasons.join(", ") : "no memory pull",
    };
  }
}
