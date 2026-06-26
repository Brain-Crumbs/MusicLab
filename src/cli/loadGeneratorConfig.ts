import { readFileSync } from "node:fs";
import {
  chordId,
  type ChordId,
  type MvpConfigOverrides,
  type MusicalKey,
  Mode,
  PhraseTemplates,
  StyleProfiles,
  type StyleProfile,
} from "../index.js";
import type { PhraseTemplate } from "../core/model/PhraseTemplate.js";

// ---------------------------------------------------------------------------
// C11.2 — CLI config loading
//
// Turns loosely-typed CLI input (flags and/or a JSON config file) into the
// strongly-typed values the generator needs: a validated MvpConfigOverrides
// plus the run parameters (steps + initialChord).
//
// Resolution order, lowest to highest precedence:
//   1. built-in generator defaults (applied later by createDefaultMvpConfig)
//   2. fields from the --config JSON file
//   3. explicit CLI flags
//
// Names are resolved here so the rest of the CLI never deals with raw strings:
// "--phrase eightBarLongArc" becomes the actual PhraseTemplate object, and
// "--style modalSurprising" becomes the StyleProfile object.  Unknown names
// fail fast with a message that lists the valid choices.
// ---------------------------------------------------------------------------

/** Loosely-typed options as they arrive from CLI parsing or a JSON file. */
export interface RawGeneratorOptions {
  readonly key?: string;
  readonly mode?: string;
  readonly temperature?: number;
  readonly seed?: number;
  readonly steps?: number;
  readonly initialChord?: string;
  /** Phrase template name, e.g. "fourBarResolutionPump". */
  readonly phrase?: string;
  /** Style profile selector: a StyleProfiles key or a profile id. */
  readonly style?: string;
  /** Path to a JSON file holding any of the above fields. */
  readonly config?: string;
}

/** The validated, ready-to-use result of loading CLI config. */
export interface LoadedGeneratorConfig {
  /** Overrides to hand to {@link createDefaultMvpGenerator}. */
  readonly overrides: MvpConfigOverrides;
  /** Number of chords to generate. */
  readonly steps: number;
  /** Chord the run starts on. */
  readonly initialChord: ChordId;
}

/** Default run length when neither the file nor a flag specifies one. */
export const DEFAULT_STEPS = 8;
/** Default starting chord when none is supplied. */
export const DEFAULT_INITIAL_CHORD = "I";

const VALID_KEYS: readonly MusicalKey[] = [
  "C",
  "C#",
  "Db",
  "D",
  "D#",
  "Eb",
  "E",
  "F",
  "F#",
  "Gb",
  "G",
  "G#",
  "Ab",
  "A",
  "A#",
  "Bb",
  "B",
];

/** Injectable file reader so loading can be unit-tested without touching disk. */
export interface LoadDeps {
  readonly readFile?: (path: string) => string;
}

/**
 * Loads and validates generator configuration from CLI options.
 *
 * When `options.config` points at a JSON file, its fields are read first and
 * then overlaid with any explicit CLI flags (flags win).  All names are
 * resolved to concrete objects and every value is validated, so the returned
 * config is safe to pass straight to the generator.
 *
 * @throws if a file is unreadable/invalid JSON, or if any value is out of range
 *   or names an unknown phrase template, style profile, key, or mode.
 */
