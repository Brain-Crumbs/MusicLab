import { chordId, type ChordId } from "../model/ChordId.js";

/**
 * Input to a single generation run.
 *
 * The canonical {@link GenerateRequest} shape is declared in the model layer
 * (GenerationConfig.ts) because {@link InitialStateFactory} and
 * {@link StateTransitioner} consume it.  It is re-exported here so callers of
 * the generator import request, result, and the generator from one place, and
 * so the generator layer owns the request *behaviour* (defaults + validation)
 * without duplicating the type.
 */
export type { GenerateRequest } from "../model/GenerationConfig.js";

import type { GenerateRequest } from "../model/GenerationConfig.js";

/** The chord a run starts on when the caller does not specify one. */
export const DEFAULT_INITIAL_CHORD: ChordId = chordId("I");

/** Reasonable upper bound on a single run, guarding against runaway loops. */
export const MAX_GENERATION_STEPS = 4096;

/**
 * Returns a {@link GenerateRequest} with defaults applied: `initialChord`
 * defaults to {@link DEFAULT_INITIAL_CHORD} when omitted.  `steps` has no
 * default — the caller must say how long the progression should be.
 */
export function withRequestDefaults(
  request: Partial<GenerateRequest> & Pick<GenerateRequest, "steps">,
): GenerateRequest {
  return {
    steps: request.steps,
    initialChord: request.initialChord ?? DEFAULT_INITIAL_CHORD,
  };
}

/**
 * Validates a {@link GenerateRequest} before generation begins, failing fast
 * with a clear message rather than producing a malformed run.
 *
 * @throws if `steps` is not a positive integer within {@link MAX_GENERATION_STEPS},
 *   or if `initialChord` is empty.
 */
export function validateGenerateRequest(request: GenerateRequest): void {
  const { steps, initialChord } = request;

  if (!Number.isInteger(steps) || steps <= 0) {
    throw new Error(`GenerateRequest.steps must be a positive integer, got ${steps}.`);
  }
  if (steps > MAX_GENERATION_STEPS) {
    throw new Error(
      `GenerateRequest.steps (${steps}) exceeds the maximum of ${MAX_GENERATION_STEPS}.`,
    );
  }
  if (typeof initialChord !== "string" || initialChord.length === 0) {
    throw new Error("GenerateRequest.initialChord must be a non-empty chord id.");
  }
}
