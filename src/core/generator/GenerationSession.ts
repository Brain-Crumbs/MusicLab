import type { MusicalState } from "../model/MusicalState.js";
import type { ChordId } from "../model/ChordId.js";
import type { GenerationStep } from "../model/GenerationStep.js";
import { InitialStateFactory } from "../state/InitialStateFactory.js";
import type { GeneratorDependencies } from "./GeneratorDependencies.js";
import type { GenerateRequest } from "./GenerateRequest.js";
import { validateGenerateRequest } from "./GenerateRequest.js";
import { StepGenerator } from "./StepGenerator.js";
import type { GenerationResult } from "./GenerationResult.js";
import { TraceRecorder } from "../diagnostics/TraceRecorder.js";

/**
 * A single, stateful generation run.
 *
 * While {@link StepGenerator} is pure, the session is the one place that holds
 * the evolving {@link MusicalState} and the accumulating list of steps.  It
 * exposes two usage styles over the same machinery:
 *
 *   - {@link run} — generate the whole progression in one call (what
 *     {@link HarmonicPotentialFieldGenerator.generate} uses); and
 *   - {@link advance} — take one step at a time, for live/improvised use where
 *     a player wants to pull the next chord on demand and inspect state between
 *     steps.
 *
 * A session represents exactly one request; create a new session per run.  The
 * initial state is built up front from the request so the first call to
 * {@link advance} already has a fully populated state to move from.
 */
export class GenerationSession {
  private readonly stepGenerator: StepGenerator;
  private readonly seed?: number;
  private readonly totalSteps: number;
  private readonly initialChord: ChordId;

  private readonly steps: GenerationStep[] = [];
  private state: MusicalState;

  constructor(deps: GeneratorDependencies, request: GenerateRequest) {
    validateGenerateRequest(request);

    this.stepGenerator = new StepGenerator(deps);
    this.totalSteps = request.steps;
    this.initialChord = request.initialChord;
    if (deps.config.seed !== undefined) {
      this.seed = deps.config.seed;
    }
    this.state = InitialStateFactory.create(request, deps.config, deps.topology);
  }

  /** The live musical state — the chord the next step will move from. */
  get currentState(): MusicalState {
    return this.state;
  }

  /** Number of steps generated so far. */
  get generatedCount(): number {
    return this.steps.length;
  }

  /** True once every requested step has been generated. */
  get isComplete(): boolean {
    return this.steps.length >= this.totalSteps;
  }

  /**
   * Generates the next step and advances the session's state.
   *
   * @throws if the session is already complete.
   */
  advance(): GenerationStep {
    if (this.isComplete) {
      throw new Error(
        `GenerationSession is complete (${this.totalSteps} steps already generated).`,
      );
    }

    const step = this.stepGenerator.generateStep(this.state, this.steps.length);
    this.steps.push(step);
    this.state = step.nextState;
    return step;
  }

  /**
   * Runs the session to completion and returns the assembled
   * {@link GenerationResult}.  Generates only the remaining steps, so it is safe
   * to call after some manual {@link advance} calls.
   */
  run(): GenerationResult {
    while (!this.isComplete) {
      this.advance();
    }
    return this.toResult();
  }

  /** Assembles the current steps into a {@link GenerationResult}. */
  toResult(): GenerationResult {
    const steps = [...this.steps];
    return {
      initialChord: this.initialChord,
      chords: steps.map((s) => s.selectedChord),
      steps,
      finalState: this.state,
      trace: TraceRecorder.record({
        steps,
        finalState: this.state,
        initialChord: this.initialChord,
        ...(this.seed !== undefined && { seed: this.seed }),
      }),
    };
  }
}
