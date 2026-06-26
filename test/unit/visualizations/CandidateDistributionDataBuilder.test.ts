import { describe, it, expect } from "vitest";
import { CandidateDistributionDataBuilder } from "../../../src/visualizations/data/CandidateDistributionDataBuilder.js";
import { createDefaultMvpGenerator } from "../../../src/core/generator/createDefaultMvpGenerator.js";
import { chordId } from "../../../src/core/model/ChordId.js";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const SEED = 4242;
const result = createDefaultMvpGenerator({ seed: SEED }).generate({
  steps: 8,
  initialChord: chordId("I"),
});

const builder = new CandidateDistributionDataBuilder();

// Build for the first step so tests can stay concrete
const firstStep = result.trace.steps[0]!;
const firstDist = builder.build(firstStep);

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("CandidateDistributionDataBuilder — snapshot", () => {
  it("matches the per-step candidate distribution snapshot", () => {
    const allDists = builder.buildAll(result.trace);
    expect(allDists).toMatchSnapshot();
  });
});

describe("CandidateDistributionDataBuilder.build() — probability invariants", () => {
  it("probabilities across all candidates sum to 1 (±0.001)", () => {
    for (const step of result.trace.steps) {
      const dist = builder.build(step);
      const sum = dist.reduce((s, row) => s + row.probability, 0);
      expect(sum).toBeCloseTo(1, 3);
    }
  });

  it("every probability is in [0, 1]", () => {
    for (const row of firstDist) {
      expect(row.probability).toBeGreaterThanOrEqual(0);
      expect(row.probability).toBeLessThanOrEqual(1);
    }
  });

  it("rows are sorted by probability descending", () => {
    for (const step of result.trace.steps) {
      const dist = builder.build(step);
      for (let i = 0; i < dist.length - 1; i++) {
        expect(dist[i]!.probability).toBeGreaterThanOrEqual(dist[i + 1]!.probability);
      }
    }
  });
});

describe("CandidateDistributionDataBuilder.build() — selection flag", () => {
  it("exactly one row has selected=true per step", () => {
    for (const step of result.trace.steps) {
      const dist = builder.build(step);
      const selected = dist.filter((r) => r.selected);
      expect(selected).toHaveLength(1);
    }
  });

  it("the selected row's edgeId matches the step's selectedEdge id", () => {
    for (const step of result.trace.steps) {
      const dist = builder.build(step);
      const selected = dist.find((r) => r.selected)!;
      expect(selected.edgeId).toBe(step.selectedEdge.id);
    }
  });

  it("the selected row's chord matches the step's selectedChord", () => {
    for (const step of result.trace.steps) {
      const dist = builder.build(step);
      const selected = dist.find((r) => r.selected)!;
      expect(selected.chord).toBe(step.selectedChord);
    }
  });
});

describe("CandidateDistributionDataBuilder.build() — score integrity", () => {
  it("each row's score matches the corresponding candidate total score", () => {
    for (const step of result.trace.steps) {
      const dist = builder.build(step);
      for (const row of dist) {
        const candidate = step.candidates.find((c) => c.edge.id === row.edgeId)!;
        expect(row.score).toBeCloseTo(candidate.totalScore, 9);
      }
    }
  });

  it("each row covers a distinct edgeId", () => {
    const dist = builder.build(firstStep);
    const ids = dist.map((r) => r.edgeId);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("CandidateDistributionDataBuilder.buildAll()", () => {
  it("returns one distribution per step in step order", () => {
    const all = builder.buildAll(result.trace);
    expect(all).toHaveLength(result.trace.steps.length);
    all.forEach((entry, i) => {
      expect(entry.stepIndex).toBe(i);
    });
  });

  it("each entry's current chord matches the step departure chord", () => {
    const all = builder.buildAll(result.trace);
    for (let i = 0; i < result.trace.steps.length; i++) {
      const step = result.trace.steps[i]!;
      expect(all[i]?.current).toBe(step.previousState.currentChord);
    }
  });

  it("each entry's candidates array is non-empty", () => {
    const all = builder.buildAll(result.trace);
    for (const entry of all) {
      expect(entry.candidates.length).toBeGreaterThan(0);
    }
  });
});

describe("CandidateDistributionDataBuilder — determinism", () => {
  it("produces identical output for the same step", () => {
    const a = builder.build(firstStep);
    const b = builder.build(firstStep);
    expect(a).toEqual(b);
  });
});
