import type { TrajectoryGraphData } from "../data/TrajectoryGraphDataBuilder.js";
import { escapeMermaidLabel, mermaidIdMap, type MermaidDirection } from "./MermaidGraphAdapter.js";

// ---------------------------------------------------------------------------
// A10.2 — Mermaid trajectory adapter
//
// Serialises a TrajectoryGraphData (V9.3) — the actual path a run walked — into
// Mermaid `flowchart` source, annotated for storytelling rather than just
// structure:
//
//   flowchart LR
//       n0["I"]:::start
//       n1["IV"]
//       n0 -->|"0"| n1
//       ...
//       classDef start fill:#cfe8ff,stroke:#3b82f6,stroke-width:2px;
//       linkStyle 2 stroke:#ef4444,stroke-width:2px;
//
// Edge labels carry the generation step index (and optionally the functional
// motion).  The start chord is highlighted via a `classDef`, and "road less
// travelled" moves — steps where the sampler did not pick the most-probable
// candidate — are highlighted with `linkStyle`, so a reader can see at a glance
// where the run took a surprising turn.
//
// Pure and framework-free: emits a string, imports no Mermaid library, and only
// reuses the shared id/label helpers from MermaidGraphAdapter.
// ---------------------------------------------------------------------------

export interface MermaidTrajectoryOptions {
  /** Flow direction.  Default "LR" (left-to-right). */
  readonly direction?: MermaidDirection;
  /** Prefix edge labels with the step index.  Default true. */
  readonly showStepIndices?: boolean;
  /** Include the functional motion in edge labels.  Default false. */
  readonly showMotion?: boolean;
  /** Apply a `classDef` to the start node.  Default true. */
  readonly highlightStart?: boolean;
  /**
   * Apply a `linkStyle` to steps where the chosen edge was not the
   * most-probable candidate (`wasModalChoice === false`).  Default true.
   */
  readonly highlightSurprises?: boolean;
}

const START_CLASS_DEF = "classDef start fill:#cfe8ff,stroke:#3b82f6,stroke-width:2px;";
const SURPRISE_LINK_STYLE = "stroke:#ef4444,stroke-width:2px;";

/**
 * Renders {@link TrajectoryGraphData} as annotated Mermaid `flowchart` source.
 * Stateless and pure.
 */
export class MermaidTrajectoryAdapter {
  render(graph: TrajectoryGraphData, options: MermaidTrajectoryOptions = {}): string {
    const direction = options.direction ?? "LR";
    const showStepIndices = options.showStepIndices ?? true;
    const showMotion = options.showMotion ?? false;
    const highlightStart = options.highlightStart ?? true;
    const highlightSurprises = options.highlightSurprises ?? true;

    const ids = mermaidIdMap(graph.nodes);
    const lines: string[] = [`flowchart ${direction}`];

    for (const node of graph.nodes) {
      const safe = ids.get(node.id);
      if (safe === undefined) continue;
      const isStart = node.data?.isStart === true;
      const suffix = highlightStart && isStart ? ":::start" : "";
      lines.push(`    ${safe}["${escapeMermaidLabel(node.label)}"]${suffix}`);
    }

    // Edge order here is also the linkStyle index space Mermaid uses, so track
    // which emitted edges were surprising as we go.
    const surpriseIndices: number[] = [];
    let edgeIndex = 0;
    for (const edge of graph.edges) {
      const source = ids.get(edge.source);
      const target = ids.get(edge.target);
      if (source === undefined || target === undefined) continue;

      const label = edgeLabel(edge.data, showStepIndices, showMotion);
      const labelPart = label ? `|"${escapeMermaidLabel(label)}"|` : "";
      lines.push(`    ${source} -->${labelPart} ${target}`);

      if (highlightSurprises && edge.data?.wasModalChoice === false) {
        surpriseIndices.push(edgeIndex);
      }
      edgeIndex++;
    }

    if (highlightStart && hasStartNode(graph)) {
      lines.push(`    ${START_CLASS_DEF}`);
    }
    if (surpriseIndices.length > 0) {
      lines.push(`    linkStyle ${surpriseIndices.join(",")} ${SURPRISE_LINK_STYLE}`);
    }

    return lines.join("\n");
  }
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

function edgeLabel(
  data: TrajectoryGraphData["edges"][number]["data"],
  showStepIndices: boolean,
  showMotion: boolean,
): string {
  if (data === undefined) return "";
  const parts: string[] = [];
  if (showStepIndices) parts.push(String(data.stepIndex));
  if (showMotion) parts.push(data.functionalMotion);
  return parts.join(": ");
}

function hasStartNode(graph: TrajectoryGraphData): boolean {
  return graph.nodes.some((n) => n.data?.isStart === true);
}
