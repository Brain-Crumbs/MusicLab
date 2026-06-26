import type { ChordId } from "./ChordId.js";
import type { PhraseTemplate } from "./PhraseTemplate.js";
import type { MusicalKey, Mode } from "./MusicalState.js";
import type { StyleProfile } from "./StyleProfile.js";

// ---------------------------------------------------------------------------
// Factor weights
// ---------------------------------------------------------------------------

/**
 * Named factor ids — matches the factor class ids used in CompositeFactorScorer.
 * Defined here so GenerationConfig can reference them without importing factor
 * implementation files (which live in a higher layer).
 */
export type FactorId =
  | "harmonicGravity"
  | "tensionFit"
  | "phraseFit"
  | "cadenceFit"
  | "novelty"
  | "surprise"
  | "style"
  | "memory";

/**
 * Per-factor weight multipliers.
 * Missing factors default to 1.0 (equal weighting).
 * Set a weight to 0 to disable a factor entirely.
 */
export type FactorWeights = Partial<Record<FactorId, number>>;

// ---------------------------------------------------------------------------
// Surprise budget config
// ---------------------------------------------------------------------------

/**
 * Controls how the SurpriseFactor manages the surprise budget.
 *
 * The surprise budget starts at `initialBudget` and is depleted by rare moves
 * (see HarmonicEdge.surpriseCost).  It replenishes by `replenishRate` each
 * step, up to `maxBudget`.
 *
 * When the budget reaches zero, `emptyBudgetBehavior` decides what happens:
 *   "penalize" — rare moves are still possible but heavily discounted.
 *   "block"    — rare moves are excluded from the candidate set entirely.
 */
export interface SurpriseConfig {
  readonly initialBudget: number;
  readonly maxBudget: number;
  /** Surprise units replenished per step (e.g. 0.1 = slow recovery). */
  readonly replenishRate: number;
  readonly emptyBudgetBehavior: "penalize" | "block";
}

// ---------------------------------------------------------------------------
// Main generation config
// ---------------------------------------------------------------------------

/**
 * Complete configuration for a generation session.
 *
 * GeneratorConfig is validated before generation begins.  Factory functions
 * (e.g. createDefaultMvpConfig) provide sane defaults; callers only need to
 * supply what they want to override.
 */
export interface GeneratorConfig {
  // -------------------------------------------------------------------------
  // Key context
  // -------------------------------------------------------------------------

  readonly key: MusicalKey;
  readonly mode: Mode;

  // -------------------------------------------------------------------------
  // Phrase
  // -------------------------------------------------------------------------

  readonly phraseTemplate: PhraseTemplate;

  // -------------------------------------------------------------------------
  // Randomness
  // -------------------------------------------------------------------------

  /**
   * Softmax temperature controlling how sharply probability is concentrated
   * on the highest-scoring candidate.
   *   Low  (~0.3) = near-deterministic, always picks the best move.
   *   High (~2.0) = near-uniform, very exploratory.
   *   MVP default: 0.8
   */
  readonly temperature: number;

  /**
   * Optional seed for the random source.  When provided, generation is fully
   * deterministic and reproducible.  When undefined, a random seed is used.
   */
  readonly seed?: number;

  // -------------------------------------------------------------------------
  // Factor weights
  // -------------------------------------------------------------------------

  readonly factorWeights: FactorWeights;

  // -------------------------------------------------------------------------
  // Surprise
  // -------------------------------------------------------------------------

  readonly surpriseConfig: SurpriseConfig;

  // -------------------------------------------------------------------------
  // Style
  // -------------------------------------------------------------------------

  /** Active style profile used by StyleFactor. */
  readonly styleProfile: StyleProfile;

  // -------------------------------------------------------------------------
  // History window
  // -------------------------------------------------------------------------

  /**
   * How many recent chords to keep in MusicalState.recentChords.
   * Affects NoveltyFactor and MemoryFactor lookback.
   * Default: 8.
   */
  readonly recentChordsWindow: number;
}

// ---------------------------------------------------------------------------
// Request / result shapes (minimal, expanded in X6 wave)
// ---------------------------------------------------------------------------

/** Input to a single generation run. */
export interface GenerateRequest {
  readonly steps: number;
  readonly initialChord: ChordId;
}

// ---------------------------------------------------------------------------
// Default config factory
// ---------------------------------------------------------------------------

import { PhraseTemplates } from "./PhraseTemplate.js";
import { StyleProfiles } from "./StyleProfile.js";
import { Mode as ModeEnum } from "./MusicalState.js";

/** Partial overrides accepted by createDefaultMvpConfig. */
export type MvpConfigOverrides = Partial<
  Pick<
    GeneratorConfig,
    "key" | "mode" | "phraseTemplate" | "temperature" | "seed" | "factorWeights" | "styleProfile"
  >
>;

/**
 * Returns a fully-populated GeneratorConfig suitable for the MVP generator.
 * All values are valid defaults; pass overrides to customise.
 */
export function createDefaultMvpConfig(overrides: MvpConfigOverrides = {}): GeneratorConfig {
  const base: GeneratorConfig = {
    key: "C",
    mode: ModeEnum.Major,
    phraseTemplate: PhraseTemplates.fourBarResolutionPump,
    temperature: 0.8,
    factorWeights: {
      harmonicGravity: 1.0,
      tensionFit: 1.0,
      phraseFit: 1.0,
      cadenceFit: 1.2,
      novelty: 0.8,
      surprise: 1.0,
      style: 0.9,
      memory: 0.6,
    },
    surpriseConfig: {
      initialBudget: 3,
      maxBudget: 5,
      replenishRate: 0.5,
      emptyBudgetBehavior: "penalize",
    },
    styleProfile: StyleProfiles.folkStable,
    recentChordsWindow: 8,
  };

  // Merge overrides, omitting undefined optional fields to satisfy exactOptionalPropertyTypes.
  const merged: GeneratorConfig = { ...base, ...overrides };
  if (overrides.seed === undefined) {
    const { seed: _omit, ...rest } = merged;
    return rest as GeneratorConfig;
  }
  return merged;
}
