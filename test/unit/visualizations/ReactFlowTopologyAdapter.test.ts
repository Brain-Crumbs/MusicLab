import { describe, it, expect } from "vitest";
import { ReactFlowTopologyAdapter } from "../../../src/visualizations/adapters/ReactFlowTopologyAdapter.js";
import { TopologyGraphDataBuilder } from "../../../src/visualizations/data/TopologyGraphDataBuilder.js";
import { MajorKeyTopologyBuilder } from "../../../src/core/topology/MajorKeyTopologyBuilder.js";
import type { GraphData } from "../../../src/visualizations/data/GraphData.js";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const topology = new MajorKeyTopologyBuilder().build();
const graph = new TopologyGraphDataBuilder().build(topology);
const adapter = new ReactFlowTopologyAdapter();
const rfGraph = adapter.adapt(graph);

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ReactFlowTopologyAdapter — snapshot", () => {
  it("matches the React Flow graph snapshot", () => {
    expect(rfGraph).toMatchSnapshot();
  });
});

describe("ReactFlowTopologyAdapter — node structure", () => {
  it("emits one React Flow node per graph node", () => {
    expect(rfGraph.nodes).toHaveLength(graph.nodes.length);
  });

  it("every node has a string id matching the chord id", () => {
    const graphIds = new Set(graph.nodes.map((n) => n.id));
    for (const node of rfGraph.nodes) {
      expect(graphIds.has(node.id)).toBe(true);
    }
  });

  it("every node has numeric x and y position coordinates", () => {
    for (const node of rfGraph.nodes) {
      expect(typeof node.position.x).toBe("number");
      expect(typeof node.position.y).toBe("number");
      expect(Number.isFinite(node.position.x)).toBe(true);
      expect(Number.isFinite(node.position.y)).toBe(true);
    }
  });

  it("nodes have distinct positions (layout is non-degenerate)", () => {
    const positions = rfGraph.nodes.map((n) => `${n.position.x},${n.position.y}`);
    expect(new Set(positions).size).toBe(rfGraph.nodes.length);
  });

  it("node data includes the label from the source graph", () => {
    for (const rfNode of rfGraph.nodes) {
      const srcNode = graph.nodes.find((n) => n.id === rfNode.id)!;
      expect(rfNode.data.label).toBe(srcNode.label);
    }
  });

  it("node data exposes the source payload when present", () => {
    for (const rfNode of rfGraph.nodes) {
      const srcNode = graph.nodes.find((n) => n.id === rfNode.id)!;
      if (srcNode.data !== undefined) {
        expect(rfNode.data.payload).toEqual(srcNode.data);
      }
    }
  });
});

describe("ReactFlowTopologyAdapter — edge structure", () => {
  it("emits one React Flow edge per graph edge", () => {
    expect(rfGraph.edges).toHaveLength(graph.edges.length);
  });

  it("every edge id matches the source edge id", () => {
    const srcIds = new Set(graph.edges.map((e) => e.id));
    for (const rfEdge of rfGraph.edges) {
      expect(srcIds.has(rfEdge.id)).toBe(true);
    }
  });

  it("edge source and target reference declared node ids", () => {
    const nodeIds = new Set(rfGraph.nodes.map((n) => n.id));
    for (const rfEdge of rfGraph.edges) {
      expect(nodeIds.has(rfEdge.source)).toBe(true);
      expect(nodeIds.has(rfEdge.target)).toBe(true);
    }
  });

  it("edge label is preserved from the source edge when present", () => {
    for (const rfEdge of rfGraph.edges) {
      const srcEdge = graph.edges.find((e) => e.id === rfEdge.id)!;
      if (srcEdge.label !== undefined) {
        expect(rfEdge.label).toBe(srcEdge.label);
      }
    }
  });

  it("edge data is preserved from the source edge when present", () => {
    for (const rfEdge of rfGraph.edges) {
      const srcEdge = graph.edges.find((e) => e.id === rfEdge.id)!;
      if (srcEdge.data !== undefined) {
        expect(rfEdge.data).toEqual(srcEdge.data);
      }
    }
  });
});

describe("ReactFlowTopologyAdapter — options", () => {
  it("layout option is forwarded to circularLayout (changes node positions)", () => {
    const smallCanvas = adapter.adapt(graph, { layout: { width: 400, height: 400 } });
    const defaultCanvas = adapter.adapt(graph);
    // Positions must differ because the canvas size changed
    const small = smallCanvas.nodes[0]!.position;
    const def = defaultCanvas.nodes[0]!.position;
    expect(small.x).not.toBe(def.x);
  });

  it("is deterministic for the same options", () => {
    const a = adapter.adapt(graph);
    const b = adapter.adapt(graph);
    expect(a).toEqual(b);
  });
});

describe("ReactFlowTopologyAdapter — empty graph", () => {
  const emptyGraph: GraphData = { nodes: [], edges: [], directed: true };

  it("returns empty arrays for an empty graph", () => {
    const rfEmpty = adapter.adapt(emptyGraph);
    expect(rfEmpty.nodes).toHaveLength(0);
    expect(rfEmpty.edges).toHaveLength(0);
  });
});
