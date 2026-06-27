import { describe, it, expect } from "vitest";
import { chordId } from "../../../../src/core/model/ChordId.js";
import type { GenerationResult } from "../../../../src/core/generator/GenerationResult.js";
import { resolveMidiExportConfig } from "../../../../src/midi/model/MidiExportConfig.js";
import { ChordTimelineBuilder } from "../../../../src/midi/timeline/ChordTimelineBuilder.js";

/**
 * Minimal GenerationResult stub.  The timeline builder only reads
 * `initialChord` and `chords` on the default path (key comes from the export
 * config), so the heavier trace/step machinery is irrelevant here.
 */
function resultOf(initial: string, rest: readonly string[]): GenerationResult {
  return {
    initialChord: chordId(initial),
    chords: rest.map(chordId),
  } as unknown as GenerationResult;
}

// I - IV - V7 - I  ⇒  4 chords once the initial chord is prepended.
const result = resultOf("I", ["IV", "V7", "I"]);
const config = resolveMidiExportConfig({ key: "C", chordDurationBeats: 4 });

describe("MIDI-3.4 — one chord per measure", () => {
  const timeline = ChordTimelineBuilder.build({ result, config });

  it("prepends the initial chord (4 chords from I + [IV,V7,I])", () => {
    expect(timeline.events.map((e) => e.chordId)).toEqual(["I", "IV", "V7", "I"]);
  });

  it("places one event per measure at 4-beat intervals", () => {
    expect(timeline.events.map((e) => e.startBeat)).toEqual([0, 4, 8, 12]);
  });

  it("spans 16 beats total — the last note ends at beat 16", () => {
    const last = timeline.events[timeline.events.length - 1]!;
    expect(last.startBeat + last.durationBeats).toBe(16);
  });

  it("carries the configured tempo and metre", () => {
    expect(timeline.bpm).toBe(config.bpm);
    expect(timeline.beatsPerMeasure).toBe(config.beatsPerMeasure);
  });

  it("renders concrete chord names in the configured key", () => {
    expect(timeline.events.map((e) => e.chordName)).toEqual(["C", "F", "G7", "C"]);
  });
});

describe("MIDI-3.5 — note durations", () => {
  const timeline = ChordTimelineBuilder.build({ result, config });

  it("every note in a chord shares the chord's start and duration", () => {
    for (const event of timeline.events) {
      for (const note of event.notes) {
        expect(note.startBeat).toBe(event.startBeat);
        expect(note.durationBeats).toBe(event.durationBeats);
      }
    }
  });

  it("each chord's notes span the full measure (durationBeats === chordDurationBeats)", () => {
    for (const event of timeline.events) {
      expect(event.durationBeats).toBe(config.chordDurationBeats);
    }
  });

  it("voices block chords from the Wave 2 catalog (C major triads / V7)", () => {
    const pitches = timeline.events.map((e) => e.notes.map((n) => n.midiNoteNumber));
    expect(pitches).toEqual([
      [60, 64, 67], // I  → C E G
      [65, 69, 72], // IV → F A C
      [67, 71, 74, 77], // V7 → G B D F
      [60, 64, 67], // I  → C E G
    ]);
  });

  it("stamps the configured velocity on every note", () => {
    const velocities = timeline.events.flatMap((e) => e.notes.map((n) => n.velocity));
    expect(new Set(velocities)).toEqual(new Set([config.velocity]));
  });
});

describe("key resolution", () => {
  it("defaults to config.key", () => {
    const tl = ChordTimelineBuilder.build({
      result,
      config: resolveMidiExportConfig({ key: "G" }),
    });
    // I in G major → G B D
    expect(tl.events[0]!.notes.map((n) => n.midiNoteNumber)).toEqual([67, 71, 74]);
    expect(tl.events[0]!.chordName).toBe("G");
  });

  it("honours an explicit key override", () => {
    const tl = ChordTimelineBuilder.build({
      result,
      config: resolveMidiExportConfig({ key: "C" }),
      key: "G",
    });
    expect(tl.events[0]!.chordName).toBe("G");
  });
});
