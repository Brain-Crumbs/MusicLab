import type { GraphData } from "../data/GraphData.js";
import { circularLayout, type CircularLayoutOptions } from "../layout/CircularLayout.js";

// ---------------------------------------------------------------------------
// A10.5 — React Flow topology adapter
//
// Reshapes a generic GraphData (Wave 9) into the node/edge arrays React Flow
// expects, *without depending on React Flow*.  The shapes below are a structural
// subset of React Flow's `Node` / `Edge` types, so the output can be passed
// straight to a `<ReactFlow nodes={...} edges={...} />` in a consuming app while
// this package stays framework-free.
//
// React Flow needs explicit node positions (it does not lay out for you), so we
// seed them from the deterministic circular layout.  Consumers remain free to
// run their own layout afterwards.  The original Wave 9 payloads are preserved
// under `data.payload` so renderers can colour/size by harmonic metadata.
// ---------------------------------------------------------------------------

/** Node `data` for a React Flow node: the visible label plus the GraphData payload. */
export interface ReactFlowNodeData<TNodeData> {
  readonly label: string;
  readonly payload?: TNodeData;
}

/** A structural subset of React Flow's `Node`. */
export interface ReactFlowNode<TNodeData> {
  readonly id: string;
  readonly position: { readonly x: number; readonly y: number };
  readonly data: ReactFlowNodeData<TNodeData>;
}

/** A structural subset of React Flow's `Edge`. */
export interface ReactFlowEdge<TEdgeData> {
  readonly id: string;
  readonly source: string;
  readonly target: string;
  readonly label?: string;
  readonly data?: TEdgeData;
}

export interface ReactFlowGraph<TNodeData, TEdgeData> {
  readonly nodes: readonly ReactFlowNode<TNodeData>[];
  readonly edges: readonly ReactFlowEdge<TEdgeData>[];
}

export interface ReactFlowTopologyOptions {
  /** Overrides for the seeded circular layout (canvas size, radius, …). */
  readonly layout?: CircularLayoutOptions;
}

/**
 * Adapts {@link GraphData} into React Flow `nodes`/`edges`.  Stateless and pure.
 */
export class ReactFlowTopologyAdapter {
  adapt<TNodeData, TEdgeData>(
    graph: GraphData<TNodeData, TEdgeData>,
    options: ReactFlowTopologyOptions = {},
  ): ReactFlowGraph<TNodeData, TEdgeData> {
    const positions = circularLayout(
      graph.nodes.map((n) => n.id),
      options.layout ?? {},
    );

    const nodes = graph.nodes.map((node): ReactFlowNode<TNodeData> => {
      const p = positions.get(node.id) ?? { x: 0, y: 0 };
      const data: ReactFlowNodeData<TNodeData> =
        node.data === undefined ? { label: node.label } : { label: node.label, payload: node.data };
      return { id: node.id, position: { x: p.x, y: p.y }, data };
    });

    const edges = graph.edges.map((edge): ReactFlowEdge<TEdgeData> => {
      // exactOptionalPropertyTypes: only attach optional props when present.
      return {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        ...(edge.label !== undefined ? { label: edge.label } : {}),
        ...(edge.data !== undefined ? { data: edge.data } : {}),
      };
    });

    return { nodes, edges };
  }
}
