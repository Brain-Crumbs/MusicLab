import type { ChordId } from "../../core/model/ChordId.js";
import type { MidiNoteEvent } from "./MidiNoteEvent.js";

/**
 * A chord as it appears in the scheduled MIDI representation.
 * `notes` contains the individual note events that make up the voicing.
 */
export interface MidiChordEvent {
  readonly chordId: ChordId;
  readonly chordName: string;
  readonly startBeat: number;
  readonly durationBeats: number;
  readonly notes: readonly MidiNoteEvent[];
}
