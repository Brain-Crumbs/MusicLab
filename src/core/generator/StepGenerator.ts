import type { MusicalState } from "../model/MusicalState.js";
import type { HarmonicEdge } from "../model/HarmonicEdge.js";
import type { GenerationStep, CandidateScore } from "../model/GenerationStep.js";
import { buildFactorContext } from "../factors/FactorContext.js";
import { Softmax, type ScoredCandidate } from "../probability/Softmax.js";
import type { GeneratorDependencies } from "./GeneratorDependencies.js";

/**
 * Executes a single chord-selection step — the heart of the engine.
 *
 * One step is the full runtime flow described in the project overview:
 *
 *   outgoing edges  →  factor scoring  →  softmax  →  weighted sample
 *                   →  state transition  →  GenerationStep
 *
 * The step generator owns no run state of its own; it is a pure function of
 * `(state, stepIndex)` given its injected collaborators.  This keeps it
 * trivially testable and lets {@link GenerationSession} drive it forward one
 * step at a time (useful for live/improvised use) or in a tight loop.
 *
 * Every step emits a fully populated {@link GenerationStep}: not just the chosen
 * chord but every candidate's score breakdown and the probability distribution
 * it was sampled from, so the decision is completely explainable after the fact.
 */
export class StepGenerator {
  private readonly deps: GeneratorDependencies;

  constructor(deps: GeneratorDependencies) {
    this.deps = deps;
  }

  /**
   * Generates the step taken *from* `state`.
   *
   * @param state     the live musical state to move from.
   * @param stepIndex zero-based index recorded on the emitted step.
   * @throws if the current chord has no outgoing edges (a dead end in the
   *   topology), since there is then nothing to sample.
   */
  generateStep(state: MusicalState, stepIndex: number): GenerationStep {
    const { topology, scorer, phraseEngine, sampler, stateTransitioner, config } = this.deps;

    // -----------------------------------------------------------------------
    // 1. Candidate edges — what can happen from here.
    // -----------------------------------------------------------------------
    const outgoing = topology.getOutgoingEdges(state.currentChord);
    if (outgoing.length === 0) {
      throw new Error(
        `StepGenerator: chord "${state.currentChord}" has no outgoing edges; ` +
          "cannot generate a step. Check the topology for dead ends.",
      );
    }

    // -----------------------------------------------------------------------
    // 2. Score every candidate, then sort by total score (descending) so the
    //    GenerationStep's candidates/distribution are in a stable, readable
    //    order with the strongest contender first.
    // -----------------------------------------------------------------------
    const candidates: CandidateScore[] = outgoing
      .map((edge) =>
        scorer.scoreCandidate(buildFactorContext({ edge, state, config, topology, phraseEngine })),
      )
      .sort((a, b) => b.totalScore - a.totalScore);

    // -----------------------------------------------------------------------
    // 3. Softmax the total scores into a probability distribution, then draw
    //    one candidate.  Building the scored list from the already-sorted
    //    candidates keeps the distribution's entry order aligned with
    //    `candidates`, as the GenerationStep contract promises.
    // -----------------------------------------------------------------------
    const scored: ScoredCandidate[] = candidates.map((c) => ({
      id: c.edge.id,
      score: c.totalScore,
    }));
    const distribution = Softmax.normalize(scored, config.temperature);
    const sampled = sampler.sample(distribution);

    const selectedEdge = findEdge(candidates, sampled.edgeId);

    // -----------------------------------------------------------------------
    // 4. Apply the transition to obtain the next immutable state.
    // -----------------------------------------------------------------------
    const nextState = stateTransitioner.applyTransition({
      state,
      selectedEdge,
      phraseEngine,
      config,
      topology,
    });

    // -----------------------------------------------------------------------
    // 5. Assemble the fully traceable step record.
    // -----------------------------------------------------------------------
    return {
      stepIndex,
      previousState: state,
      selectedEdge,
      selectedChord: selectedEdge.to,
      nextState,
      candidates,
      distribution,
      targetTension: nextState.targetTension,
      resultingTension: nextState.currentTension,
      cadenceState: nextState.cadenceState,
      surpriseBudgetBefore: state.surpriseBudget,
      surpriseBudgetAfter: nextState.surpriseBudget,
    };
  }
}

/**
 * Resolves the sampled edge id back to its HarmonicEdge among the candidates.
 * The id always comes from a candidate (the distribution is built from them),
 * so a miss indicates an internal invariant violation rather than bad input.
 */
function findEdge(candidates: readonly CandidateScore[], edgeId: string): HarmonicEdge {
  const match = candidates.find((c) => c.edge.id === edgeId);
  if (match === undefined) {
    throw new Error(
      `StepGenerator: sampled edge id "${edgeId}" is not among the candidates. ` +
        "This indicates a probability/candidate mismatch.",
    );
  }
  return match.edge;
}
