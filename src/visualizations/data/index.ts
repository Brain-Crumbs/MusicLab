// Visualization data builders (Wave 9)
//
// These produce *data only* — plain nodes/edges/rows with no React, D3, SVG, or
// Mermaid dependency.  Wave 10 renderer adapters consume these shapes; the core
// generator never imports them.

// Generic graph data model (V9.1)
export type { GraphData, GraphNode, GraphEdge } from "./GraphData.js";
export { graphNode, hasNodeData, findNode, outDegree } from "./GraphData.js";

// Topology graph data builder (V9.2)
export { TopologyGraphDataBuilder } from "./TopologyGraphDataBuilder.js";
export type {
  TopologyGraphData,
  TopologyNodeData,
  TopologyEdgeData,
} from "./TopologyGraphDataBuilder.js";

// Trajectory graph data builder (V9.3)
export { TrajectoryGraphDataBuilder } from "./TrajectoryGraphDataBuilder.js";
export type {
  TrajectoryGraphData,
  TrajectoryNodeData,
  TrajectoryEdgeData,
} from "./TrajectoryGraphDataBuilder.js";

// Candidate distribution data builder (V9.4)
export { CandidateDistributionDataBuilder } from "./CandidateDistributionDataBuilder.js";
export type {
  CandidateDistributionDatum,
  StepCandidateDistribution,
} from "./CandidateDistributionDataBuilder.js";

// Tension timeline data builder (V9.5)
export { TensionTimelineDataBuilder } from "./TensionTimelineDataBuilder.js";
export type { TensionTimelineDatum } from "./TensionTimelineDataBuilder.js";

// Factor contribution data builder (V9.6)
export { FactorContributionDataBuilder } from "./FactorContributionDataBuilder.js";
export type { FactorContributionDatum } from "./FactorContributionDataBuilder.js";
