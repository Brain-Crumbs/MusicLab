// Visualizations (Wave 9+)
//
// Data builders turn generation output into plain, framework-free graph/row
// data.  Renderer adapters (Wave 10) live alongside under their own folders and
// depend on these builders, never the other way round.

// Data builders (Wave 9)
export * from "./data/index.js";

// Renderer adapters (Wave 10) — optional, framework-free.  These consume the
// Wave 9 data shapes; the core generator never imports them.

// Shared deterministic layout
export { circularLayout } from "./layout/CircularLayout.js";
export type { Point, CircularLayoutOptions } from "./layout/CircularLayout.js";

// Mermaid topology adapter (A10.1)
export {
  MermaidGraphAdapter,
  mermaidIdMap,
  escapeMermaidLabel,
} from "./adapters/MermaidGraphAdapter.js";
export type { MermaidGraphOptions, MermaidDirection } from "./adapters/MermaidGraphAdapter.js";

// Mermaid trajectory adapter (A10.2)
export { MermaidTrajectoryAdapter } from "./adapters/MermaidTrajectoryAdapter.js";
export type { MermaidTrajectoryOptions } from "./adapters/MermaidTrajectoryAdapter.js";

// SVG topology renderer (A10.3)
export { SvgTopologyRenderer } from "./svg/SvgTopologyRenderer.js";
export type { SvgTopologyOptions } from "./svg/SvgTopologyRenderer.js";

// SVG tension timeline renderer (A10.4)
export { SvgTensionTimelineRenderer } from "./svg/SvgTensionTimelineRenderer.js";
export type { SvgTensionTimelineOptions } from "./svg/SvgTensionTimelineRenderer.js";

// React Flow topology adapter (A10.5)
export { ReactFlowTopologyAdapter } from "./adapters/ReactFlowTopologyAdapter.js";
export type {
  ReactFlowGraph,
  ReactFlowNode,
  ReactFlowEdge,
  ReactFlowNodeData,
  ReactFlowTopologyOptions,
} from "./adapters/ReactFlowTopologyAdapter.js";

// D3 topology adapter (A10.6)
export { D3TopologyAdapter } from "./adapters/D3TopologyAdapter.js";
export type { D3Graph, D3Node, D3Link } from "./adapters/D3TopologyAdapter.js";
