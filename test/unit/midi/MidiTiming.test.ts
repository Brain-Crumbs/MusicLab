import { describe, it, expect } from "vitest";
import { MidiTiming } from "../../../src/midi/model/MidiTiming.js";

describe("MidiTiming", () => {
  describe("beatsToTicks", () => {
    it("converts 1 beat at 480 PPQ to 480 ticks", () => {
      expect(MidiTiming.beatsToTicks(1, 480)).toBe(480);
    });

    it("converts 2.5 beats at 480 PPQ correctly", () => {
      expect(MidiTiming.beatsToTicks(2.5, 480)).toBe(1200);
    });

    it("rounds fractional results", () => {
      expect(MidiTiming.beatsToTicks(1 / 3, 480)).toBe(160);
    });
  });

  describe("ticksToBeats", () => {
    it("converts 480 ticks at 480 PPQ to 1 beat", () => {
      expect(MidiTiming.ticksToBeats(480, 480)).toBe(1);
    });

    it("converts 960 ticks at 480 PPQ to 2 beats", () => {
      expect(MidiTiming.ticksToBeats(960, 480)).toBe(2);
    });
  });

  describe("beatsToSeconds", () => {
    it("converts 4 beats at 90 BPM to ~2.667 seconds", () => {
      expect(MidiTiming.beatsToSeconds(4, 90)).toBeCloseTo(2.667, 3);
    });

    it("converts 1 beat at 60 BPM to 1 second", () => {
      expect(MidiTiming.beatsToSeconds(1, 60)).toBe(1);
    });

    it("converts 1 beat at 120 BPM to 0.5 seconds", () => {
      expect(MidiTiming.beatsToSeconds(1, 120)).toBe(0.5);
    });
  });

  describe("secondsToSamples", () => {
    it("converts 1 second at 44100 Hz to 44100 samples", () => {
      expect(MidiTiming.secondsToSamples(1, 44100)).toBe(44100);
    });

    it("converts 0.5 seconds at 48000 Hz to 24000 samples", () => {
      expect(MidiTiming.secondsToSamples(0.5, 48000)).toBe(24000);
    });

    it("rounds fractional samples", () => {
      expect(MidiTiming.secondsToSamples(1 / 3, 44100)).toBe(14700);
    });
  });
});
