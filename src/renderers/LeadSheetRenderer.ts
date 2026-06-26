import type { MusicalKey } from "../core/model/MusicalState.js";
import type { GenerationResult } from "../core/generator/GenerationResult.js";
import {
  ConcreteChordRenderer,
  defaultMvpResolver,
  type ChordResolver,
} from "./ConcreteChordRenderer.js";

// ---------------------------------------------------------------------------
// R8.4 — Lead sheet renderer
//
// Lays the progression out as a bar grid, one chord per bar:
//
//   | I    | IV   | V7   | I    |
//   | vi   | ii   | V7   | I    |
//
// Bars are wrapped into lines by phrase length (so each line is a phrase by
// default).  Cells are padded to a uniform width for clean column alignment,
// making the output stable enough to snapshot.  Roman numerals are the default;
// pass `concrete: true` to render sounding chords in the run's key instead.
// ---------------------------------------------------------------------------

export interface LeadSheetOptions {
  /**
   * Bars per line.  Defaults to the run's phrase length
   * (`result.finalState.phraseLength`), falling back to 4.
   */
  readonly barsPerLine?: number;

  /** Render concrete chord symbols instead of Roman numerals.  Default: false. */
  readonly concrete?: boolean;

  /**
   * Key for concrete rendering.  Defaults to the run's own key.
   * Ignored unless `concrete` is true.
   */
  readonly key?: MusicalKey;

  /** Resolver for concrete rendering.  Defaults to the MVP catalog. */
  readonly resolver?: ChordResolver;
}

const FALLBACK_BARS_PER_LINE = 4;

/**
 * Renders a progression as an aligned lead-sheet bar grid.  Pure and stateless.
 */
export class LeadSheetRenderer {
  private readonly concrete: ConcreteChordRenderer;

  constructor(deps: { readonly concrete?: ConcreteChordRenderer } = {}) {
    this.concrete = deps.concrete ?? new ConcreteChordRenderer();
  }

  /** Renders a finished generation run as a lead-sheet string. */
  render(result: GenerationResult, options: LeadSheetOptions = {}): string {
    const symbols = this.symbolsFor(result, options);
    const barsPerLine = this.resolveBarsPerLine(result, options);
    return this.layout(symbols, barsPerLine);
  }

  // -------------------------------------------------------------------------
  // Internals
  // -------------------------------------------------------------------------

  /** Produces the per-bar symbols (Roman or concrete) for the run. */
  private symbolsFor(result: GenerationResult, options: LeadSheetOptions): string[] {
    if (!options.concrete) {
      return [...result.chords];
    }
    const key = options.key ?? result.finalState.key;
    const resolver = options.resolver ?? defaultMvpResolver();
    return this.concrete.renderSequence(result.chords, key, resolver);
  }

  private resolveBarsPerLine(result: GenerationResult, options: LeadSheetOptions): number {
    if (options.barsPerLine !== undefined && options.barsPerLine > 0) {
      return options.barsPerLine;
    }
    const phraseLength = result.finalState.phraseLength;
    return phraseLength > 0 ? phraseLength : FALLBACK_BARS_PER_LINE;
  }

  /** Arranges padded cells into pipe-delimited rows. */
  private layout(symbols: readonly string[], barsPerLine: number): string {
    if (symbols.length === 0) return "";

    const cellWidth = Math.max(...symbols.map((s) => s.length));
    const lines: string[] = [];

    for (let i = 0; i < symbols.length; i += barsPerLine) {
      const row = symbols.slice(i, i + barsPerLine);
      const cells = row.map((s) => ` ${s.padEnd(cellWidth)} `);
      lines.push(`|${cells.join("|")}|`);
    }

    return lines.join("\n");
  }
}
