import type { Chord, ChordQuality } from "../../core/model/Chord.js";
import type { HarmonicEdge, StyleTag } from "../../core/model/HarmonicEdge.js";
import type { HarmonicTopology } from "../../core/model/HarmonicTopology.js";
import type {
  HarmonicFunction,
  FunctionalMotion,
  SourceMode,
} from "../../core/model/HarmonicFunction.js";
import {
  graphNode,
  type GraphData,
  type GraphEdge,
  type GraphNode,
} from "./GraphData.js";

// ---------------------------------------------------------------------------
// V9.2 — Topology graph data builder
//
// Projects the permanent harmonic space (HarmonicTopology) into the generic
// GraphData model so a renderer can draw the chord-space:
//
//   I  -> IV
//   ii -> V7
//   V7 -> I
//   V7 -> vi
//   bVII -> I
//
// This is a pure, static view: it depends only on the topology, never on a
// generation run.  Each node carries the chord's tonal metadata and each edge
// carries its static transition properties, so a renderer can colour by
// function, size by affinity, etc., without re-deriving anything.
// ---------------------------------------------------------------------------

/** Renderer-facing metadata for a chord node. */
export interface TopologyNodeData {
  readonly scaleDegree: number;
  readonly accidentalOffset: number;
  readonly quality: ChordQuality;
  readonly harmonicFunction: HarmonicFunction;
  readonly sourceMode?: SourceMode;
}

/** Renderer-facing metadata for a transition edge. */
export interface TopologyEdgeData {
  readonly baseAffinity: number;
  readonly circleDistance: number;
  readonly functionalMotion: FunctionalMotion;
  readonly tensionDelta: number;
  readonly cadenceStrength: number;
  readonly surpriseCost: number;
  readonly styleTags: readonly StyleTag[];
}

/** The concrete graph shape this builder produces. */
export type TopologyGraphData = GraphData<TopologyNodeData, TopologyEdgeData>;

/**
 * Builds {@link TopologyGraphData} from a {@link HarmonicTopology}.
 *
 * Stateless and pure: `build` reads the topology's chords and edges and maps
 * each to a graph node/edge.  Edge `weight` is set to `baseAffinity` so a
 * renderer gets a sensible default thickness without inspecting `data`.
 */
export class TopologyGraphDataBuilder {
  build(topology: HarmonicTopology): TopologyGraphData {
    return {
      nodes: topology.getAllChords().map((c) => toGraphNode(c)),
      edges: topology.getAllEdges().map((e) => toGraphEdge(e)),
      directed: true,
    };
  }
}

// ---------------------------------------------------------------------------
// Mapping (module-private)
// ---------------------------------------------------------------------------

function toGraphNode(chord: Chord): GraphNode<TopologyNodeData> {
  const data: TopologyNodeData = {
    scaleDegree: chord.scaleDegree,
    accidentalOffset: chord.accidentalOffset,
    quality: chord.quality,
    harmonicFunction: chord.harmonicFunction,
    // exactOptionalPropertyTypes: only include sourceMode when defined.
    ...(chord.sourceMode !== undefined ? { sourceMode: chord.sourceMode } : {}),
  };
  return graphNode<TopologyNodeData>(chord.id, chord.id, data);
}

function toGraphEdge(edge: HarmonicEdge): GraphEdge<TopologyEdgeData> {
  return {
    id: edge.id,
    source: edge.from,
    target: edge.to,
    label: edge.functionalMotion,
    weight: edge.baseAffinity,
    data: {
      baseAffinity: edge.baseAffinity,
      circleDistance: edge.circleDistance,
      functionalMotion: edge.functionalMotion,
      tensionDelta: edge.tensionDelta,
      cadenceStrength: edge.cadenceStrength,
      surpriseCost: edge.surpriseCost,
      styleTags: edge.styleTags,
    },
  };
}
