import { describe, it, expect } from "vitest";
import { BasicChordSynth } from "../../../src/audio/synth/BasicChordSynth.js";
import type { MidiTrack } from "../../../src/midi/model/MidiTrack.js";
import type { MidiNoteEvent } from "../../../src/midi/model/MidiNoteEvent.js";

function makeTrack(notes: MidiNoteEvent[], bpm = 90): MidiTrack {
  return {
    channel: 0,
    program: 0,
    bpm,
    ppq: 480,
    timeSignature: [4, 4],
    notes,
  };
}

describe("BasicChordSynth", () => {
  describe("buffer duration (AUD-5.8)", () => {
    it("matches beats/BPM: a 16-beat track @ 90 BPM ⇒ ~470400 frames", () => {
      // One note spanning beats [0, 16): end-beat 16 ⇒ 16·60/90 = 10.667 s.
      const track = makeTrack(
        [{ midiNoteNumber: 60, startBeat: 0, durationBeats: 16, velocity: 80 }],
        90,
      );

      const buffer = BasicChordSynth.render({ track });

      const expected = Math.round(((16 * 60) / 90) * 44100); // 470400
      expect(buffer.length).toBe(expected);
      expect(buffer.samples.length).toBe(buffer.length);
      expect(buffer.sampleRate).toBe(44100);
      expect(buffer.channels).toBe(1);
    });

    it("uses the latest note end-beat for total duration", () => {
      const track = makeTrack([
        { midiNoteNumber: 60, startBeat: 0, durationBeats: 4, velocity: 80 },
        { midiNoteNumber: 64, startBeat: 4, durationBeats: 4, velocity: 80 }, // ends at beat 8
      ]);

      const buffer = BasicChordSynth.render({ track });

      const expected = Math.round(((8 * 60) / 90) * 44100);
      expect(buffer.length).toBe(expected);
    });

    it("honours bpm and sampleRate overrides", () => {
      const track = makeTrack([
        { midiNoteNumber: 60, startBeat: 0, durationBeats: 4, velocity: 80 },
      ]);

      const buffer = BasicChordSynth.render({ track, config: { bpm: 120, sampleRate: 48000 } });

      const expected = Math.round(((4 * 60) / 120) * 48000); // 2 s × 48000
      expect(buffer.length).toBe(expected);
      expect(buffer.sampleRate).toBe(48000);
    });
  });

  describe("normalization (AUD-5.6)", () => {
    it("keeps a stacked chord within [-1, 1] and at or below the gain ceiling", () => {
      // A four-note chord would sum past 1 before normalization.
      const track = makeTrack([
        { midiNoteNumber: 60, startBeat: 0, durationBeats: 4, velocity: 127 },
        { midiNoteNumber: 64, startBeat: 0, durationBeats: 4, velocity: 127 },
        { midiNoteNumber: 67, startBeat: 0, durationBeats: 4, velocity: 127 },
        { midiNoteNumber: 71, startBeat: 0, durationBeats: 4, velocity: 127 },
      ]);

      const buffer = BasicChordSynth.render({ track, config: { gain: 0.2 } });

      let peak = 0;
      for (const s of buffer.samples) {
        expect(s).toBeGreaterThanOrEqual(-1);
        expect(s).toBeLessThanOrEqual(1);
        peak = Math.max(peak, Math.abs(s));
      }
      // Peak is attenuated to the gain ceiling (small float slack).
      expect(peak).toBeLessThanOrEqual(0.2 + 1e-6);
      expect(peak).toBeGreaterThan(0);
    });
  });

  it("is deterministic for the same track + config", () => {
    const track = makeTrack([
      { midiNoteNumber: 60, startBeat: 0, durationBeats: 2, velocity: 90 },
      { midiNoteNumber: 67, startBeat: 2, durationBeats: 2, velocity: 90 },
    ]);

    const a = BasicChordSynth.render({ track });
    const b = BasicChordSynth.render({ track });
    expect(Array.from(a.samples)).toEqual(Array.from(b.samples));
  });

  it("returns an empty buffer for a track with no notes", () => {
    const buffer = BasicChordSynth.render({ track: makeTrack([]) });
    expect(buffer.length).toBe(0);
    expect(buffer.samples.length).toBe(0);
  });
});
