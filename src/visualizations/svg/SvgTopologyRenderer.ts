import type { GraphData } from "../data/GraphData.js";
import { circularLayout, type Point } from "../layout/CircularLayout.js";

// ---------------------------------------------------------------------------
// A10.3 — SVG topology renderer
//
// Renders a generic GraphData (Wave 9) as a standalone SVG document of the
// harmonic chord-space: nodes laid out on a circle, directed edges drawn as
// arrows between them.  The output is a self-contained string a caller can write
// to a `.svg` file or inline in HTML — no DOM, no React, no SVG library.
//
// Layout is the deterministic circular arrangement (shared CircularLayout), so
// the same graph always produces the same SVG.  Edges are shortened at both ends
// so the arrowhead meets the target node's rim instead of disappearing under it.
// ---------------------------------------------------------------------------

export interface SvgTopologyOptions {
  /** Canvas width.  Default 800. */
  readonly width?: number;
  /** Canvas height.  Default 600. */
  readonly height?: number;
  /** Node circle radius.  Default 24. */
  readonly nodeRadius?: number;
  /** Inset of the node ring from the canvas edges.  Default 70. */
  readonly padding?: number;
  /** Label font size in px.  Default 14. */
  readonly fontSize?: number;
}

const DEFAULTS = {
  width: 800,
  height: 600,
  nodeRadius: 24,
  padding: 70,
  fontSize: 14,
} as const;

/** Gap (px) between an arrowhead and the target node rim. */
const ARROW_GAP = 4;

/**
 * Renders {@link GraphData} as an SVG topology diagram.  Stateless and pure.
 */
export class SvgTopologyRenderer {
  render<TNodeData, TEdgeData>(
    graph: GraphData<TNodeData, TEdgeData>,
    options: SvgTopologyOptions = {},
  ): string {
    const width = options.width ?? DEFAULTS.width;
    const height = options.height ?? DEFAULTS.height;
    const nodeRadius = options.nodeRadius ?? DEFAULTS.nodeRadius;
    const padding = options.padding ?? DEFAULTS.padding;
    const fontSize = options.fontSize ?? DEFAULTS.fontSize;

    const positions = circularLayout(
      graph.nodes.map((n) => n.id),
      { width, height, padding },
    );

    const edgeMarkup = graph.edges
      .map((edge) => {
        const from = positions.get(edge.source);
        const to = positions.get(edge.target);
        if (from === undefined || to === undefined) return "";
        return edgeLine(from, to, nodeRadius);
      })
      .filter((s) => s !== "")
      .join("\n");

    const nodeMarkup = graph.nodes
      .map((node) => {
        const p = positions.get(node.id);
        if (p === undefined) return "";
        return nodeGroup(p, node.label, nodeRadius, fontSize);
      })
      .filter((s) => s !== "")
      .join("\n");

    return [
      `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
      defs(),
      `  <g class="edges" fill="none" stroke="#94a3b8" stroke-width="1.5">`,
      indent(edgeMarkup, 4),
      `  </g>`,
      `  <g class="nodes" font-family="sans-serif" font-size="${fontSize}" text-anchor="middle">`,
      indent(nodeMarkup, 4),
      `  </g>`,
      `</svg>`,
    ].join("\n");
  }
}

// ---------------------------------------------------------------------------
// Markup helpers (module-private)
// ---------------------------------------------------------------------------

function defs(): string {
  return [
    `  <defs>`,
    `    <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">`,
    `      <path d="M 0 0 L 10 5 L 0 10 z" fill="#94a3b8" />`,
    `    </marker>`,
    `  </defs>`,
  ].join("\n");
}

/** A directed edge, trimmed to start/end at the node rims with an arrowhead. */
function edgeLine(from: Point, to: Point, nodeRadius: number): string {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy);
  // Degenerate (self-loop / coincident): nothing sensible to draw.
  if (len === 0) return "";

  const ux = dx / len;
  const uy = dy / len;
  const x1 = round(from.x + ux * nodeRadius);
  const y1 = round(from.y + uy * nodeRadius);
  const x2 = round(to.x - ux * (nodeRadius + ARROW_GAP));
  const y2 = round(to.y - uy * (nodeRadius + ARROW_GAP));

  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" marker-end="url(#arrow)" />`;
}

function nodeGroup(p: Point, label: string, nodeRadius: number, fontSize: number): string {
  // Nudge the text baseline so the label sits visually centred in the circle.
  const textY = round(p.y + fontSize / 3);
  return [
    `<g>`,
    `  <circle cx="${p.x}" cy="${p.y}" r="${nodeRadius}" fill="#f1f5f9" stroke="#475569" stroke-width="1.5" />`,
    `  <text x="${p.x}" y="${textY}" fill="#0f172a">${escapeXml(label)}</text>`,
    `</g>`,
  ].join("\n");
}

/** Escapes the five XML special characters for safe text/attribute content. */
function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Rounds to 2 dp, normalising -0 to 0. */
function round(value: number): number {
  const r = Number(value.toFixed(2));
  return r === 0 ? 0 : r;
}

/** Indents every non-empty line of `block` by `spaces`. */
function indent(block: string, spaces: number): string {
  if (block === "") return "";
  const pad = " ".repeat(spaces);
  return block
    .split("\n")
    .map((line) => (line === "" ? line : pad + line))
    .join("\n");
}
