import { describe, it, expect } from "vitest";
import { chordId } from "../../../../src/core/model/ChordId.js";
import type { GenerationResult } from "../../../../src/core/generator/GenerationResult.js";
import { resolveMidiExportConfig } from "../../../../src/midi/model/MidiExportConfig.js";
import { ChordTimelineBuilder } from "../../../../src/midi/timeline/ChordTimelineBuilder.js";
import { MidiEventScheduler } from "../../../../src/midi/timeline/MidiEventScheduler.js";

function resultOf(initial: string, rest: readonly string[]): GenerationResult {
  return {
    initialChord: chordId(initial),
    chords: rest.map(chordId),
  } as unknown as GenerationResult;
}

const result = resultOf("I", ["IV", "V7", "I"]);
const config = resolveMidiExportConfig({ key: "C", chordDurationBeats: 4 });
const timeline = ChordTimelineBuilder.build({ result, config });

describe("MidiEventScheduler", () => {
  const track = MidiEventScheduler.schedule({ timeline, config });

  it("flattens every chord's notes into the track (3+3+4+3 = 13 notes)", () => {
    expect(track.notes).toHaveLength(13);
  });

  it("matches the chord voicings from Wave 2, in voicing order", () => {
    expect(track.notes.map((n) => n.midiNoteNumber)).toEqual([
      60,
      64,
      67, // I
      65,
      69,
      72, // IV
      67,
      71,
      74,
      77, // V7
      60,
      64,
      67, // I
    ]);
  });

  it("keeps notes sorted by startBeat", () => {
    const starts = track.notes.map((n) => n.startBeat);
    expect(starts).toEqual([...starts].sort((a, b) => a - b));
    expect(starts).toEqual([0, 0, 0, 4, 4, 4, 8, 8, 8, 8, 12, 12, 12]);
  });

  it("stamps channel, program, tempo, ppq, and time signature", () => {
    expect(track.channel).toBe(0);
    expect(track.program).toBe(0);
    expect(track.bpm).toBe(timeline.bpm);
    expect(track.ppq).toBe(480);
    expect(track.timeSignature).toEqual([timeline.beatsPerMeasure, 4]);
  });

  it("the final note ends at beat 16", () => {
    const last = track.notes[track.notes.length - 1]!;
    expect(last.startBeat + last.durationBeats).toBe(16);
  });
});
