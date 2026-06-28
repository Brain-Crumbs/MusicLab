import { describe, it, expect } from "vitest";
import { MidiWriterFileExporter } from "../../../../src/midi/export/MidiWriterFileExporter.js";
import { resolveMidiExportConfig } from "../../../../src/midi/model/MidiExportConfig.js";
import type { MidiTrack } from "../../../../src/midi/model/MidiTrack.js";

/**
 * MIDI-4 / issue #48 — `includeChordNamesAsMarkers` must actually change the
 * exported bytes: when on, chord names appear as MIDI marker meta-events; when
 * off, none are written and the note stream is otherwise unchanged.
 */

/** A gap-free two-chord track with markers, mirroring the scheduler's output. */
const track: MidiTrack = {
  channel: 0,
  program: 0,
  bpm: 90,
  ppq: 480,
  timeSignature: [4, 4],
  notes: [
    { midiNoteNumber: 60, startBeat: 0, durationBeats: 4, velocity: 80 },
    { midiNoteNumber: 64, startBeat: 0, durationBeats: 4, velocity: 80 },
    { midiNoteNumber: 67, startBeat: 4, durationBeats: 4, velocity: 80 },
    { midiNoteNumber: 71, startBeat: 4, durationBeats: 4, velocity: 80 },
  ],
  markers: [
    { beat: 0, text: "C" },
    { beat: 4, text: "Em" },
  ],
};

/** Scan for MIDI marker meta-events (`FF 06 <len> <text>`) and return their text. */
function markerTexts(bytes: Uint8Array): string[] {
  const out: string[] = [];
  for (let i = 0; i + 2 < bytes.length; i++) {
    if (bytes[i] === 0xff && bytes[i + 1] === 0x06) {
      const len = bytes[i + 2] ?? 0;
      let text = "";
      for (let j = 0; j < len; j++) text += String.fromCharCode(bytes[i + 3 + j] ?? 0);
      out.push(text);
    }
  }
  return out;
}

describe("MidiWriterFileExporter — chord-name markers (#48)", () => {
  const exporter = new MidiWriterFileExporter();

  it("writes a marker meta-event per chord when includeChordNamesAsMarkers is true", () => {
    const config = resolveMidiExportConfig({ includeChordNamesAsMarkers: true });
    expect(markerTexts(exporter.export(track, config))).toEqual(["C", "Em"]);
  });

  it("writes no markers when includeChordNamesAsMarkers is false", () => {
    const config = resolveMidiExportConfig({ includeChordNamesAsMarkers: false });
    expect(markerTexts(exporter.export(track, config))).toEqual([]);
  });

  it("is on by default (the field defaults to true)", () => {
    expect(markerTexts(exporter.export(track, resolveMidiExportConfig()))).toEqual(["C", "Em"]);
  });

  it("does not write markers when the track carries none", () => {
    const { markers: _omit, ...noMarkers } = track;
    const config = resolveMidiExportConfig({ includeChordNamesAsMarkers: true });
    expect(markerTexts(exporter.export(noMarkers, config))).toEqual([]);
  });

  it("markers are additive: enabling them grows the file by exactly the marker bytes", () => {
    // Each marker is a zero-delta meta-event emitted before a chord's NoteEvent:
    // 1 delta byte + 0xFF 0x06 + 1 length byte + the text bytes. Proving the
    // size delta equals *only* that payload shows no note event was shifted.
    const on = exporter.export(track, resolveMidiExportConfig({ includeChordNamesAsMarkers: true }));
    const off = exporter.export(
      track,
      resolveMidiExportConfig({ includeChordNamesAsMarkers: false }),
    );

    const markerBytes = (track.markers ?? []).reduce(
      (sum, m) => sum + 4 + m.text.length, // delta(1) + FF + 06 + len(1) + text
      0,
    );
    expect(on.length).toBe(off.length + markerBytes);
  });
});
