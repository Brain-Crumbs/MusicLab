import { describe, it, expect } from "vitest";
import { MermaidTrajectoryAdapter } from "../../../src/visualizations/adapters/MermaidTrajectoryAdapter.js";
import { TrajectoryGraphDataBuilder } from "../../../src/visualizations/data/TrajectoryGraphDataBuilder.js";
import { createDefaultMvpGenerator } from "../../../src/core/generator/createDefaultMvpGenerator.js";
import { chordId } from "../../../src/core/model/ChordId.js";
import type { TrajectoryGraphData } from "../../../src/visualizations/data/TrajectoryGraphDataBuilder.js";

// ---------------------------------------------------------------------------
// Structural Mermaid validator
//
// Validates emitted flowchart source against Mermaid grammar rules without
// running a browser-based render engine.  A full parse-level check is
// available via the `test:visual` script (see package.json).
// ---------------------------------------------------------------------------

interface MermaidCheckResult {
  valid: boolean;
  errors: string[];
}

function validateMermaidFlowchart(source: string): MermaidCheckResult {
  const errors: string[] = [];
  const lines = source.split("\n");

  // First non-empty line must be a flowchart declaration
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

    // Extract node ids from edge lines to validate references
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

    errors.push(`Line ${i + 1}: unrecognised syntax: "${line.trimEnd()}"`);
  }

  // Every node referenced in an edge must have been declared
  for (const ref of referencedNodes) {
    if (!declaredNodes.has(ref)) {
      errors.push(`Edge references undeclared node: "${ref}"`);
    }
  }

  return { valid: errors.length === 0, errors };
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const SEED = 4242;
const result = createDefaultMvpGenerator({ seed: SEED }).generate({
  steps: 8,
  initialChord: chordId("I"),
});

const builder = new TrajectoryGraphDataBuilder();
const adapter = new MermaidTrajectoryAdapter();
const trajectoryGraph = builder.build(result.trace);
const mermaid = adapter.render(trajectoryGraph);

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("MermaidTrajectoryAdapter — snapshot", () => {
  it("matches the trajectory Mermaid snapshot", () => {
    expect(mermaid).toMatchSnapshot();
  });
});

describe("MermaidTrajectoryAdapter — structural validity", () => {
  it("passes the structural Mermaid validator", () => {
    const check = validateMermaidFlowchart(mermaid);
    expect(check.errors).toEqual([]);
    expect(check.valid).toBe(true);
  });

  it("opens with a flowchart header", () => {
    expect(mermaid.startsWith("flowchart ")).toBe(true);
  });

  it("declares one node line per distinct visited chord", () => {
    const nodeLines = mermaid.split("\n").filter((l) => /^ {4}n\d+\["/.test(l));
    expect(nodeLines).toHaveLength(trajectoryGraph.nodes.length);
  });

  it("emits one edge line per generation step", () => {
    const edgeLines = mermaid.split("\n").filter((l) => l.includes("-->"));
    expect(edgeLines).toHaveLength(trajectoryGraph.edges.length);
  });
});

describe("MermaidTrajectoryAdapter — start-node highlighting", () => {
  it("annotates the start node with :::start by default", () => {
    expect(mermaid).toContain(":::start");
  });

  it("emits a classDef for the start style when a start node exists", () => {
    expect(mermaid).toContain("classDef start");
  });

  it("omits :::start when highlightStart is false", () => {
    const plain = adapter.render(trajectoryGraph, { highlightStart: false });
    expect(plain).not.toContain(":::start");
  });
});

describe("MermaidTrajectoryAdapter — edge labels", () => {
  it("includes step indices in edge labels by default", () => {
    // Step 0 always exists → its label "0" appears on an edge
    expect(mermaid).toMatch(/-->\|"0"\|/);
  });

  it("omits step indices when showStepIndices is false", () => {
    const plain = adapter.render(trajectoryGraph, {
      showStepIndices: false,
      showMotion: false,
    });
    const edgeLines = plain.split("\n").filter((l) => l.includes("-->"));
    // All edges should have no labels (bare --> n)
    for (const line of edgeLines) {
      expect(line).not.toContain("-->|");
    }
  });

  it("includes functional motion when showMotion is true", () => {
    const withMotion = adapter.render(trajectoryGraph, {
      showStepIndices: false,
      showMotion: true,
    });
    // Any edge label should be present (motion string is non-empty)
    expect(withMotion).toContain("-->|");
  });
});

describe("MermaidTrajectoryAdapter — surprise highlighting", () => {
  it("emits linkStyle for surprising edges when highlightSurprises is true (default)", () => {
    // Determine whether any surprising moves exist
    const hasSurprise = trajectoryGraph.edges.some((e) => e.data?.wasModalChoice === false);
    if (hasSurprise) {
      expect(mermaid).toContain("linkStyle");
    }
  });

  it("omits linkStyle when highlightSurprises is false", () => {
    const plain = adapter.render(trajectoryGraph, { highlightSurprises: false });
    expect(plain).not.toContain("linkStyle");
  });
});

describe("MermaidTrajectoryAdapter — direction option", () => {
  it("respects the TB direction option", () => {
    const tb = adapter.render(trajectoryGraph, { direction: "TB" });
    expect(tb.startsWith("flowchart TB")).toBe(true);
  });

  it("defaults to LR", () => {
    expect(mermaid.startsWith("flowchart LR")).toBe(true);
  });
});

describe("MermaidTrajectoryAdapter — empty trace", () => {
  const emptyGraph: TrajectoryGraphData = { nodes: [], edges: [], directed: true };

  it("produces valid Mermaid for an empty trajectory", () => {
    const emptyMermaid = adapter.render(emptyGraph);
    const check = validateMermaidFlowchart(emptyMermaid);
    expect(check.valid).toBe(true);
  });

  it("has no node or edge lines for an empty trajectory", () => {
    const emptyMermaid = adapter.render(emptyGraph);
    const nodeLines = emptyMermaid.split("\n").filter((l) => /^ {4}n\d+\["/.test(l));
    const edgeLines = emptyMermaid.split("\n").filter((l) => l.includes("-->"));
    expect(nodeLines).toHaveLength(0);
    expect(edgeLines).toHaveLength(0);
  });
});
