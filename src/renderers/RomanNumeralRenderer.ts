import type { ChordId } from "../core/model/ChordId.js";
import type { GenerationResult } from "../core/generator/GenerationResult.js";
import type { GenerationTrace } from "../core/model/GenerationTrace.js";

// ---------------------------------------------------------------------------
// R8.1 — Roman numeral renderer
//
// The simplest, most faithful view of a generation run: the chord ids exactly
// as the engine chose them, in order.  It performs no transposition and no
// re-spelling — a ChordId *is* the Roman numeral ("I", "V7", "bVII", "vii°").
//
// This renderer is the base layer the other text renderers build on:
// ProgressionTextRenderer (R8.3) pairs it with concrete chords, and
// LeadSheetRenderer (R8.4) lays its symbols out on a bar grid.
// ---------------------------------------------------------------------------

export interface RomanNumeralRenderOptions {
  /** Text placed between successive chords.  Default: " - ". */
  readonly separator?: string;
}

const DEFAULT_SEPARATOR = " - ";

/**
 * Renders a progression as a flat string of Roman numerals.
 *
 *   new RomanNumeralRenderer().render(result)  // "I - IV - V7 - I"
 *
 * Pure and stateless: rendering the same input always yields the same string.
 */
export class RomanNumeralRenderer {
  private readonly separator: string;

  constructor(options: RomanNumeralRenderOptions = {}) {
    this.separator = options.separator ?? DEFAULT_SEPARATOR;
  }

  /**
   * Renders the full progression of a finished run: the starting chord followed
   * by every chosen transition target.  Prepending `initialChord` means a
   * request for N steps shows the starting chord plus N moves, so `--initial I`
   * actually begins on `I` rather than on the first transition.
   */
  render(result: GenerationResult): string {
    return this.renderSequence([result.initialChord, ...result.chords]);
  }

  /** Renders a trace's progression (same output as {@link render}). */
  renderTrace(trace: GenerationTrace): string {
    const chords =
      trace.initialChord !== undefined
        ? [trace.initialChord, ...trace.chordSequence]
        : trace.chordSequence;
    return this.renderSequence(chords);
  }

  /** Renders an explicit list of chord ids. */
  renderSequence(chords: readonly ChordId[]): string {
    return chords.join(this.separator);
  }
}
