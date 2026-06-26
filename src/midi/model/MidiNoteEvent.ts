/**
 * A single scheduled MIDI note: pitch, start time, duration, and velocity.
 * All time values are in beats (converted to ticks by MidiTiming helpers).
 * midiNoteNumber follows the standard 0–127 range (middle C = 60).
 */
export interface MidiNoteEvent {
  readonly midiNoteNumber: number;
  readonly startBeat: number;
  readonly durationBeats: number;
  readonly velocity: number;
}
