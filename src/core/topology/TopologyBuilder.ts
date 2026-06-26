import type { HarmonicTopology } from "../model/HarmonicTopology.js";

/**
 * Contract for any class that constructs an immutable HarmonicTopology.
 *
 * Implementations are responsible for defining which chords and transitions
 * exist in a given harmonic context (e.g. major key, modal, chromatic).
 * The returned topology is fully built and ready for generation.
 */
export interface TopologyBuilder {
  build(): HarmonicTopology;
}
