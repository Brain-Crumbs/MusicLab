import type { TensionTimelineDatum } from "../data/TensionTimelineDataBuilder.js";

// ---------------------------------------------------------------------------
// A10.4 — SVG tension timeline renderer
//
// Renders the tension-timeline rows (V9.5) as a standalone SVG line chart: the
// phrase's *target* tension (dashed) against the run's *actual* tension (solid)
// across the generation steps.  This is the visual answer to "is the resolution
// pump working?" — where the two lines diverge, the engine ran hot or cold of
// the phrase intent.
//
// Self-contained string output — no DOM, no React, no charting library — and
// fully deterministic for a given input, so it snapshots cleanly (A10.8).
//
// Tension is treated as a [0, 1] quantity and clamped to that band for the y
// axis; x is the step index, evenly spaced across the plot.
// ---------------------------------------------------------------------------

export interface SvgTensionTimelineOptions {
  /** Canvas width.  Default 640. */
  readonly width?: number;
  /** Canvas height.  Default 320. */
  readonly height?: number;
}

const DEFAULTS = {
  width: 640,
  height: 320,
} as const;

/** Plot margins leaving room for axis ticks/labels. */
const MARGIN = { top: 24, right: 24, bottom: 40, left: 48 } as const;

const TARGET_COLOR = "#3b82f6";
const ACTUAL_COLOR = "#ef4444";

/**
 * Renders a tension timeline as an SVG line chart.  Stateless and pure.
 */
export class SvgTensionTimelineRenderer {
  render(data: readonly TensionTimelineDatum[], options: SvgTensionTimelineOptions = {}): string {
    const width = options.width ?? DEFAULTS.width;
    const height = options.height ?? DEFAULTS.height;

    const open = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`;

    if (data.length === 0) {
      return [
        open,
        `  <text x="${round(width / 2)}" y="${round(height / 2)}" font-family="sans-serif" font-size="14" text-anchor="middle" fill="#64748b">no data</text>`,
        `</svg>`,
      ].join("\n");
    }

    const plotW = width - MARGIN.left - MARGIN.right;
    const plotH = height - MARGIN.top - MARGIN.bottom;
    const n = data.length;

    const xFor = (i: number): number =>
      round(MARGIN.left + (n <= 1 ? plotW / 2 : (i / (n - 1)) * plotW));
    const yFor = (tension: number): number => round(MARGIN.top + (1 - clamp01(tension)) * plotH);

    const targetPoints = data.map((d, i) => `${xFor(i)},${yFor(d.targetTension)}`);
    const actualPoints = data.map((d, i) => `${xFor(i)},${yFor(d.actualTension)}`);

    return [
      open,
      axes(width, height, plotH),
      `  <polyline fill="none" stroke="${TARGET_COLOR}" stroke-width="2" stroke-dasharray="6 4" points="${targetPoints.join(" ")}" />`,
      `  <polyline fill="none" stroke="${ACTUAL_COLOR}" stroke-width="2" points="${actualPoints.join(" ")}" />`,
      markers(data, xFor, yFor),
      legend(width),
      `</svg>`,
    ].join("\n");
  }
}

// ---------------------------------------------------------------------------
// Markup helpers (module-private)
// ---------------------------------------------------------------------------

/** x/y axis lines plus 0.0 / 0.5 / 1.0 tension gridlines and labels. */
function axes(width: number, height: number, plotH: number): string {
  const left = MARGIN.left;
  const right = width - MARGIN.right;
  const bottom = height - MARGIN.bottom;

  const grid = [0, 0.5, 1].map((t) => {
    const y = round(MARGIN.top + (1 - t) * plotH);
    return [
      `    <line x1="${left}" y1="${y}" x2="${right}" y2="${y}" stroke="#e2e8f0" stroke-width="1" />`,
      `    <text x="${left - 8}" y="${round(y + 4)}" text-anchor="end" fill="#64748b">${t.toFixed(1)}</text>`,
    ].join("\n");
  });

  return [
    `  <g class="axes" font-family="sans-serif" font-size="11">`,
    ...grid,
    `    <line x1="${left}" y1="${MARGIN.top}" x2="${left}" y2="${bottom}" stroke="#94a3b8" stroke-width="1" />`,
    `    <line x1="${left}" y1="${bottom}" x2="${right}" y2="${bottom}" stroke="#94a3b8" stroke-width="1" />`,
    `  </g>`,
  ].join("\n");
}

/** Step markers: a circle on each line, plus the step index along the x axis. */
function markers(
  data: readonly TensionTimelineDatum[],
  xFor: (i: number) => number,
  yFor: (tension: number) => number,
): string {
  const rows = data.map((d, i) => {
    const x = xFor(i);
    return [
      `    <circle cx="${x}" cy="${yFor(d.targetTension)}" r="3" fill="${TARGET_COLOR}" />`,
      `    <circle cx="${x}" cy="${yFor(d.actualTension)}" r="3" fill="${ACTUAL_COLOR}" />`,
      `    <text x="${x}" y="${round(yFor(0) + 16)}" text-anchor="middle" font-family="sans-serif" font-size="11" fill="#64748b">${d.stepIndex}</text>`,
    ].join("\n");
  });
  return [`  <g class="markers">`, ...rows, `  </g>`].join("\n");
}

/** A small two-entry legend in the top-right of the plot. */
function legend(width: number): string {
  const x = width - MARGIN.right - 120;
  const swatch = x;
  const text = x + 18;
  return [
    `  <g class="legend" font-family="sans-serif" font-size="11" fill="#334155">`,
    `    <line x1="${swatch}" y1="8" x2="${swatch + 14}" y2="8" stroke="${TARGET_COLOR}" stroke-width="2" stroke-dasharray="6 4" />`,
    `    <text x="${text}" y="11">target</text>`,
    `    <line x1="${swatch + 60}" y1="8" x2="${swatch + 74}" y2="8" stroke="${ACTUAL_COLOR}" stroke-width="2" />`,
    `    <text x="${text + 60}" y="11">actual</text>`,
    `  </g>`,
  ].join("\n");
}

/** Clamps a tension value to the [0, 1] plotting band. */
function clamp01(value: number): number {
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

/** Rounds to 2 dp, normalising -0 to 0. */
function round(value: number): number {
  const r = Number(value.toFixed(2));
  return r === 0 ? 0 : r;
}
