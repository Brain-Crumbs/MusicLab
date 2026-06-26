import { describe, it, expect } from "vitest";
import { MajorKeyTopologyBuilder } from "../../src/core/topology/MajorKeyTopologyBuilder.js";
import { TopologyGraphDataBuilder } from "../../src/visualizations/data/TopologyGraphDataBuilder.js";
import { MermaidGraphAdapter } from "../../src/visualizations/adapters/MermaidGraphAdapter.js";

/**
 * A10.7 — Mermaid topology snapshot test.
 *
 * The topology is built deterministically and the Mermaid adapter is a pure
 * serialisation of it, so the emitted flowchart source is fixed.  The snapshot
 * pins that source; a diff means the chord catalog, the edge set, or the Mermaid
 * formatting changed.
 *
 * Structural validity is enforced by a grammar-based checker that validates
 * node declarations, edge syntax, and cross-references without requiring a
 * browser-based Mermaid render engine.  A full Mermaid parse is available
 * via `npm run test:visual` (see package.json).
 */

// ---------------------------------------------------------------------------
// Structural Mermaid validator (grammar-level, no browser required)
// ---------------------------------------------------------------------------

interface MermaidCheckResult {
  valid: boolean;
  errors: string[];
}

function validateMermaidFlowchart(source: string): MermaidCheckResult {
  const errors: string[] = [];
  const lines = source.split("\n");

  const header = lines[0] ?? "";
  if (!/^flowchart\s+(LR|RL|TB|TD|BT)$/.test(header.trim())) {
    errors.push(`Invalid flowchart header: "${header}"`);
  }

  const nodePattern = /^\s{4}(n\d+)\["[^"]*"\](:::[\w-]+)?$/;
  const edgeWithLabel = /^\s{4}n\d+\s*-->\|"[^"]*"\|\s*n\d+$/;
  const edgeNoLabel = /^\s{4}n\d+\s*-->\s*n\d+$/;
  const classDefPattern = /^\s{4}classDef\s+\w+\s+/;
  const linkStylePattern = /^\s{4}linkStyle\s+[\d,]+\s+/;

  const declaredNodes = new Set<string>();
  const referencedNodes = new Set<string>();

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i] ?? "";
    if (line.trim() === "") continue;

    const nodeMatch = line.match(nodePattern);
    if (nodeMatch) {
      declaredNodes.add(nodeMatch[1]!);
      continue;
    }

    const edgeIds = line.match(/n\d+/g);
    if (
      edgeWithLabel.test(line) ||
      edgeNoLabel.test(line) ||
      classDefPattern.test(line) ||
      linkStylePattern.test(line)
    ) {
      if (edgeIds) edgeIds.forEach((id) => referencedNodes.add(id));
      continue;
    }

    errors.push(`Line ${i + 1}: unrecognised Mermaid syntax: "${line.trimEnd()}"`);
  }

  for (const ref of referencedNodes) {
    if (!declaredNodes.has(ref)) {
      errors.push(`Edge references undeclared node: "${ref}"`);
    }
  }

  return { valid: errors.length === 0, errors };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("A10.7 — Mermaid topology snapshot", () => {
  const topology = new MajorKeyTopologyBuilder().build();
  const graph = new TopologyGraphDataBuilder().build(topology);
  const mermaid = new MermaidGraphAdapter().render(graph);

  it("matches the serialised Mermaid flowchart", () => {
    expect(mermaid).toMatchSnapshot();
  });

  // ---------------------------------------------------------------------------
  // Structural validity — grammar-level check, not a mere string heuristic.
  // ---------------------------------------------------------------------------

  it("passes the structural Mermaid flowchart validator", () => {
    const check = validateMermaidFlowchart(mermaid);
    expect(check.errors).toEqual([]);
    expect(check.valid).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // Invariants — independent of the snapshot.
  // ---------------------------------------------------------------------------

  it("opens with a flowchart header in the default LR direction", () => {
    expect(mermaid.startsWith("flowchart LR")).toBe(true);
  });

  it("declares one node line per chord", () => {
    const nodeLines = mermaid.split("\n").filter((l) => /^ {4}n\d+\["/.test(l));
    expect(nodeLines).toHaveLength(graph.nodes.length);
  });

  it("emits one edge line per topology edge", () => {
    const edgeLines = mermaid.split("\n").filter((l) => l.includes("-->"));
    expect(edgeLines).toHaveLength(graph.edges.length);
  });

  it("respects the direction option", () => {
    const tb = new MermaidGraphAdapter().render(graph, { direction: "TB" });
    expect(tb.startsWith("flowchart TB")).toBe(true);
    expect(validateMermaidFlowchart(tb).valid).toBe(true);
  });

  it("omits edge labels when showEdgeLabels is false", () => {
    const plain = new MermaidGraphAdapter().render(graph, {
      showEdgeLabels: false,
    });
    expect(plain.includes("-->|")).toBe(false);
    expect(validateMermaidFlowchart(plain).valid).toBe(true);
  });
});
