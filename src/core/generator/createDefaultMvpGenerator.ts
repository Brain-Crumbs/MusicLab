import {
  createDefaultMvpConfig,
  type GeneratorConfig,
  type MvpConfigOverrides,
} from "../model/GenerationConfig.js";
import { MajorKeyTopologyBuilder } from "../topology/MajorKeyTopologyBuilder.js";
import { PhraseEngine } from "../phrase/PhraseEngine.js";
import { CompositeFactorScorer } from "../factors/CompositeFactorScorer.js";
import { SeededRandomSource } from "../probability/SeededRandomSource.js";
import { WeightedSampler } from "../probability/WeightedSampler.js";
import { StateTransitioner } from "../state/StateTransitioner.js";
import type { GeneratorDependencies } from "./GeneratorDependencies.js";
import { HarmonicPotentialFieldGenerator } from "./HarmonicPotentialFieldGenerator.js";

/**
 * Picks a non-negative 32-bit seed when the caller did not supply one, so that
 * every generator instance is reproducible: the chosen seed is baked into the
 * config and recorded on each result's trace, so a "random" run can always be
 * replayed by passing that seed back in.
 */
function resolveSeed(overrides: MvpConfigOverrides): number {
  return overrides.seed ?? Math.floor(Math.random() * 0x1_0000_0000);
}

/**
 * Batteries-included factory for the MVP generator.
 *
 * Wires the default major-key topology, the full implemented factor set
 * (gravity, tension, phrase, cadence, novelty, surprise, style, memory — each
 * still governed by its configured weight), a seeded sampler, and the default
 * state transitioner into a ready-to-use
 * {@link HarmonicPotentialFieldGenerator}.  Callers customise only what they
 * want via {@link MvpConfigOverrides}:
 *
 * ```ts
 * const generator = createDefaultMvpGenerator({
 *   key: "C",
 *   temperature: 0.8,
 *   seed: 12345,
 * });
 * const result = generator.generate({ steps: 8, initialChord: chordId("I") });
 * ```
 *
 * The seed is always resolved to a concrete value (random when omitted) and
 * stored on the config, so generation is reproducible and the trace records the
 * exact seed used.
 */
export function createDefaultMvpGenerator(
  overrides: MvpConfigOverrides = {},
): HarmonicPotentialFieldGenerator {
  const seed = resolveSeed(overrides);
  const config: GeneratorConfig = createDefaultMvpConfig({ ...overrides, seed });

  const deps: GeneratorDependencies = {
    topology: new MajorKeyTopologyBuilder().build(),
    scorer: CompositeFactorScorer.createWithAllFactors(),
    phraseEngine: new PhraseEngine(config.phraseTemplate),
    sampler: new WeightedSampler(new SeededRandomSource(seed)),
    stateTransitioner: StateTransitioner.createDefault(),
    config,
  };

  return new HarmonicPotentialFieldGenerator(deps);
}
