import { describe, it, expect } from "vitest";
import { JsonTraceRenderer } from "../../../src/renderers/JsonTraceRenderer.js";
import { CsvTraceRenderer } from "../../../src/renderers/CsvTraceRenderer.js";
import { createDefaultMvpGenerator } from "../../../src/core/generator/createDefaultMvpGenerator.js";
import { chordId } from "../../../src/core/model/ChordId.js";
import type { GenerationResult } from "../../../src/core/generator/GenerationResult.js";

const SEED = 4242;
const run = (steps = 6): GenerationResult =>
  createDefaultMvpGenerator({ seed: SEED }).generate({
    steps,
    initialChord: chordId("I"),
  });

describe("JsonTraceRenderer", () => {
  const renderer = new JsonTraceRenderer();

  it("produces a fully self-describing, parseable object", () => {
    const result = run();
    const obj = renderer.toObject(result.trace);

    expect(obj.chordSequence).toEqual(result.chords);
    expect(obj.totalSteps).toBe(result.steps.length);
    expect(obj.seed).toBe(SEED);
    expect(obj.steps).toHaveLength(result.steps.length);
  });

  it("flattens each step to primitives (no class instances leak through)", () => {
    const obj = renderer.toObject(run().trace);
    const step = obj.steps[0]!;

    expect(typeof step.selectedChord).toBe("string");
    expect(typeof step.selectedEdgeId).toBe("string");
    expect(step.candidates.length).toBeGreaterThan(0);

    // Probabilities are real numbers and the selected flag is unique per step.
    const selected = step.candidates.filter((c) => c.selected);
    expect(selected).toHaveLength(1);
    expect(selected[0]!.edgeId).toBe(step.selectedEdgeId);
    for (const c of step.candidates) {
      expect(typeof c.probability).toBe("number");
      expect(c.totalScore).toBeTypeOf("number");
    }
  });

  it("round-trips through JSON.parse", () => {
    const json = renderer.render(run(), { includeTimestamp: false });
    const parsed = JSON.parse(json);
    expect(parsed.chordSequence).toEqual([...run().chords]);
    expect(parsed.generatedAt).toBeUndefined();
  });

  it("emits compact JSON when pretty is false", () => {
    const json = renderer.render(run(), { pretty: false });
    expect(json).not.toContain("\n");
    expect(() => JSON.parse(json)).not.toThrow();
  });

  it("is reproducible for a fixed seed (timestamp excluded)", () => {
    const a = renderer.render(run(), { includeTimestamp: false });
    const b = renderer.render(run(), { includeTimestamp: false });
    expect(a).toBe(b);
  });
});

describe("CsvTraceRenderer", () => {
  const renderer = new CsvTraceRenderer();

  it("emits one data row per step plus a header", () => {
    const result = run();
    const lines = renderer.render(result).split("\n");
    expect(lines).toHaveLength(result.steps.length + 1);
    expect(lines[0]).toContain("stepIndex");
    expect(lines[0]).toContain("selectedChord");
  });

  it("omits the header when requested", () => {
    const result = run();
    const lines = renderer.renderSteps(result.trace, { header: false }).split("\n");
    expect(lines).toHaveLength(result.steps.length);
  });

  it("emits one row per candidate in candidate mode", () => {
    const trace = run().trace;
    const expectedRows = trace.steps.reduce((s, step) => s + step.candidates.length, 0);
    const lines = renderer.renderCandidates(trace, { header: false }).split("\n");
    expect(lines).toHaveLength(expectedRows);
  });

  it("supports a custom delimiter", () => {
    const csv = renderer.renderSteps(run().trace, { delimiter: ";" });
    expect(csv.split("\n")[0]).toContain("stepIndex;fromChord");
  });

  it("rounds numeric fields to the requested precision", () => {
    const csv = renderer.renderSteps(run().trace, { precision: 2, header: false });
    const firstRow = csv.split("\n")[0]!.split(",");
    // selectedProbability column (index 4) has at most 2 decimal places.
    const prob = firstRow[4]!;
    const decimals = prob.includes(".") ? prob.split(".")[1]!.length : 0;
    expect(decimals).toBeLessThanOrEqual(2);
  });

  it("is reproducible for a fixed seed", () => {
    expect(renderer.render(run())).toBe(renderer.render(run()));
  });
});
