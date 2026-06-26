// ---------------------------------------------------------------------------
// V9.1 — Generic graph data model
//
// A minimal, framework-free description of a directed (or undirected) graph:
// nodes, edges, and optional typed payloads.  It is the common contract every
// Wave 9 graph builder emits, so the Wave 10 renderers (Mermaid, SVG, React
// Flow, D3) can consume one shape instead of N bespoke ones.
//
// Deliberately knows nothing about music: a node is an id + label + payload,
// an edge is a pair of node ids + payload.  All harmonic meaning lives in the
// generic `TNodeData` / `TEdgeData` type parameters supplied by each builder.
// ---------------------------------------------------------------------------

/**
 * A node in a {@link GraphData}.
 *
 * `id` is the stable key edges reference; `label` is the human-facing caption
 * a renderer draws; `data` carries builder-specific metadata a renderer may use
 * for colour, size, tooltips, etc.
 */
export interface GraphNode<TData = Record<string, never>> {
  readonly id: string;
  readonly label: string;
  readonly data?: TData;
}

/**
 * A directed edge in a {@link GraphData}, from `source` to `target` (both node
 * ids).  `id` is unique within the graph so parallel edges between the same
 * pair stay distinct.  `weight` is an optional scalar a renderer can map to
 * thickness/opacity; `data` carries builder-specific metadata.
 */
export interface GraphEdge<TData = Record<string, never>> {
  readonly id: string;
  readonly source: string;
  readonly target: string;
  readonly label?: string;
  readonly weight?: number;
  readonly data?: TData;
}

/**
 * A graph: nodes and edges plus a `directed` flag.
 *
 * The two type parameters let each builder attach a strongly-typed payload to
 * nodes and edges without changing the envelope.  Renderers that don't care
 * about the payload can treat it as opaque.
 */
export interface GraphData<
  TNodeData = Record<string, never>,
  TEdgeData = Record<string, never>,
> {
  readonly nodes: readonly GraphNode<TNodeData>[];
  readonly edges: readonly GraphEdge<TEdgeData>[];

  /** True for directed graphs (the default for harmonic topology and walks). */
  readonly directed: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Builds a {@link GraphNode}, omitting `data` entirely when undefined so the
 * shape stays clean under `exactOptionalPropertyTypes`.
 */
export function graphNode<TData>(
  id: string,
  label: string,
  data?: TData,
): GraphNode<TData> {
  return data === undefined ? { id, label } : { id, label, data };
}

/** True when `node` has a payload attached. */
export function hasNodeData<TData>(
  node: GraphNode<TData>,
): node is GraphNode<TData> & { readonly data: TData } {
  return node.data !== undefined;
}

/** Returns the node with the given id, or undefined. */
export function findNode<TNodeData, TEdgeData>(
  graph: GraphData<TNodeData, TEdgeData>,
  id: string,
): GraphNode<TNodeData> | undefined {
  return graph.nodes.find((n) => n.id === id);
}

/** Number of edges that leave `nodeId`. */
export function outDegree<TNodeData, TEdgeData>(
  graph: GraphData<TNodeData, TEdgeData>,
  nodeId: string,
): number {
  return graph.edges.reduce((n, e) => (e.source === nodeId ? n + 1 : n), 0);
}
