import type { Chord } from "../model/Chord.js";
import type { HarmonicEdge } from "../model/HarmonicEdge.js";
import type { MusicalState } from "../model/MusicalState.js";
import type { GeneratorConfig } from "../model/GenerationConfig.js";
import type { HarmonicTopology } from "../model/HarmonicTopology.js";
import type { PhraseFrame } from "../phrase/PhraseEngine.js";
import type { PhraseEngine } from "../phrase/PhraseEngine.js";

/**
 * The complete read-only context handed to every factor when scoring a single
 * candidate edge.
 *
 * A FactorContext describes *one* candidate transition (the `edge`) evaluated
 * from the current `state`.  Factors are pure functions of this context: given
 * the same context they always return the same FactorScore, and they never
 * mutate any of its fields.
 *
 * The fields are deliberately denormalised — `fromChord` and `toChord` are
 * resolved up front so individual factors don't each have to call
 * `topology.getChord(...)`.  The `topology` itself is still provided for the
 * rarer cases where a factor needs to look beyond the single edge (e.g. to
 * inspect a chord's other outgoing options).
 */
export interface FactorContext {
  /** The candidate transition being scored. */
  readonly edge: HarmonicEdge;

  /** The chord we are moving from (resolved from state.currentChord). */
  readonly fromChord: Chord;

  /** The chord we would move to if this edge is chosen (resolved from edge.to). */
  readonly toChord: Chord;

  /** The live musical state at the moment of decision. */
  readonly state: MusicalState;

  /** The active generation configuration (weights, style, surprise, etc.). */
  readonly config: GeneratorConfig;

  /** The immutable harmonic space, for factors needing wider lookups. */
  readonly topology: HarmonicTopology;

  /**
   * The phrase frame for the position the candidate chord would occupy
   * (i.e. the *next* phrase position).  Factors read its `targetTension`,
   * `zone`, and end/pre-cadential flags to align choices with the phrase arc.
   */
  readonly phrase: PhraseFrame;
}

// ---------------------------------------------------------------------------
// Builder
// ---------------------------------------------------------------------------

/**
 * Arguments accepted by {@link buildFactorContext}.
 *
 * The caller supplies the current state, the candidate edge, and the shared
 * dependencies; the builder derives `fromChord`, `toChord`, and the phrase
 * frame so call sites (the step generator and tests) stay terse.
 */
export interface BuildFactorContextArgs {
  readonly edge: HarmonicEdge;
  readonly state: MusicalState;
  readonly config: GeneratorConfig;
  readonly topology: HarmonicTopology;
  readonly phraseEngine: PhraseEngine;
}

/**
 * Assembles a FactorContext for a single candidate edge.
 *
 * The phrase frame is built for the position the candidate would land on —
 * `(state.phrasePosition + 1) % phraseLength` — because a factor is reasoning
 * about where the *next* chord sits in the arc, not where the current one does.
 * This mirrors how StateTransitioner advances the phrase position and target
 * tension after a transition.
 */
export function buildFactorContext(args: BuildFactorContextArgs): FactorContext {
  const { edge, state, config, topology, phraseEngine } = args;

  const fromChord = topology.getChord(state.currentChord);
  const toChord = topology.getChord(edge.to);

  const nextPhrasePosition =
    state.phraseLength > 0
      ? (state.phrasePosition + 1) % state.phraseLength
      : state.phrasePosition + 1;
  const phrase = phraseEngine.buildFrame(nextPhrasePosition);

  return { edge, fromChord, toChord, state, config, topology, phrase };
}
