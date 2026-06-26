import { describe, it, expect } from "vitest";
import {
  loadGeneratorConfig,
  DEFAULT_STEPS,
  DEFAULT_INITIAL_CHORD,
  type LoadDeps,
} from "../../../src/cli/loadGeneratorConfig.js";
import { PhraseTemplates, StyleProfiles } from "../../../src/index.js";

/** Builds a LoadDeps whose readFile returns the given fixed text. */
function fileWith(text: string): LoadDeps {
  return { readFile: () => text };
}

describe("loadGeneratorConfig", () => {
  it("applies defaults when given no options", () => {
    const loaded = loadGeneratorConfig({});
    expect(loaded.steps).toBe(DEFAULT_STEPS);
    expect(loaded.initialChord).toBe(DEFAULT_INITIAL_CHORD);
    expect(loaded.overrides).toEqual({});
  });

  it("maps flag values into typed overrides", () => {
    const loaded = loadGeneratorConfig({
      key: "G",
      mode: "major",
      temperature: 0.9,
      seed: 42,
      steps: 12,
      initialChord: "V7",
      phrase: "eightBarLongArc",
      style: "modalSurprising",
    });

    expect(loaded.steps).toBe(12);
    expect(loaded.initialChord).toBe("V7");
    expect(loaded.overrides.key).toBe("G");
    expect(loaded.overrides.mode).toBe("major");
    expect(loaded.overrides.temperature).toBe(0.9);
    expect(loaded.overrides.seed).toBe(42);
    expect(loaded.overrides.phraseTemplate).toBe(PhraseTemplates.eightBarLongArc);
    expect(loaded.overrides.styleProfile).toBe(StyleProfiles.modalSurprising);
  });

  it("resolves a style profile by its id as well as its preset key", () => {
    const byKey = loadGeneratorConfig({ style: "folkStable" });
    const byId = loadGeneratorConfig({ style: "folk_stable" });
    expect(byKey.overrides.styleProfile).toBe(StyleProfiles.folkStable);
    expect(byId.overrides.styleProfile).toBe(StyleProfiles.folkStable);
  });

  it("reads fields from a JSON config file", () => {
    const deps = fileWith(
      JSON.stringify({ key: "D", seed: 99, steps: 4, style: "folkWandering" }),
    );
    const loaded = loadGeneratorConfig({ config: "cfg.json" }, deps);
    expect(loaded.overrides.key).toBe("D");
    expect(loaded.overrides.seed).toBe(99);
    expect(loaded.steps).toBe(4);
    expect(loaded.overrides.styleProfile).toBe(StyleProfiles.folkWandering);
  });

  it("lets explicit flags override file values", () => {
    const deps = fileWith(JSON.stringify({ key: "D", steps: 4 }));
    const loaded = loadGeneratorConfig({ config: "cfg.json", steps: 6 }, deps);
    expect(loaded.steps).toBe(6); // flag wins
    expect(loaded.overrides.key).toBe("D"); // file value falls through
  });

  it("throws on an unknown phrase template", () => {
    expect(() => loadGeneratorConfig({ phrase: "nope" })).toThrow(/Unknown phrase/);
  });

  it("throws on an unknown style profile", () => {
    expect(() => loadGeneratorConfig({ style: "nope" })).toThrow(/Unknown style/);
  });

  it("throws on an unknown key", () => {
    expect(() => loadGeneratorConfig({ key: "H" })).toThrow(/Unknown key/);
  });

  it("throws on an unknown mode", () => {
    expect(() => loadGeneratorConfig({ mode: "ionianish" })).toThrow(/Unknown mode/);
  });

  it("rejects non-positive steps and temperature", () => {
    expect(() => loadGeneratorConfig({ steps: 0 })).toThrow(/steps/);
    expect(() => loadGeneratorConfig({ temperature: 0 })).toThrow(/temperature/);
  });

  it("rejects a negative or non-integer seed", () => {
    expect(() => loadGeneratorConfig({ seed: -1 })).toThrow(/seed/);
    expect(() => loadGeneratorConfig({ seed: 1.5 })).toThrow(/seed/);
  });

  it("reports invalid JSON in a config file", () => {
    const deps = fileWith("{ not json");
    expect(() => loadGeneratorConfig({ config: "cfg.json" }, deps)).toThrow(
      /not valid JSON/,
    );
  });

  it("rejects a config file that is not a JSON object", () => {
    const deps = fileWith(JSON.stringify([1, 2, 3]));
    expect(() => loadGeneratorConfig({ config: "cfg.json" }, deps)).toThrow(
      /must contain a JSON object/,
    );
  });

  it("surfaces a file read error", () => {
    const deps: LoadDeps = {
      readFile: () => {
        throw new Error("ENOENT");
      },
    };
    expect(() => loadGeneratorConfig({ config: "missing.json" }, deps)).toThrow(
      /Could not read config file/,
    );
  });
});
