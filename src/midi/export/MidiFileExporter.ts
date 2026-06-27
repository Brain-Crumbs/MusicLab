import type { MidiTrack } from "../model/MidiTrack.js";
import type { MidiExportConfig } from "../model/MidiExportConfig.js";

/**
 * MIDI-4.1 — the swappable boundary between our internal {@link MidiTrack}
 * representation and a concrete `.mid` byte encoder.
 *
 * Keeping this an interface lets us hide the encoding library entirely: the
 * MVP ships {@link MidiWriterFileExporter} (midi-writer-js), but a future
 * `ToneMidiFileExporter` (`@tonejs/midi`) — or a hand-rolled encoder — can drop
 * in without touching the timeline, scheduler, or `src/core/**`.
 *
 * Implementations must be pure: the same `track` + `config` always yields the
 * same bytes (modulo the encoder library's own versioning).
 */
export interface MidiFileExporter {
  /**
   * Serialize a scheduled {@link MidiTrack} to a standard MIDI (`.mid`) byte
   * stream. The result starts with the `MThd` header chunk followed by one or
   * more `MTrk` chunks.
   */
  export(track: MidiTrack, config: MidiExportConfig): Uint8Array;
}