export function loadGeneratorConfig(
  options: RawGeneratorOptions,
  deps: LoadDeps = {},
): LoadedGeneratorConfig {
  const readFile = deps.readFile ?? defaultReadFile;

  const fromFile = options.config ? readConfigFile(options.config, readFile) : {};
  // CLI flags override file values; undefined flags fall through to the file.
  const merged: RawGeneratorOptions = { ...fromFile, ...stripUndefined(options) };

  // Writable view so fields can be set conditionally; returned as the readonly
  // MvpConfigOverrides.
  const overrides: { -readonly [K in keyof MvpConfigOverrides]: MvpConfigOverrides[K] } = {};

  if (merged.key !== undefined) overrides.key = resolveKey(merged.key);
  if (merged.mode !== undefined) overrides.mode = resolveMode(merged.mode);
  if (merged.temperature !== undefined) {
    overrides.temperature = resolveTemperature(merged.temperature);
  }
  if (merged.seed !== undefined) overrides.seed = resolveSeed(merged.seed);
  if (merged.phrase !== undefined) {
    overrides.phraseTemplate = resolvePhraseTemplate(merged.phrase);
  }
  if (merged.style !== undefined) {
    overrides.styleProfile = resolveStyleProfile(merged.style);
  }

  const steps = resolveSteps(merged.steps);
  const initialChord = chordId(merged.initialChord ?? DEFAULT_INITIAL_CHORD);

  return { overrides, steps, initialChord };
}

// ---------------------------------------------------------------------------
// File reading
// ---------------------------------------------------------------------------

function defaultReadFile(path: string): string {
  return readFileSync(path, "utf8");
}

function readConfigFile(path: string, readFile: (path: string) => string): RawGeneratorOptions {
  let text: string;
  try {
    text = readFile(path);
  } catch (cause) {
    throw new Error(`Could not read config file "${path}": ${describe(cause)}`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (cause) {
    throw new Error(`Config file "${path}" is not valid JSON: ${describe(cause)}`);
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error(`Config file "${path}" must contain a JSON object.`);
  }
  return parsed as RawGeneratorOptions;
}

// ---------------------------------------------------------------------------
// Field resolution / validation
// ---------------------------------------------------------------------------

function resolveKey(key: string): MusicalKey {
  if (!VALID_KEYS.includes(key as MusicalKey)) {
    throw new Error(`Unknown key "${key}". Valid keys: ${VALID_KEYS.join(", ")}.`);
  }
  return key as MusicalKey;
}

function resolveMode(mode: string): Mode {
  const values = Object.values(Mode);
  if (!values.includes(mode as Mode)) {
    throw new Error(`Unknown mode "${mode}". Valid modes: ${values.join(", ")}.`);
  }
  return mode as Mode;
}

function resolveTemperature(temperature: number): number {
  if (!Number.isFinite(temperature) || temperature <= 0) {
    throw new Error(`temperature must be a positive number, got ${temperature}.`);
  }
  return temperature;
}

function resolveSeed(seed: number): number {
  if (!Number.isInteger(seed) || seed < 0) {
    throw new Error(`seed must be a non-negative integer, got ${seed}.`);
  }
  return seed;
}

function resolveSteps(steps: number | undefined): number {
  if (steps === undefined) return DEFAULT_STEPS;
  if (!Number.isInteger(steps) || steps <= 0) {
    throw new Error(`steps must be a positive integer, got ${steps}.`);
  }
  return steps;
}

function resolvePhraseTemplate(name: string): PhraseTemplate {
  const template = (PhraseTemplates as Record<string, PhraseTemplate>)[name];
  if (!template) {
    const names = Object.keys(PhraseTemplates).join(", ");
    throw new Error(`Unknown phrase template "${name}". Available: ${names}.`);
  }
  return template;
}

function resolveStyleProfile(selector: string): StyleProfile {
  const profiles = StyleProfiles as Record<string, StyleProfile>;
  // Accept either the preset key (e.g. "folkStable") or the profile id
  // (e.g. "folk_stable") for ergonomics.
  const byKey = profiles[selector];
  if (byKey) return byKey;

  const byId = Object.values(profiles).find((p) => p.id === selector);
  if (byId) return byId;

  const keys = Object.keys(StyleProfiles).join(", ");
  throw new Error(`Unknown style profile "${selector}". Available: ${keys}.`);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Removes keys whose value is undefined so they don't clobber file values. */
function stripUndefined(options: RawGeneratorOptions): RawGeneratorOptions {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(options)) {
    if (v !== undefined) out[k] = v;
  }
  return out as RawGeneratorOptions;
}

function describe(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause);
}
