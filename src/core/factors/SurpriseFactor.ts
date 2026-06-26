import type { FactorId } from "../model/GenerationConfig.js";
import type { FactorContext } from "./FactorContext.js";
import { BaseFactor, clamp, type RawFactorResult } from "./FactorEngine.js";
import { SurpriseBudgetUpdater } from "../state/SurpriseBudgetUpdater.js";

/**
 * Effectively-infinite penalty used to remove a candidate from contention when
 * `emptyBudgetBehavior` is "block" and the budget can't afford the move.  A
 * large finite value (rather than -Infinity) keeps the candidate's total score
 * a real number so the softmax stays well-defined; the resulting probability is
 * indistinguishable from zero.
 */
const BLOCK_PENALTY = -1e6;

/** Base penalty multiplier applied to a rare move even when the budget is full. */
const BASE_COST_MULTIPLIER = 1;

/** Additional penalty multiplier that scales with how depleted the budget is. */
const DEPLETION_COST_MULTIPLIER = 4;

/**
 * SurpriseFactor — meters how often the engine spends its "surprise budget" on
 * rare or unexpected moves.
 *
 * Ordinary, expected transitions have `surpriseCost === 0` and score exactly 0
 * here (matching the spec's "surprise +0.0" baseline).  Rare moves cost budget;
 * this factor penalises them more heavily as the remaining budget runs low, so
 * the generator can take the occasional unexpected turn but can't do it
 * constantly.
 *
 * Two behaviours, selected by SurpriseConfig.emptyBudgetBehavior:
 *   - "penalize" (default): a continuous penalty that grows as the budget
 *     depletes — rare moves never become impossible, just expensive.  This
 *     avoids hard discontinuities in the probability field.
 *   - "block": if the budget can't afford the move, apply BLOCK_PENALTY so the
 *     candidate is excluded in all but name.
 *
 * Raw score: 0 for free moves; negative for rare moves; BLOCK_PENALTY when
 * blocked.
 */
export class SurpriseFactor extends BaseFactor {
  readonly id: FactorId = "surprise";

  protected computeRaw(context: FactorContext): RawFactorResult {
    const { edge, state, config } = context;
    const { surpriseCost } = edge;

    // Expected moves are free and neutral.
    if (surpriseCost <= 0) {
      return { raw: 0, explanation: "expected move (no surprise cost)" };
    }

    const { maxBudget, emptyBudgetBehavior } = config.surpriseConfig;
    const budget = state.surpriseBudget;

    // Hard block mode: can't afford it → remove from contention.
    if (emptyBudgetBehavior === "block" && !SurpriseBudgetUpdater.canAfford(budget, edge)) {
      return {
        raw: BLOCK_PENALTY,
        explanation: `blocked: budget ${budget.toFixed(2)} < cost ${surpriseCost.toFixed(2)}`,
      };
    }

    // Soft penalty: light when budget is full, heavy when depleted.
    const budgetRatio = maxBudget > 0 ? clamp(budget / maxBudget, 0, 1) : 0;
    const depletion = 1 - budgetRatio;
    const multiplier = BASE_COST_MULTIPLIER + depletion * DEPLETION_COST_MULTIPLIER;
    const raw = -surpriseCost * multiplier;

    return {
      raw,
      explanation:
        `cost ${surpriseCost.toFixed(2)} × ${multiplier.toFixed(2)} ` +
        `(budget ${budget.toFixed(2)}/${maxBudget}) → ${raw.toFixed(2)}`,
    };
  }
}
