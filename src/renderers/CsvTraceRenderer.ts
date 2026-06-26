import type { GenerationTrace } from "../core/model/GenerationTrace.js";
import type { GenerationResult } from "../core/generator/GenerationResult.js";

// ---------------------------------------------------------------------------
// R8.6 — CSV trace renderer
//
// Flattens a generation trace into CSV for spreadsheets, plotting, and quick
// inspection.  Two granularities are offered:
//
//   renderSteps      — one row per step (the high-level decision summary).
//   renderCandidates — one row per candidate per step (the full field the
//                      generator weighed before sampling).
//
// `render` defaults to the per-step view.  Numbers are rounded for stable,
// readable output; fields are RFC-4180-escaped so chord ids like "vii°" and any
// future commas in explanations stay safe.
// ---------------------------------------------------------------------------

export interface CsvTraceOptions {
  /** Field delimiter.  Default: ",". */
  readonly delimiter?: string;
  /** Emit a header row.  Default: true. */
  readonly header?: boolean;
  /** Decimal places for numeric fields.  Default: 6. */
  readonly precision?: number;
}

const DEFAULT_DELIMITER = ",";
const DEFAULT_PRECISION = 6;

const STEP_HEADER = [
  "stepIndex",
  "fromChord",
  "selectedChord",
  "selectedEdgeId",
  "selectedProbability",
  "totalScore",
  "targetTension",
  "resultingTension",
  "tensionError",
  "surpriseBudgetBefore",
  "surpriseBudgetAfter",
  "cadenceType",
] as const;

const CANDIDATE_HEADER = [
  "stepIndex",
  "edgeId",
  "fromChord",
  "toChord",
  "totalScore",
  "probability",
  "selected",
] as const;

/**
 * Renders a {@link GenerationTrace} to CSV.  Pure and stateless.
 */
export class CsvTraceRenderer {
  /** Renders the trace of a finished run (per-step view) as CSV. */
  render(result: GenerationResult, options: CsvTraceOptions = {}): string {
    return this.renderSteps(result.trace, options);
  }

  /** One row per generation step. */
  renderSteps(trace: GenerationTrace, options: CsvTraceOptions = {}): string {
    const delimiter = options.delimiter ?? DEFAULT_DELIMITER;
    const precision = options.precision ?? DEFAULT_PRECISION;
    const num = (n: number): string => round(n, precision);

    const rows = trace.steps.map((step) => {
      const selectedProbability = step.distribution.getProbability(step.selectedEdge.id);
      const selected = step.candidates.find((c) => c.edge.id === step.selectedEdge.id);
      return [
        String(step.stepIndex),
        step.selectedEdge.from,
        step.selectedChord,
        step.selectedEdge.id,
        num(selectedProbability),
        num(selected?.totalScore ?? 0),
        num(step.targetTension),
        num(step.resultingTension),
        num(Math.abs(step.resultingTension - step.targetTension)),
        num(step.surpriseBudgetBefore),
        num(step.surpriseBudgetAfter),
        step.cadenceState.lastCadenceType ?? "",
      ];
    });

    return this.assemble([...STEP_HEADER], rows, delimiter, options.header ?? true);
  }

  /** One row per candidate per step — the full considered field. */
  renderCandidates(trace: GenerationTrace, options: CsvTraceOptions = {}): string {
    const delimiter = options.delimiter ?? DEFAULT_DELIMITER;
    const precision = options.precision ?? DEFAULT_PRECISION;
    const num = (n: number): string => round(n, precision);

    const rows: string[][] = [];
    for (const step of trace.steps) {
      for (const candidate of step.candidates) {
        rows.push([
          String(step.stepIndex),
          candidate.edge.id,
          candidate.edge.from,
          candidate.edge.to,
          num(candidate.totalScore),
          num(step.distribution.getProbability(candidate.edge.id)),
          String(candidate.edge.id === step.selectedEdge.id),
        ]);
      }
    }

    return this.assemble([...CANDIDATE_HEADER], rows, delimiter, options.header ?? true);
  }

  // -------------------------------------------------------------------------
  // Internals
  // -------------------------------------------------------------------------

  private assemble(
    header: string[],
    rows: string[][],
    delimiter: string,
    includeHeader: boolean,
  ): string {
    const lines = includeHeader ? [header, ...rows] : rows;
    return lines.map((row) => row.map((f) => escapeField(f, delimiter)).join(delimiter)).join("\n");
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Rounds to fixed precision, trimming trailing zeros for compact output. */
function round(value: number, precision: number): string {
  if (!Number.isFinite(value)) return String(value);
  return String(Number(value.toFixed(precision)));
}

/** RFC-4180 field escaping: quote when the field holds a delimiter, quote, CR, or LF. */
function escapeField(field: string, delimiter: string): string {
  if (
    field.includes(delimiter) ||
    field.includes('"') ||
    field.includes("\n") ||
    field.includes("\r")
  ) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}
