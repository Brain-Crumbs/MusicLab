import type { MidiChordEvent } from "../model/MidiChordEvent.js";

/**
 * The timed, block-chord intermediate representation that sits between a
 * `GenerationResult` and the concrete `.mid` / `.wav` exporters.
 *
 * It is deliberately exporter-agnostic: it carries *musical* timing in beats
 * (not ticks or samples) plus the tempo/metre needed to interpret those beats.
 * `ChordTimelineBuilder` produces it; `MidiEventScheduler` flattens it into a
 * `MidiTrack`.
 */
export interface ChordTimeline {
  /** One event per chord, ordered by `startBeat` (ascending, gap-free). */
  readonly events: readonly MidiChordEvent[];
  /** Tempo in beats per minute. */
  readonly bpm: number;
  /** Metre numerator — beats per measure (e.g. 4 for 4/4). */
  readonly beatsPerMeasure: number;
}
