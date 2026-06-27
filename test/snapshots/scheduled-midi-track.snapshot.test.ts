import { describe, it, expect } from "vitest";
import { createDefaultMvpGenerator } from "../../src/core/generator/createDefaultMvpGenerator.js";
import { chordId } from "../../src/core/model/ChordId.js";
import { resolveMidiExportConfig } from "../../src/midi/model/MidiExportConfig.js";
import { ChordTimelineBuilder } from "../../src/midi/timeline/ChordTimelineBuilder.js";
import { MidiEventScheduler } from "../../src/midi/timeline/MidiEventScheduler.js";

/**
 * MIDI-3.6 — scheduled MidiTrack snapshot.
 *
 * Pins the *intent* of the scheduled track (note pitches, beats, durations,
 * velocities, and track metadata) for a fixed seed — never raw MIDI bytes,
 * which are a Wave-4 concern and vary by encoder/library version.
 *
 * A fixed seed makes the source GenerationResult deterministic, so this whole
 * pipeline (generate → timeline → schedule) must yield a stable track.
 */
const SEED = 4242;

describe("MIDI-3.6 — scheduled MidiTrack snapshot", () => {
  const result = createDefaultMvpGenerator({ key: "C", seed: SEED }).generate({
    steps: 8,
    initialChord: chordId("I"),
  });

  const config = resolveMidiExportConfig({ key: "C", chordDurationBeats: 4 });
  const timeline = ChordTimelineBuilder.build({ result, config });
  const track = MidiEventScheduler.schedule({ timeline, config });

  it("matches the recorded ChordTimeline", () => {
    expect(timeline).toMatchSnapshot();
  });

  it("matches the recorded MidiTrack", () => {
    expect(track).toMatchSnapshot();
  });
});
