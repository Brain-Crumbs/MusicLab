import { describe, it, expect } from "vitest";
import { BasicChordSynth } from "../../src/audio/synth/BasicChordSynth.js";
import type { MidiTrack } from "../../src/midi/model/MidiTrack.js";

/**
 * AUD-5.9 — the synth must produce audible (non-silent), non-clipping audio.
 */
describe("BasicChordSynth audio smoke (AUD-5.9)", () => {
  const track: MidiTrack = {
    name: "smoke",
    channel: 0,
    program: 0,
    bpm: 90,
    ppq: 480,
    timeSignature: [4, 4],
    notes: [
      // I chord (C major) for 4 beats, then V chord (G major) for 4 beats.
      { midiNoteNumber: 60, startBeat: 0, durationBeats: 4, velocity: 90 },
      { midiNoteNumber: 64, startBeat: 0, durationBeats: 4, velocity: 90 },
      { midiNoteNumber: 67, startBeat: 0, durationBeats: 4, velocity: 90 },
      { midiNoteNumber: 67, startBeat: 4, durationBeats: 4, velocity: 90 },
      { midiNoteNumber: 71, startBeat: 4, durationBeats: 4, velocity: 90 },
      { midiNoteNumber: 74, startBeat: 4, durationBeats: 4, velocity: 90 },
    ],
  };

  it("renders a buffer with real energy (not all zeros)", () => {
    const buffer = BasicChordSynth.render({ track });

    expect(buffer.length).toBeGreaterThan(0);

    let sumSquares = 0;
    let peak = 0;
    let nonZero = 0;
    for (const s of buffer.samples) {
      sumSquares += s * s;
      peak = Math.max(peak, Math.abs(s));
      if (s !== 0) nonZero++;
    }
    const rms = Math.sqrt(sumSquares / buffer.length);

    expect(nonZero).toBeGreaterThan(0);
    expect(rms).toBeGreaterThan(1e-4);
    expect(peak).toBeGreaterThan(1e-3);
    // Non-clipping.
    expect(peak).toBeLessThanOrEqual(1);
  });
});
