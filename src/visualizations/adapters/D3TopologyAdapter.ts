import type { GraphData } from "../data/GraphData.js";

// ---------------------------------------------------------------------------
// A10.6 — D3 topology adapter
//
// Reshapes a generic GraphData (Wave 9) into the `{ nodes, links }` form a
// D3 force simulation (`d3-force`) consumes, *without depending on D3*.  The
// shapes below match what `forceLink`/`forceSimulation` read: links reference
// endpoints by node id (D3 mutates them into node references at runtime), and an
// optional `value` carries the edge weight for link-strength/thickness.
//
// Unlike the React Flow adapter, no positions are emitted: a force layout
// computes `x`/`y` itself and writes them back onto the nodes.  The original
// Wave 9 payloads ride along on each node/link so a consumer can style by
// harmonic metadata.
// ---------------------------------------------------------------------------

/** A node for a D3 force simulation. */
export interface D3Node<TNodeData> {
  readonly id: string;
  readonly label: string;
  readonly payload?: TNodeData;
}

/** A link for a D3 force simulation; endpoints are node ids. */
export interface D3Link<TEdgeData> {
  readonly id: string;
  readonly source: string;
  readonly target: string;
  readonly label?: string;
  /** Edge weight, surfaced for `forceLink` strength / stroke width. */
  readonly value?: number;
  readonly payload?: TEdgeData;
}

export interface D3Graph<TNodeData, TEdgeData> {
  readonly nodes: readonly D3Node<TNodeData>[];
  readonly links: readonly D3Link<TEdgeData>[];
}

/**
 * Adapts {@link GraphData} into D3 `nodes`/`links`.  Stateless and pure.
 */
export class D3TopologyAdapter {
  adapt<TNodeData, TEdgeData>(
    graph: GraphData<TNodeData, TEdgeData>,
  ): D3Graph<TNodeData, TEdgeData> {
    const nodes = graph.nodes.map((node): D3Node<TNodeData> => {
      // exactOptionalPropertyTypes: only attach `payload` when present.
      return {
        id: node.id,
        label: node.label,
        ...(node.data !== undefined ? { payload: node.data } : {}),
      };
    });

    const links = graph.edges.map((edge): D3Link<TEdgeData> => {
      return {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        ...(edge.label !== undefined ? { label: edge.label } : {}),
        ...(edge.weight !== undefined ? { value: edge.weight } : {}),
        ...(edge.data !== undefined ? { payload: edge.data } : {}),
      };
    });

    return { nodes, links };
  }
}
