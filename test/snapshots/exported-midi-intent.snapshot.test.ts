import { describe, it, expect } from "vitest";
import { createDefaultMvpGenerator } from "../../src/core/generator/createDefaultMvpGenerator.js";
import { chordId } from "../../src/core/model/ChordId.js";
import { resolveMidiExportConfig } from "../../src/midi/model/MidiExportConfig.js";
import { ChordTimelineBuilder } from "../../src/midi/timeline/ChordTimelineBuilder.js";
import { MidiEventScheduler } from "../../src/midi/timeline/MidiEventScheduler.js";

/**
 * MIDI-4.7 — pre-export intent snapshot for the Wave-4 export path.
 *
 * `exportMidiFromGeneration` ends in raw `.mid` bytes, which are
 * encoder/version sensitive and so a poor thing to pin.  Instead we snapshot
 * the {@link MidiTrack} that the helper hands to the exporter — the exact same
 * pipeline (`resolveMidiExportConfig → ChordTimelineBuilder →
 * MidiEventScheduler`) the helper runs — for the documented acceptance config
 * (`{ key: "C", bpm: 90 }`).  This locks in *what* the file encodes (pitches,
 * beats, durations, velocities, track metadata) without coupling the test to
 * midi-writer-js's byte layout.
 */
const SEED = 42;

describe("MIDI-4.7 — exported MidiTrack intent snapshot", () => {
  const result = createDefaultMvpGenerator({ key: "C", seed: SEED }).generate({
    steps: 8,
    initialChord: chordId("I"),
  });

  // Mirror exportMidiFromGeneration's pipeline with its acceptance-criteria
  // overrides so the snapshot reflects exactly what gets encoded.
  const config = resolveMidiExportConfig({ key: "C", bpm: 90 });
  const timeline = ChordTimelineBuilder.build({ result, config });
  const track = MidiEventScheduler.schedule({ timeline, config });

  it("matches the recorded pre-export MidiTrack", () => {
    expect(track).toMatchSnapshot();
  });
});
