import type { ChordId } from "../../core/model/ChordId.js";
import type { FunctionalMotion } from "../../core/model/HarmonicFunction.js";
import type { GenerationStep } from "../../core/model/GenerationStep.js";
import type { GenerationTrace } from "../../core/model/GenerationTrace.js";
import { selectedProbability } from "../../core/model/GenerationStep.js";
import {
  graphNode,
  type GraphData,
  type GraphEdge,
  type GraphNode,
} from "./GraphData.js";

// ---------------------------------------------------------------------------
// V9.3 — Trajectory graph data builder
//
// Projects the *actual path* a generation run took through the harmonic space
// into the generic GraphData model: the ordered walk
//
//   I -> IV -> V7 -> I -> vi -> ii -> V7 -> I
//
// Where the topology graph (V9.2) shows what *can* happen, the trajectory graph
// shows what *did* happen.  Nodes are the distinct chords visited (with how
// often), and edges are the transitions actually taken — one per step, kept
// ordered and individually identified so a chord pair revisited later stays a
// separate, sequenced edge rather than collapsing onto the first visit.
//
// Pure projection of a finished run; building it never affects generation.
// ---------------------------------------------------------------------------

/** Per-node metadata describing how the walk used a chord. */
export interface TrajectoryNodeData {
  /** How many times this chord was occupied across the walk. */
  readonly visitCount: number;
  /** Index in the walk path where this chord first appeared (0-based). */
  readonly firstVisitIndex: number;
  /** True for the chord the run started on. */
  readonly isStart: boolean;
}

/** Per-edge metadata describing a single transition that was taken. */
export interface TrajectoryEdgeData {
  /** The generation step that produced this transition. */
  readonly stepIndex: number;
  readonly functionalMotion: FunctionalMotion;
  /** Static tension change of the edge taken. */
  readonly tensionDelta: number;
  /** Probability the sampler had assigned to the chosen edge. */
  readonly probability: number;
  /**
   * True when the chosen edge was the most-probable candidate at that step.
   * False marks a "road less travelled" pick — useful for highlighting
   * surprising moves in a rendering.
   */
  readonly wasModalChoice: boolean;
}

/** The concrete graph shape this builder produces. */
export type TrajectoryGraphData = GraphData<
  TrajectoryNodeData,
  TrajectoryEdgeData
>;

/**
 * Builds {@link TrajectoryGraphData} from a {@link GenerationTrace}.
 *
 * The walk path is `[firstChord, ...selectedChords]`: the chord the run started
 * on followed by each chosen chord.  An empty trace yields an empty graph.
 */
export class TrajectoryGraphDataBuilder {
  build(trace: GenerationTrace): TrajectoryGraphData {
    const steps = trace.steps;
    const firstStep = steps[0];
    if (firstStep === undefined) {
      return { nodes: [], edges: [], directed: true };
    }

    const startChord = firstStep.previousState.currentChord;

    // The ordered chords the walk occupied: start chord, then each choice.
    const path: ChordId[] = [startChord, ...steps.map((s) => s.selectedChord)];

    // Edges follow consecutive path entries; track `from` as we go so we never
    // index the path array (keeps it clean under noUncheckedIndexedAccess).
    let from: ChordId = startChord;
    const edges: GraphEdge<TrajectoryEdgeData>[] = [];
    for (const step of steps) {
      const to = step.selectedChord;
      edges.push(toGraphEdge(step, from, to));
      from = to;
    }

    return { nodes: buildNodes(path), edges, directed: true };
  }
}

// ---------------------------------------------------------------------------
// Mapping (module-private)
// ---------------------------------------------------------------------------

function buildNodes(
  path: readonly ChordId[],
): readonly GraphNode<TrajectoryNodeData>[] {
  const visitCount = new Map<ChordId, number>();
  const firstVisitIndex = new Map<ChordId, number>();

  path.forEach((chord, index) => {
    visitCount.set(chord, (visitCount.get(chord) ?? 0) + 1);
    if (!firstVisitIndex.has(chord)) firstVisitIndex.set(chord, index);
  });

  const startChord = path[0];

  // Emit nodes in first-visit order so the output is stable and readable.
  return [...firstVisitIndex.entries()]
    .sort((a, b) => a[1] - b[1])
    .map(([chord, first]) =>
      graphNode<TrajectoryNodeData>(chord, chord, {
        visitCount: visitCount.get(chord) ?? 0,
        firstVisitIndex: first,
        isStart: chord === startChord,
      }),
    );
}

function toGraphEdge(
  step: GenerationStep,
  from: ChordId,
  to: ChordId,
): GraphEdge<TrajectoryEdgeData> {
  const edge = step.selectedEdge;
  // Step-scoped id so a revisited chord pair stays a distinct, ordered edge.
  return {
    id: `step-${step.stepIndex}:${edge.id}`,
    source: from,
    target: to,
    label: `${step.stepIndex}`,
    weight: selectedProbability(step),
    data: {
      stepIndex: step.stepIndex,
      functionalMotion: edge.functionalMotion,
      tensionDelta: edge.tensionDelta,
      probability: selectedProbability(step),
      wasModalChoice: step.distribution.modalEdgeId === edge.id,
    },
  };
}
