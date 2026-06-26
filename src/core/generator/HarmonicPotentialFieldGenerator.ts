import type { MusicalState } from "../model/MusicalState.js";
import type { GenerationStep } from "../model/GenerationStep.js";
import type { GeneratorDependencies } from "./GeneratorDependencies.js";
import type { GenerateRequest } from "./GenerateRequest.js";
import { GenerationSession } from "./GenerationSession.js";
import { StepGenerator } from "./StepGenerator.js";
import type { GenerationResult } from "./GenerationResult.js";

/**
 * The public orchestration class — the stochastic harmonic potential-field
 * generator.
 *
 * It is intentionally thin: it holds the injected {@link GeneratorDependencies}
 * and delegates the actual run to a fresh {@link GenerationSession} per request.
 * All music-theory and probability logic lives in the collaborators (topology,
 * scorer, softmax/sampler, state transitioner); this class only wires a run
 * together. That separation is the project's key design rule — there is no
 * "ChordGenerator with everything inside it".
 *
 * Construct it directly when you have already wired the dependencies, or use
 * {@link createDefaultMvpGenerator} for the batteries-included MVP setup.
 */
export class HarmonicPotentialFieldGenerator {
  private readonly deps: GeneratorDependencies;

  constructor(deps: GeneratorDependencies) {
    this.deps = deps;
  }

  /** The dependencies this generator was constructed with (read-only access). */
  get dependencies(): GeneratorDependencies {
    return this.deps;
  }

  /**
   * Generates a complete progression for the request and returns the chords
   * plus the full traceable record.
   *
   * Each call is independent: a new session (and therefore a fresh initial
   * state) is created per request.  Determinism comes from the injected
   * sampler's {@link RandomSource}; with a seeded source the same generator
   * instance will reproduce the same run only if the source is reset between
   * calls (see {@link createDefaultMvpGenerator}, which seeds per instance).
   */
  generate(request: GenerateRequest): GenerationResult {
    const session = new GenerationSession(this.deps, request);
    return session.run();
  }

  /**
   * Starts a {@link GenerationSession} without running it, for callers that want
   * to drive generation one step at a time (e.g. live improvisation).
   */
  startSession(request: GenerateRequest): GenerationSession {
    return new GenerationSession(this.deps, request);
  }

  /**
   * Generates a single step from an arbitrary state.  Exposed mainly for
   * testing and advanced/interactive use; normal callers use {@link generate}
   * or {@link startSession}.
   */
  generateStep(state: MusicalState, stepIndex = 0): GenerationStep {
    return new StepGenerator(this.deps).generateStep(state, stepIndex);
  }
}
