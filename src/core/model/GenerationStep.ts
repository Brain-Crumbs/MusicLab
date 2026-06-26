import type { ChordId } from "./ChordId.js";
import type { HarmonicEdge } from "./HarmonicEdge.js";
import type { MusicalState } from "./MusicalState.js";
import type { CadenceState } from "./CadenceState.js";

// ---------------------------------------------------------------------------
// Factor score types (model-layer contracts)
//
// These interfaces define the shape that the generation trace requires.
// F4.3 (FactorScore.ts) and F4.12 (CompositeFactorScorer.ts) import and
// implement these contracts; they do not redefine them.
// ---------------------------------------------------------------------------

/**
 * The contribution of a single factor to one candidate's total score.
 * FactorEngine implementations return this shape; CompositeFactorScorer
 * collects them into CandidateScore.
 */
export interface FactorScore {
  /** Matches FactorEngine.id — identifies which factor produced this score. */
  readonly factorId: string;

  /** Score before weight is applied.  May be any real number. */
  readonly rawScore: number;

  /** rawScore × factor weight from GeneratorConfig.factorWeights. */
  readonly weightedScore: number;

  /** Optional human-readable explanation for debugging and visualisation. */
  readonly explanation?: string;
}

/**
 * The scored assessment of one candidate edge, as produced by
 * CompositeFactorScorer for a single generation step.
 */
export interface CandidateScore {
  readonly edge: HarmonicEdge;

  /** Sum of all weightedScores from factorScores. */
  readonly totalScore: number;

  /** Per-factor breakdown — length equals the number of active factors. */
  readonly factorScores: readonly FactorScore[];
}

// ---------------------------------------------------------------------------
// Probability distribution (model-layer contract)
//
// P5.1 (ProbabilityDistribution.ts) will implement a class satisfying this
// interface.  GenerationStep uses the interface so it stays decoupled from
// the probability engine implementation.
// ---------------------------------------------------------------------------

/**
 * A normalised probability distribution over candidate edges.
 * All probabilities are in [0, 1] and sum to 1.
 */
export interface ProbabilityDistribution {
  /** Returns the probability assigned to the given edge id.  0 if absent. */
  getProbability(edgeId: string): number;

  /** All (edgeId, probability) pairs in this distribution. */
  readonly entries: ReadonlyArray<{ edgeId: string; probability: number }>;

  /** The edge id with the highest probability. */
  readonly modalEdgeId: string;
}

// ---------------------------------------------------------------------------
// GenerationStep
// ---------------------------------------------------------------------------

/**
 * Complete record of a single chord-selection step.
 *
 * This is the primary unit of traceability: it contains everything needed
 * to understand why a chord was chosen, replay the decision, and visualise
 * the probability field at that moment.
 */
export interface GenerationStep {
  /** Zero-based index of this step within the generation run. */
  readonly stepIndex: number;

  // -------------------------------------------------------------------------
  // State transition
  // -------------------------------------------------------------------------

  readonly previousState: MusicalState;
  readonly selectedEdge: HarmonicEdge;
  readonly selectedChord: ChordId;
  readonly nextState: MusicalState;

  // -------------------------------------------------------------------------
  // Scoring and distribution
  // -------------------------------------------------------------------------

  /**
   * All scored candidates considered at this step, sorted by totalScore
   * descending.  Includes unselected candidates for full transparency.
   */
  readonly candidates: readonly CandidateScore[];

  /**
   * Normalised probability distribution over candidates after softmax.
   * Index-aligned with `candidates`.
   */
  readonly distribution: ProbabilityDistribution;

  // -------------------------------------------------------------------------
  // Tension
  // -------------------------------------------------------------------------

  /** Target tension for this phrase position (from PhraseTemplate). */
  readonly targetTension: number;

  /** Actual tension in nextState after the transition. */
  readonly resultingTension: number;

  // -------------------------------------------------------------------------
  // Cadence and surprise snapshots
  // -------------------------------------------------------------------------

  /** Cadence state after the transition (mirrors nextState.cadenceState). */
  readonly cadenceState: CadenceState;

  readonly surpriseBudgetBefore: number;
  readonly surpriseBudgetAfter: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns the CandidateScore for the edge that was selected, if present. */
export function selectedCandidateScore(step: GenerationStep): CandidateScore | undefined {
  return step.candidates.find((c) => c.edge.id === step.selectedEdge.id);
}

/** Returns the probability that was assigned to the selected edge. */
export function selectedProbability(step: GenerationStep): number {
  return step.distribution.getProbability(step.selectedEdge.id);
}

/** Returns tension error: how far actual tension deviated from target. */
export function tensionError(step: GenerationStep): number {
  return Math.abs(step.resultingTension - step.targetTension);
}
