// Generator integration (Wave 6)

// Dependency model (X6.1)
export type { GeneratorDependencies } from "./GeneratorDependencies.js";

// Chord identifiers — callers need these to construct a request's initialChord
// (the model layer has no barrel of its own).
export { chordId, MVP_CHORD_IDS } from "../model/ChordId.js";
export type { ChordId, MvpChordId } from "../model/ChordId.js";

// Request / result models (X6.2)
export type { GenerateRequest } from "./GenerateRequest.js";
export {
  DEFAULT_INITIAL_CHORD,
  MAX_GENERATION_STEPS,
  withRequestDefaults,
  validateGenerateRequest,
} from "./GenerateRequest.js";
export type { GenerationResult } from "./GenerationResult.js";
export { buildGenerationTrace } from "./GenerationResult.js";

// Engine (X6.3–X6.5)
export { StepGenerator } from "./StepGenerator.js";
export { GenerationSession } from "./GenerationSession.js";
export { HarmonicPotentialFieldGenerator } from "./HarmonicPotentialFieldGenerator.js";

// Default MVP factory (X6.6)
export { createDefaultMvpGenerator } from "./createDefaultMvpGenerator.js";

// Re-export the config essentials callers need to drive the generator, so the
// public API can be imported from one place (the model layer has no barrel).
export {
  createDefaultMvpConfig,
  type GeneratorConfig,
  type MvpConfigOverrides,
  type FactorId,
  type FactorWeights,
  type SurpriseConfig,
} from "../model/GenerationConfig.js";

// Key context and style presets callers select by name (e.g. from a CLI flag or
// an example script).  These live in the model layer, which has no barrel of its
// own, so they are surfaced here alongside the other config essentials.
export { Mode } from "../model/MusicalState.js";
export type { MusicalKey } from "../model/MusicalState.js";
export { StyleProfiles } from "../model/StyleProfile.js";
export type { StyleProfile, StyleProfileId } from "../model/StyleProfile.js";
