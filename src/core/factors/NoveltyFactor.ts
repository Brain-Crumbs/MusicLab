import type { FactorId } from "../model/GenerationConfig.js";
import type { FactorContext } from "./FactorContext.js";
import { BaseFactor, type RawFactorResult } from "./FactorEngine.js";
import { RepetitionTracker } from "../state/RepetitionTracker.js";

/** Penalty applied per prior occurrence of the candidate chord. */
const REPEAT_PENALTY = 0.35;

/** Maximum penalty from accumulated repetitions (keeps it bounded). */
const MAX_REPEAT_PENALTY = 1.4;

/** Extra penalty for immediately repeating the current chord. */
const IMMEDIATE_REPEAT_PENALTY = 0.8;

/** Small reward for a chord that has never been played in this generation. */
const FRESH_REWARD = 0.3;

/**
 * NoveltyFactor — discourages over-repetition so the progression keeps moving.
 *
 * It penalises a candidate in proportion to how many times its target chord has
 * already been played (from MusicalState.repetitionCounts), with an additional
 * penalty for landing on the chord we are already sitting on.  A never-played
 * chord earns a small freshness reward.
 *
 * This is the force that stops the generator from getting stuck hammering I.
 * It is intentionally the mirror image of MemoryFactor (which pulls *toward*
 * familiar material); the two are meant to be balanced by their weights.
 *
 * Raw score range ≈ [-2.2, +0.3].
 */
export class NoveltyFactor extends BaseFactor {
  readonly id: FactorId = "novelty";

  protected computeRaw(context: FactorContext): RawFactorResult {
    const { toChord, state } = context;

    const count = RepetitionTracker.getCount(state.repetitionCounts, toChord.id);

    let raw: number;
    if (count === 0) {
      raw = FRESH_REWARD;
    } else {
      raw = -Math.min(REPEAT_PENALTY * count, MAX_REPEAT_PENALTY);
    }

    const immediateRepeat = toChord.id === state.currentChord;
    if (immediateRepeat) {
      raw -= IMMEDIATE_REPEAT_PENALTY;
    }

    return {
      raw,
      explanation:
        `played ${count}×` + (immediateRepeat ? ", immediate repeat" : "") + ` → ${raw.toFixed(2)}`,
    };
  }
}
