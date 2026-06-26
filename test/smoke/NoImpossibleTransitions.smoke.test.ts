import { describe, it, expect } from "vitest";
import { createDefaultMvpGenerator } from "../../src/core/generator/createDefaultMvpGenerator.js";
import { MajorKeyTopologyBuilder } from "../../src/core/topology/MajorKeyTopologyBuilder.js";
import { chordId } from "../../src/core/model/ChordId.js";

/**
 * X6.10 — no impossible transitions smoke test.
 *
 * Every chord the generator emits must be reachable by a real edge in the
 * topology: the sampler can only ever choose among the current chord's outgoing
 * edges, so the generated walk must be a legal path through the harmonic graph.
 * This is the structural safety net behind all the musical behaviour.
 */
describe("X6.10 — generator never produces impossible transitions", () => {
  // The factory builds its own topology internally; build an identical one here
  // to validate the emitted path against the same harmonic geometry.
  const topology = new MajorKeyTopologyBuilder().build();

  it("every emitted transition corresponds to a real topology edge", () => {
    for (const seed of [1, 2, 3, 13, 42, 256, 1000]) {
      const generator = createDefaultMvpGenerator({ seed });
      const result = generator.generate({
        steps: 24,
        initialChord: chordId("I"),
      });

      let from = chordId("I");
      for (const step of result.steps) {
        // The edge must exist and be self-consistent.
        expect(step.selectedEdge.from).toBe(from);
        expect(step.selectedEdge.to).toBe(step.selectedChord);
        expect(topology.hasEdge(from, step.selectedChord)).toBe(true);

        // The selected edge must be one the topology actually offers from here.
        const outgoing = topology.getOutgoingEdges(from);
        expect(outgoing.some((e) => e.id === step.selectedEdge.id)).toBe(true);

        from = step.selectedChord;
      }
    }
  });

  it("only ever samples a candidate that was in the distribution", () => {
    const generator = createDefaultMvpGenerator({ seed: 77 });
    const result = generator.generate({ steps: 16, initialChord: chordId("I") });

    for (const step of result.steps) {
      // The selected edge appears among the scored candidates...
      expect(
        step.candidates.some((c) => c.edge.id === step.selectedEdge.id),
      ).toBe(true);
      // ...and carries positive probability in the sampled distribution.
      expect(step.distribution.getProbability(step.selectedEdge.id)).toBeGreaterThan(
        0,
      );
    }
  });

  it("every generated chord is a node in the topology", () => {
    const generator = createDefaultMvpGenerator({ seed: 5 });
    const result = generator.generate({ steps: 32, initialChord: chordId("I") });
    for (const chord of result.chords) {
      expect(topology.hasChord(chord)).toBe(true);
    }
  });
});
