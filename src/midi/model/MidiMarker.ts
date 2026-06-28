/**
 * A named marker meta-event placed at a point on the beat timeline.
 *
 * The scheduler emits one marker per chord (its `chordName`, e.g. `C`, `G7`) so
 * exporters can write MIDI marker meta-events — a DAW then shows the chord name
 * at each boundary.  Whether they are actually written is gated downstream by
 * `MidiExportConfig.includeChordNamesAsMarkers`; carrying them on the track
 * keeps the intermediate representation complete regardless of that choice.
 *
 * beat: position in beats (same unit as `MidiNoteEvent.startBeat`).
 * text: the marker label.
 */
export interface MidiMarker {
  readonly beat: number;
  readonly text: string;
}
