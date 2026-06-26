import { describe, it, expect } from "vitest";
import { TrajectoryGraphDataBuilder } from "../../../src/visualizations/data/TrajectoryGraphDataBuilder.js";
import { createDefaultMvpGenerator } from "../../../src/core/generator/createDefaultMvpGenerator.js";
import { chordId } from "../../../src/core/model/ChordId.js";
import type { GenerationTrace } from "../../../src/core/model/GenerationTrace.js";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const SEED = 4242;
const result = createDefaultMvpGenerator({ seed: SEED }).generate({
  steps: 8,
  initialChord: chordId("I"),
});

const builder = new TrajectoryGraphDataBuilder();
const trajectoryGraph = builder.build(result.trace);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function emptyTrace(): GenerationTrace {
  return { steps: [] };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("TrajectoryGraphDataBuilder — snapshot", () => {
  it("matches the trajectory graph snapshot", () => {
    expect(trajectoryGraph).toMatchSnapshot();
  });
});

describe("TrajectoryGraphDataBuilder — empty trace", () => {
  it("returns an empty graph for an empty trace", () => {
    const empty = builder.build(emptyTrace());
    expect(empty.nodes).toHaveLength(0);
    expect(empty.edges).toHaveLength(0);
    expect(empty.directed).toBe(true);
  });
});

describe("TrajectoryGraphDataBuilder — node invariants", () => {
  it("nodes cover exactly the set of distinct chords visited", () => {
    const steps = result.trace.steps;
    const visitedChords = new Set<string>([
      steps[0]!.previousState.currentChord,
      ...steps.map((s) => s.selectedChord),
    ]);
    const nodeIds = new Set(trajectoryGraph.nodes.map((n) => n.id));
    expect(nodeIds).toEqual(visitedChords);
  });

  it("nodes are ordered by first-visit index", () => {
    const steps = result.trace.steps;
    const firstVisit = new Map<string, number>();
    const path = [steps[0]!.previousState.currentChord, ...steps.map((s) => s.selectedChord)];
    path.forEach((chord, i) => {
      if (!firstVisit.has(chord)) firstVisit.set(chord, i);
    });

    const nodeFirstVisits = trajectoryGraph.nodes.map((n) => firstVisit.get(n.id) ?? Infinity);
    const sorted = [...nodeFirstVisits].sort((a, b) => a - b);
    expect(nodeFirstVisits).toEqual(sorted);
  });

  it("exactly one node has isStart=true", () => {
    const startNodes = trajectoryGraph.nodes.filter((n) => n.data?.isStart === true);
    expect(startNodes).toHaveLength(1);
  });

  it("the start node is the chord the run departed from", () => {
    const startChord = result.trace.steps[0]!.previousState.currentChord;
    const startNode = trajectoryGraph.nodes.find((n) => n.data?.isStart === true);
    expect(startNode?.id).toBe(startChord);
  });

  it("visitCount reflects how many times each chord was occupied", () => {
    const steps = result.trace.steps;
    const path = [steps[0]!.previousState.currentChord, ...steps.map((s) => s.selectedChord)];
    const expectedCount = new Map<string, number>();
    for (const chord of path) {
      expectedCount.set(chord, (expectedCount.get(chord) ?? 0) + 1);
    }
    for (const node of trajectoryGraph.nodes) {
      expect(node.data?.visitCount).toBe(expectedCount.get(node.id));
    }
  });

  it("firstVisitIndex is 0 for the start chord", () => {
    const startNode = trajectoryGraph.nodes.find((n) => n.data?.isStart === true);
    expect(startNode?.data?.firstVisitIndex).toBe(0);
  });
});

describe("TrajectoryGraphDataBuilder — edge invariants", () => {
  it("edge count equals the number of generation steps", () => {
    expect(trajectoryGraph.edges).toHaveLength(result.trace.steps.length);
  });

  it("edges are ordered by step index", () => {
    const stepIndices = trajectoryGraph.edges.map((e) => e.data?.stepIndex ?? -1);
    const sorted = [...stepIndices].sort((a, b) => a - b);
    expect(stepIndices).toEqual(sorted);
  });

  it("each edge carries the correct step index", () => {
    for (let i = 0; i < result.trace.steps.length; i++) {
      expect(trajectoryGraph.edges[i]?.data?.stepIndex).toBe(i);
    }
  });

  it("edge source and target reference declared node ids", () => {
    const nodeIds = new Set(trajectoryGraph.nodes.map((n) => n.id));
    for (const edge of trajectoryGraph.edges) {
      expect(nodeIds.has(edge.source)).toBe(true);
      expect(nodeIds.has(edge.target)).toBe(true);
    }
  });

  it("each edge probability is in [0, 1]", () => {
    for (const edge of trajectoryGraph.edges) {
      const p = edge.data?.probability ?? -1;
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThanOrEqual(1);
    }
  });

  it("edge ids are unique across the trajectory (even for revisited chord pairs)", () => {
    const ids = trajectoryGraph.edges.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("TrajectoryGraphDataBuilder — determinism", () => {
  it("produces identical output for the same trace", () => {
    const a = builder.build(result.trace);
    const b = builder.build(result.trace);
    expect(a).toEqual(b);
  });
});

describe("TrajectoryGraphDataBuilder — directed flag", () => {
  it("marks the graph as directed", () => {
    expect(trajectoryGraph.directed).toBe(true);
  });
});
