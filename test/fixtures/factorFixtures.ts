import { MajorKeyTopologyBuilder } from "../../src/core/topology/MajorKeyTopologyBuilder.js";
import { createDefaultMvpConfig } from "../../src/core/model/GenerationConfig.js";
import type { GeneratorConfig } from "../../src/core/model/GenerationConfig.js";
import { PhraseEngine } from "../../src/core/phrase/PhraseEngine.js";
import { PhraseTemplates } from "../../src/core/phrase/PhraseTemplates.js";
import type { PhraseTemplate } from "../../src/core/model/PhraseTemplate.js";
import { InitialStateFactory } from "../../src/core/state/InitialStateFactory.js";
import { buildFactorContext } from "../../src/core/factors/FactorContext.js";
import type { FactorContext } from "../../src/core/factors/FactorContext.js";
import type { MusicalState } from "../../src/core/model/MusicalState.js";
import { HarmonicTopology } from "../../src/core/model/HarmonicTopology.js";
import { chordId } from "../../src/core/model/ChordId.js";

/** Single shared topology — immutable, safe to reuse across tests. */
export const topology: HarmonicTopology = new MajorKeyTopologyBuilder().build();

export interface ContextOptions {
  /** Phrase template to interpret positions against. */
  readonly template?: PhraseTemplate;
  /** Whole-config replacement (takes precedence over default). */
  readonly config?: GeneratorConfig;
  /** Shallow overrides merged onto the initial MusicalState. */
  readonly state?: Partial<MusicalState>;
}

/**
 * Builds a FactorContext for the edge `from -> to` using the real topology,
 * default MVP config (seed 1), and the four-bar resolution-pump template,
 * with optional overrides.  Throws if the edge does not exist.
 */
export function contextFor(from: string, to: string, options: ContextOptions = {}): FactorContext {
  const config = options.config ?? createDefaultMvpConfig({ seed: 1 });
  const template = options.template ?? PhraseTemplates.fourBarResolutionPump;
  const phraseEngine = new PhraseEngine(template);

  let state = InitialStateFactory.create(
    { steps: 8, initialChord: chordId(from) },
    config,
    topology,
  );
  if (options.state) {
    state = { ...state, ...options.state };
  }

  const edge = topology.getOutgoingEdges(chordId(from)).find((e) => e.to === chordId(to));
  if (!edge) {
    throw new Error(`fixture: no edge ${from} -> ${to} in topology`);
  }

  return buildFactorContext({ edge, state, config, topology, phraseEngine });
}

/** Default MVP config with a fixed seed, for direct use in tests. */
export const defaultConfig: GeneratorConfig = createDefaultMvpConfig({ seed: 1 });
