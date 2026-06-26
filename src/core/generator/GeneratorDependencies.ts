import type { HarmonicTopology } from "../model/HarmonicTopology.js";
import type { GeneratorConfig } from "../model/GenerationConfig.js";
import type { CompositeFactorScorer } from "../factors/CompositeFactorScorer.js";
import type { PhraseEngine } from "../phrase/PhraseEngine.js";
import type { WeightedSampler } from "../probability/WeightedSampler.js";
import type { StateTransitioner } from "../state/StateTransitioner.js";

/**
 * The complete set of collaborators the {@link HarmonicPotentialFieldGenerator}
 * needs to run a generation.
 *
 * This is the seam between the wiring layer (factories such as
 * {@link createDefaultMvpGenerator}) and the orchestration layer (the
 * generator, session, and step generator).  Every dependency is an already
 * constructed, immutable collaborator — the generator does no building of its
 * own, which keeps it free of topology, factor, or RNG construction knowledge
 * and makes every collaborator independently replaceable in tests.
 *
 * Following the project's layering rule, this model references only the core
 * engine: there is no dependency on renderers, visualisations, DOM, or audio.
 *
 * Notes on what is *not* here:
 *   - Softmax is a stateless static normaliser, so it is used directly by the
 *     step generator rather than injected.  Its single tunable (temperature)
 *     lives in {@link GeneratorConfig}.
 *   - The {@link RandomSource} is not exposed directly; it is captured inside
 *     the injected {@link WeightedSampler}, which is the only component that
 *     consumes randomness.
 */
export interface GeneratorDependencies {
  /** The immutable harmonic space — what transitions are possible. */
  readonly topology: HarmonicTopology;

  /** Scores each candidate edge into an explainable CandidateScore. */
  readonly scorer: CompositeFactorScorer;

  /** Exposes the phrase arc (target tension and zone) at each position. */
  readonly phraseEngine: PhraseEngine;

  /** Turns the softmax distribution into a single chosen edge. */
  readonly sampler: WeightedSampler;

  /** Produces the next MusicalState once an edge has been chosen. */
  readonly stateTransitioner: StateTransitioner;

  /** Weights, temperature, surprise, style, and key context for the run. */
  readonly config: GeneratorConfig;
}
