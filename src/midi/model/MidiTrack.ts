import type { MidiNoteEvent } from "./MidiNoteEvent.js";
import type { MidiMarker } from "./MidiMarker.js";

/**
 * Flattened, ordered note schedule consumed by exporters and the synth layer.
 * Scheduling logic (converting chords → individual notes) lives in Wave 3.
 *
 * channel: 0-based MIDI channel (0 = channel 1 in most DAWs).
 * program: GM program number (0–127).
 * ppq: ticks per quarter note, e.g. 480.
 * timeSignature: [beatsPerBar, beatUnit] — e.g. [4, 4] for common time.
 * markers: optional named markers (one per chord) for exporters that emit
 *   marker meta-events; honoured by MIDI export when
 *   `MidiExportConfig.includeChordNamesAsMarkers` is set. The synth ignores them.
 */
export interface MidiTrack {
  readonly name?: string;
  readonly channel: number;
  readonly program: number;
  readonly bpm: number;
  readonly ppq: number;
  readonly timeSignature: [number, number];
  readonly notes: readonly MidiNoteEvent[];
  readonly markers?: readonly MidiMarker[];
}
