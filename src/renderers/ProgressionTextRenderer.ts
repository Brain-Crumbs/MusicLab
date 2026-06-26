import type { ChordId } from "../core/model/ChordId.js";
import type { MusicalKey } from "../core/model/MusicalState.js";
import type { GenerationResult } from "../core/generator/GenerationResult.js";
import { RomanNumeralRenderer } from "./RomanNumeralRenderer.js";
import {
  ConcreteChordRenderer,
  defaultMvpResolver,
  type ChordResolver,
} from "./ConcreteChordRenderer.js";

// ---------------------------------------------------------------------------
// R8.3 — Progression text renderer
//
// A combined, human-readable text view of a progression.  It composes the
// Roman-numeral renderer (R8.1) and the concrete-chord renderer (R8.2) so a
// caller can see the abstract function and the sounding chords side by side:
//
//   I - IV - V7 - I
//   C - F - G7 - C
//
// The key defaults to the run's own key (result.finalState.key), and chords
// are resolved through the MVP catalog unless a resolver is supplied — so the
// common case is zero-config.
// ---------------------------------------------------------------------------

export type ProgressionTextMode = "roman" | "concrete" | "both";

export interface ProgressionTextOptions {
  /** Which representation(s) to emit.  Default: "both". */
  readonly mode?: ProgressionTextMode;

  /**
   * Key used for concrete rendering.  Defaults to the run's own key
   * (`result.finalState.key`).  Ignored in "roman" mode.
   */
  readonly key?: MusicalKey;

  /**
   * Resolves chord ids to Chord definitions for concrete rendering.
   * Defaults to the MVP major-key catalog.  Ignored in "roman" mode.
   */
  readonly resolver?: ChordResolver;
}

export interface ProgressionTextRendererDeps {
  readonly roman?: RomanNumeralRenderer;
  readonly concrete?: ConcreteChordRenderer;
  /** Separator between chords on a line.  Default: " - ". */
  readonly separator?: string;
}

const DEFAULT_SEPARATOR = " - ";

/**
 * Renders a progression as plain text, optionally pairing Roman numerals with
 * concrete chord symbols.  Pure and stateless.
 */
export class ProgressionTextRenderer {
  private readonly roman: RomanNumeralRenderer;
  private readonly concrete: ConcreteChordRenderer;
  private readonly separator: string;

  constructor(deps: ProgressionTextRendererDeps = {}) {
    this.separator = deps.separator ?? DEFAULT_SEPARATOR;
    this.roman = deps.roman ?? new RomanNumeralRenderer({ separator: this.separator });
    this.concrete = deps.concrete ?? new ConcreteChordRenderer();
  }

  /**
   * Renders a finished generation run.
   *
   * In "both" mode the result is two lines: Roman numerals then concrete
   * chords.  In "roman"/"concrete" mode it is a single line.
   */
  render(result: GenerationResult, options: ProgressionTextOptions = {}): string {
    const key = options.key ?? result.finalState.key;
    // Prepend the starting chord so the displayed progression begins on the
    // requested initialChord, not on the first transition target.
    return this.renderSequence([result.initialChord, ...result.chords], {
      ...options,
      key,
    });
  }

  /** Renders an explicit chord sequence (used by render and reusable directly). */
  renderSequence(chords: readonly ChordId[], options: ProgressionTextOptions = {}): string {
    const mode = options.mode ?? "both";

    const romanLine = this.roman.renderSequence(chords);
    if (mode === "roman") return romanLine;

    const key = options.key ?? "C";
    const resolver = options.resolver ?? defaultMvpResolver();
    const concreteLine = this.concrete.renderSequence(chords, key, resolver).join(this.separator);

    if (mode === "concrete") return concreteLine;
    return `${romanLine}\n${concreteLine}`;
  }
}
