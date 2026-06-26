import type { GraphData, GraphNode } from "../data/GraphData.js";

// ---------------------------------------------------------------------------
// A10.1 — Mermaid topology adapter
//
// Serialises a generic GraphData (Wave 9) into Mermaid `flowchart` source, so
// the harmonic chord-space can be pasted into any Mermaid renderer:
//
//   flowchart LR
//       n0["I"]
//       n3["IV"]
//       n0 -->|"tonic_to_subdominant"| n3
//
// Pure and framework-free — it emits a string and imports no Mermaid library.
// It is generic over the node/edge payload so it renders the topology graph,
// the trajectory graph (see MermaidTrajectoryAdapter for richer styling), or
// any other GraphData unchanged.
//
// Node ids are reindexed to safe `n{i}` handles because real chord ids contain
// characters Mermaid forbids in identifiers ("vii°", "bVII").  The original id
// is preserved as the visible label.
// ---------------------------------------------------------------------------

export type MermaidDirection = "LR" | "RL" | "TB" | "TD" | "BT";

export interface MermaidGraphOptions {
  /** Flow direction.  Default "LR" (left-to-right). */
  readonly direction?: MermaidDirection;
  /** Render edge labels from `edge.label`.  Default true. */
  readonly showEdgeLabels?: boolean;
}

/**
 * Renders {@link GraphData} as Mermaid `flowchart` source.  Stateless and pure.
 */
export class MermaidGraphAdapter {
  render<TNodeData, TEdgeData>(
    graph: GraphData<TNodeData, TEdgeData>,
    options: MermaidGraphOptions = {},
  ): string {
    const direction = options.direction ?? "LR";
    const showEdgeLabels = options.showEdgeLabels ?? true;
    const ids = mermaidIdMap(graph.nodes);

    const lines: string[] = [`flowchart ${direction}`];

    for (const node of graph.nodes) {
      const safe = ids.get(node.id);
      if (safe === undefined) continue;
      lines.push(`    ${safe}["${escapeMermaidLabel(node.label)}"]`);
    }

    for (const edge of graph.edges) {
      const source = ids.get(edge.source);
      const target = ids.get(edge.target);
      // Skip edges that reference a node absent from the graph.
      if (source === undefined || target === undefined) continue;

      const label = showEdgeLabels && edge.label ? `|"${escapeMermaidLabel(edge.label)}"|` : "";
      lines.push(`    ${source} -->${label} ${target}`);
    }

    return lines.join("\n");
  }
}

// ---------------------------------------------------------------------------
// Shared Mermaid helpers (used by MermaidTrajectoryAdapter too)
// ---------------------------------------------------------------------------

/**
 * Maps each node's real id to a Mermaid-safe handle (`n0`, `n1`, …) in node
 * order.  Reindexing sidesteps Mermaid's identifier rules, which reject the
 * special characters real chord ids carry.
 */
export function mermaidIdMap<TNodeData>(
  nodes: readonly GraphNode<TNodeData>[],
): Map<string, string> {
  const map = new Map<string, string>();
  nodes.forEach((node, i) => map.set(node.id, `n${i}`));
  return map;
}

/**
 * Escapes a label for use inside a Mermaid quoted string.  Mermaid accepts most
 * characters between double quotes; the quote itself must be replaced with its
 * HTML entity so it doesn't terminate the string early.
 */
export function escapeMermaidLabel(label: string): string {
  return label.replace(/"/g, "#quot;");
}
