import type { ChordTimeline } from "./ChordTimeline.js";
import type { MidiExportConfig } from "../model/MidiExportConfig.js";
import type { MidiTrack } from "../model/MidiTrack.js";
import type { MidiNoteEvent } from "../model/MidiNoteEvent.js";

export interface MidiScheduleInput {
  readonly timeline: ChordTimeline;
  /**
   * The export config the timeline was built from.  Accepted for symmetry with
   * the rest of the pipeline; scheduling reads tempo/metre straight off the
   * timeline (the canonical IR), so nothing further is needed from it here.
   */
  readonly config: MidiExportConfig;
}

/** Ticks per quarter note for the scheduled track. */
const DEFAULT_PPQ = 480;
/** 0-based MIDI channel (0 = channel 1 in most DAWs). */
const DEFAULT_CHANNEL = 0;
/** GM program number — 0 = Acoustic Grand Piano. */
const DEFAULT_PROGRAM = 0;

/**
 * MIDI-3.3 — flattens a {@link ChordTimeline} into a single ordered
 * {@link MidiTrack}.
 *
 * For block chords this is a straight flatten: every note in every
 * `MidiChordEvent` already carries the chord's `startBeat`/`durationBeats`, so
 * the scheduler just collects them, sorts by start time, and stamps the
 * track-level metadata (channel, program, tempo, ppq, time signature).
 *
 * Pure and deterministic.
 */
export class MidiEventScheduler {
  static schedule({ timeline }: MidiScheduleInput): MidiTrack {
    const notes: MidiNoteEvent[] = timeline.events
      .flatMap((event) => event.notes)
      // Stable order by start time; ties keep their original (pitch) order so a
      // chord's notes stay grouped exactly as the voicing engine produced them.
      .sort((a, b) => a.startBeat - b.startBeat);

    return {
      channel: DEFAULT_CHANNEL,
      program: DEFAULT_PROGRAM,
      bpm: timeline.bpm,
      ppq: DEFAULT_PPQ,
      timeSignature: [timeline.beatsPerMeasure, 4],
      notes,
    };
  }
}
