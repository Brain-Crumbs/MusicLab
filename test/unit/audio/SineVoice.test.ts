import { describe, it, expect } from "vitest";
import { SineVoice } from "../../../src/audio/synth/SineVoice.js";
import { Envelope } from "../../../src/audio/synth/Envelope.js";

describe("SineVoice", () => {
  describe("frequencyOf (AUD-5.7)", () => {
    it("maps MIDI 69 (A4) to exactly 440 Hz", () => {
      expect(SineVoice.frequencyOf(69)).toBe(440);
    });

    it("maps MIDI 60 (middle C) to ~261.63 Hz", () => {
      expect(SineVoice.frequencyOf(60)).toBeCloseTo(261.63, 2);
    });

    it("maps MIDI 81 (A5) to 880 Hz (one octave up doubles frequency)", () => {
      expect(SineVoice.frequencyOf(81)).toBeCloseTo(880, 6);
    });
  });

  describe("render", () => {
    const voice = new SineVoice(new Envelope(0.02, 0.2, 44100));

    it("produces a buffer whose length matches duration × sampleRate", () => {
      const samples = voice.render(69, 0.5, 44100, 100);
      expect(samples.length).toBe(Math.round(0.5 * 44100));
    });

    it("is silent at zero velocity", () => {
      const samples = voice.render(69, 0.5, 44100, 0);
      expect(samples.every((s) => s === 0)).toBe(true);
    });

    it("stays within [-1, 1]", () => {
      const samples = voice.render(60, 0.5, 44100, 127);
      expect(samples.every((s) => s >= -1 && s <= 1)).toBe(true);
    });

    it("is deterministic for identical arguments", () => {
      const a = voice.render(64, 0.25, 44100, 90);
      const b = voice.render(64, 0.25, 44100, 90);
      expect(Array.from(a)).toEqual(Array.from(b));
    });
  });
});
