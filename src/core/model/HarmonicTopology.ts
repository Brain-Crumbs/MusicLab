import type { Chord } from "./Chord.js";
import type { ChordId } from "./ChordId.js";
import type { HarmonicEdge } from "./HarmonicEdge.js";

/**
 * The immutable harmonic space: a directed graph of chords (nodes) and
 * possible transitions (edges).
 *
 * The topology is built once by a TopologyBuilder and never mutated.
 * The generator reads it on every step; it does not write to it.
 */
export class HarmonicTopology {
  private constructor(
    private readonly chords: ReadonlyMap<ChordId, Chord>,
    private readonly adjacency: ReadonlyMap<ChordId, readonly HarmonicEdge[]>,
  ) {}

  // ---------------------------------------------------------------------------
  // Lookups
  // ---------------------------------------------------------------------------

  /**
   * Returns the Chord for the given id.
   * Throws if the id is not in the topology — callers should only pass ids
   * that came from the topology itself.
   */
  getChord(id: ChordId): Chord {
    const chord = this.chords.get(id);
    if (chord === undefined) {
      throw new Error(`HarmonicTopology: unknown chord id "${id}"`);
    }
    return chord;
  }

  /** Returns the chord or undefined without throwing. */
  findChord(id: ChordId): Chord | undefined {
    return this.chords.get(id);
  }

  /** Returns all outgoing edges from the given chord. Empty array if none. */
  getOutgoingEdges(from: ChordId): readonly HarmonicEdge[] {
    return this.adjacency.get(from) ?? [];
  }

  /** True when the topology contains a chord with the given id. */
  hasChord(id: ChordId): boolean {
    return this.chords.has(id);
  }

  /** True when a direct edge exists between from and to. */
  hasEdge(from: ChordId, to: ChordId): boolean {
    return this.getOutgoingEdges(from).some((e) => e.to === to);
  }

  // ---------------------------------------------------------------------------
  // Bulk accessors
  // ---------------------------------------------------------------------------

  getAllChords(): Chord[] {
    return [...this.chords.values()];
  }

  getAllEdges(): HarmonicEdge[] {
    return [...this.adjacency.values()].flat();
  }

  get chordCount(): number {
    return this.chords.size;
  }

  get edgeCount(): number {
    let count = 0;
    for (const edges of this.adjacency.values()) count += edges.length;
    return count;
  }

  // ---------------------------------------------------------------------------
  // Factory
  // ---------------------------------------------------------------------------

  /**
   * Constructs an immutable topology from flat arrays of chords and edges.
   *
   * Validates that every edge's `from` and `to` ids exist in the chord list.
   * Throws on unknown chord ids so topology builders catch mistakes early.
   */
  static from(chords: readonly Chord[], edges: readonly HarmonicEdge[]): HarmonicTopology {
    const chordMap = new Map<ChordId, Chord>();
    for (const chord of chords) {
      chordMap.set(chord.id, chord);
    }

    const adjacency = new Map<ChordId, HarmonicEdge[]>();
    for (const edge of edges) {
      if (!chordMap.has(edge.from)) {
        throw new Error(
          `HarmonicTopology.from: edge "${edge.id}" references unknown source chord "${edge.from}"`,
        );
      }
      if (!chordMap.has(edge.to)) {
        throw new Error(
          `HarmonicTopology.from: edge "${edge.id}" references unknown target chord "${edge.to}"`,
        );
      }

      let bucket = adjacency.get(edge.from);
      if (bucket === undefined) {
        bucket = [];
        adjacency.set(edge.from, bucket);
      }
      bucket.push(edge);
    }

    return new HarmonicTopology(chordMap, adjacency);
  }
}
