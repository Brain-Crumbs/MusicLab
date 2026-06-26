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

  /** Renders the chord sequence of a finished generation run. */
  render(result: GenerationResult): string {
    return this.renderSequence(result.chords);
  }

  /** Renders a trace's chord sequence (same output as {@link render}). */
  renderTrace(trace: GenerationTrace): string {
    return this.renderSequence(trace.chordSequence);
  }

  /** Renders an explicit list of chord ids. */
  renderSequence(chords: readonly ChordId[]): string {
    return chords.join(this.separator);
  }
}
