import MidiWriter from "midi-writer-js";
import type { MidiFileExporter } from "./MidiFileExporter.js";
import type { MidiTrack } from "../model/MidiTrack.js";
import type { MidiNoteEvent } from "../model/MidiNoteEvent.js";
import type { MidiExportConfig } from "../model/MidiExportConfig.js";

/**
 * midi-writer-js fixes its internal resolution at 128 ticks per quarter note,
 * independent of our model's PPQ (which is the resolution the *scheduler*
 * works in).  Durations are therefore converted into the encoder's own grid
 * via this constant rather than `MidiTrack.ppq`.
 */
const WRITER_TICKS_PER_QUARTER = 128;

/**
 * MIDI-4.3 — concrete {@link MidiFileExporter} backed by midi-writer-js.
 *
 * The library is reached *only* through this class; nothing else in the
 * codebase imports midi-writer-js, so swapping encoders is a one-file change.
 *
 * Strategy: our scheduled {@link MidiTrack} is a flat, time-ordered list of
 * notes.  Block chords appear as several notes sharing one `startBeat`, so we
 * regroup by start time and emit one `NoteEvent` (with a pitch *array*) per
 * group — that is what makes a chord's notes sound together.  Consecutive
 * `NoteEvent`s play back-to-back; any gap between one group's end and the next
 * group's start is expressed as the next event's `wait`.
 */
export class MidiWriterFileExporter implements MidiFileExporter {
  export(track: MidiTrack, _config: MidiExportConfig): Uint8Array {
    const writerTrack = new MidiWriter.Track();

    if (track.name !== undefined) {
      writerTrack.addTrackName(track.name);
    }
    writerTrack.setTempo(track.bpm);
    // midi-writer-js types mark the clock fields as required; pass its own
    // documented defaults (24 MIDI clocks/tick, 8 notated 32nds per beat).
    writerTrack.setTimeSignature(track.timeSignature[0], track.timeSignature[1], 24, 8);
    // GM program select.  Our model channel is 0-based; midi-writer-js channels
    // are 1-based, so shift by one here (the one place the two worlds meet).
    writerTrack.addEvent(
      new MidiWriter.ProgramChangeEvent({
        instrument: track.program,
        channel: track.channel + 1,
      }),
    );

    let previousEndBeat = 0;
    for (const group of groupNotesByStartBeat(track.notes)) {
      const waitBeats = group.startBeat - previousEndBeat;

      writerTrack.addEvent(
        new MidiWriter.NoteEvent({
          pitch: group.pitches,
          duration: durationTicks(group.durationBeats),
          velocity: toWriterVelocity(group.velocity),
          channel: track.channel + 1,
          // Only carry a wait when there is an actual gap; back-to-back chords
          // (the block-chord MVP) need none, keeping the byte output minimal.
          ...(waitBeats > 0 ? { wait: durationTicks(waitBeats) } : {}),
        }),
      );

      previousEndBeat = group.startBeat + group.durationBeats;
    }

    return new MidiWriter.Writer([writerTrack]).buildFile();
  }
}

interface NoteGroup {
  readonly startBeat: number;
  readonly durationBeats: number;
  readonly velocity: number;
  readonly pitches: number[];
}

/**
 * Regroup a flat, time-ordered note list back into simultaneous note groups
 * (chords) keyed by `startBeat`, returned in ascending start order.
 *
 * Within a block chord every note shares the same `durationBeats`/`velocity`;
 * we take the longest duration and the max velocity in a group defensively so
 * an uneven voicing still produces a sensible single `NoteEvent`.
 */
function groupNotesByStartBeat(notes: readonly MidiNoteEvent[]): NoteGroup[] {
  const byStart = new Map<number, { duration: number; velocity: number; pitches: number[] }>();

  for (const note of notes) {
    const existing = byStart.get(note.startBeat);
    if (existing === undefined) {
      byStart.set(note.startBeat, {
        duration: note.durationBeats,
        velocity: note.velocity,
        pitches: [note.midiNoteNumber],
      });
    } else {
      existing.pitches.push(note.midiNoteNumber);
      existing.duration = Math.max(existing.duration, note.durationBeats);
      existing.velocity = Math.max(existing.velocity, note.velocity);
    }
  }

  return [...byStart.entries()]
    .sort(([a], [b]) => a - b)
    .map(([startBeat, group]) => ({
      startBeat,
      durationBeats: group.duration,
      velocity: group.velocity,
      pitches: group.pitches,
    }));
}

/** Express a beat count as a midi-writer-js explicit-tick duration string. */
function durationTicks(beats: number): string {
  return `T${Math.round(beats * WRITER_TICKS_PER_QUARTER)}`;
}

/**
 * Map our standard MIDI velocity (0–127) onto midi-writer-js's 1–100 input
 * scale, which it then re-expands to 0–127 on write.  Round-tripping this way
 * preserves the intended dynamic (e.g. 80 → 63 → 80) instead of passing a
 * 0–127 value into a 1–100 field and silently boosting it.
 */
function toWriterVelocity(midiVelocity: number): number {
  const scaled = Math.round((midiVelocity / 127) * 100);
  return Math.min(100, Math.max(1, scaled));
}
