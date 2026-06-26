import type { FactorEngine } from "./FactorEngine.js";
import type { FactorContext } from "./FactorContext.js";
import type { FactorId } from "../model/GenerationConfig.js";
import type { CandidateScore } from "../model/GenerationStep.js";

import { HarmonicGravityFactor } from "./HarmonicGravityFactor.js";
import { TensionFitFactor } from "./TensionFitFactor.js";
import { PhraseFitFactor } from "./PhraseFitFactor.js";
import { CadenceFitFactor } from "./CadenceFitFactor.js";
import { NoveltyFactor } from "./NoveltyFactor.js";
import { SurpriseFactor } from "./SurpriseFactor.js";
import { StyleFactor } from "./StyleFactor.js";
import { MemoryFactor } from "./MemoryFactor.js";

/**
 * Combines a fixed set of independent {@link FactorEngine}s into a single
 * candidate score.
 *
 * The scorer is the bridge between the music-theory factors and the
 * probability engine: it runs every factor over a candidate's
 * {@link FactorContext}, sums their weighted contributions into one
 * `totalScore`, and keeps the per-factor breakdown attached.  Softmax later
 * turns these total scores into a probability distribution; the breakdown is
 * what makes each decision explainable.
 *
 * The scorer holds no mutable state and performs no normalisation or
 * randomness — it is a pure fold over the factor list.  Factor *weights* live
 * in GeneratorConfig and are applied by each factor (via BaseFactor), so the
 * scorer simply trusts each FactorScore.weightedScore.
 *
 * The emitted {@link CandidateScore} is the model-layer contract declared in
 * GenerationStep.ts, so the result drops straight into a GenerationStep with no
 * adaptation.
 */
export class CompositeFactorScorer {
  private readonly factors: readonly FactorEngine[];

  constructor(factors: readonly FactorEngine[]) {
    this.factors = factors;
  }

  /** The ids of the factors this scorer runs, in evaluation order. */
  get factorIds(): readonly FactorId[] {
    return this.factors.map((factor) => factor.id);
  }

  /** Number of active factors. */
  get factorCount(): number {
    return this.factors.length;
  }

  /**
   * Scores a single candidate edge described by the context.
   *
   * Returns a CandidateScore whose `totalScore` is the sum of every factor's
   * weightedScore and whose `factorScores` preserve the individual
   * contributions (in factor order) for tracing.
   */
  scoreCandidate(context: FactorContext): CandidateScore {
    const factorScores = this.factors.map((factor) => factor.score(context));
    const totalScore = factorScores.reduce((sum, score) => sum + score.weightedScore, 0);

    return {
      edge: context.edge,
      totalScore,
      factorScores,
    };
  }

  /**
   * Scores many candidates at once, preserving input order.
   * Convenience for a step that has already built one context per outgoing edge.
   */
  scoreCandidates(contexts: readonly FactorContext[]): CandidateScore[] {
    return contexts.map((context) => this.scoreCandidate(context));
  }

  // -------------------------------------------------------------------------
  // Factory helpers
  // -------------------------------------------------------------------------

  /**
   * The six MVP factors, in a stable evaluation order:
   * gravity → tension → phrase → cadence → novelty → surprise.
   *
   * Per the implementation plan, the MVP intentionally starts with these and
   * defers style and memory (see {@link allFactors} to include them).
   */
  static mvpFactors(): FactorEngine[] {
    return [
      new HarmonicGravityFactor(),
      new TensionFitFactor(),
      new PhraseFitFactor(),
      new CadenceFitFactor(),
      new NoveltyFactor(),
      new SurpriseFactor(),
    ];
  }

  /**
   * All eight implemented factors: the MVP six plus style and memory.
   * Each factor's influence is still governed by its configured weight, so a
   * factor can be silenced by setting its weight to 0 rather than omitting it.
   */
  static allFactors(): FactorEngine[] {
    return [...CompositeFactorScorer.mvpFactors(), new StyleFactor(), new MemoryFactor()];
  }

  /** Default scorer wired with the MVP factor set. */
  static createDefault(): CompositeFactorScorer {
    return new CompositeFactorScorer(CompositeFactorScorer.mvpFactors());
  }

  /** Scorer wired with every implemented factor (MVP six + style + memory). */
  static createWithAllFactors(): CompositeFactorScorer {
    return new CompositeFactorScorer(CompositeFactorScorer.allFactors());
  }
}
