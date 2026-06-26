import type { HarmonicEdge } from "../model/HarmonicEdge.js";
import type { SurpriseConfig } from "../model/GenerationConfig.js";

/**
 * Manages the surprise budget that limits how often the generator can make
 * rare or unexpected chord moves.
 *
 * Budget lifecycle per step:
 *   1. Deplete by selectedEdge.surpriseCost (cost of the chosen transition).
 *   2. Replenish by surpriseConfig.replenishRate (passive recovery).
 *   3. Clamp to [0, maxBudget].
 *
 * All methods are pure.
 */
export class SurpriseBudgetUpdater {
  update(
    currentBudget: number,
    selectedEdge: HarmonicEdge,
    surpriseConfig: SurpriseConfig,
  ): number {
    return SurpriseBudgetUpdater.update(currentBudget, selectedEdge, surpriseConfig);
  }

  static update(
    currentBudget: number,
    selectedEdge: HarmonicEdge,
    surpriseConfig: SurpriseConfig,
  ): number {
    const afterCost = currentBudget - selectedEdge.surpriseCost;
    const afterReplenish = afterCost + surpriseConfig.replenishRate;
    return Math.max(0, Math.min(surpriseConfig.maxBudget, afterReplenish));
  }

  /**
   * Returns true when the budget is sufficient to afford the given edge.
   * Used by SurpriseFactor when emptyBudgetBehavior is "block".
   */
  static canAfford(budget: number, edge: HarmonicEdge): boolean {
    return budget >= edge.surpriseCost;
  }

  static readonly default = new SurpriseBudgetUpdater();
}
