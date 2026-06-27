import type { GenerationResult } from "../core/generator/GenerationResult.js";
import type { MidiExportConfig } from "../midi/model/MidiExportConfig.js";
import { resolveMidiExportConfig } from "../midi/model/MidiExportConfig.js";
import { ChordTimelineBuilder } from "../midi/timeline/ChordTimelineBuilder.js";
import { MidiEventScheduler } from "../midi/timeline/MidiEventScheduler.js";
import { MidiWriterFileExporter } from "../midi/export/MidiWriterFileExporter.js";
import type { AudioRenderConfig } from "../audio/model/AudioRenderConfig.js";
import { resolveAudioRenderConfig } from "../audio/model/AudioRenderConfig.js";
import { BasicChordSynth } from "../audio/synth/BasicChordSynth.js";
import { WavFileEncoder } from "../audio/export/WavFileEncoder.js";

/**
 * Overrides accepted by {@link exportPlayableChordProgression}.
 *
 * The MIDI-side fields (key, mode, bpm, voicing, …) drive the shared timeline;
 * the audio-only fields (sampleRate, channels, envelope, gain) tune the synth.
 * `bpm` lives in {@link MidiExportConfig} and is forwarded to the synth so the
 * `.wav` always plays back at the same tempo the `.mid` notates.
 */
export type PlaybackExportOverrides = Partial<MidiExportConfig> & Partial<AudioRenderConfig>;

/** The two byte streams produced from a single shared track. */
export interface PlayableProgression {
  /** Standard MIDI File bytes (begins with the `MThd` header chunk). */
  readonly midi: Uint8Array;
  /** 16-bit PCM `.wav` bytes (begins with the 44-byte `RIFF`/`WAVE` header). */
  readonly wav: Uint8Array;
}

const exporter = new MidiWriterFileExporter();

/**
 * PLAY-7.1 — the one-call public bridge from a {@link GenerationResult} to
 * *both* a `.mid` and a `.wav`, rendered from the **same** scheduled track.
 *
 * Single source of truth: the {@link ChordTimeline} and {@link MidiTrack} are
 * built exactly once, then the pipeline branches.  MIDI and audio therefore
 * cannot drift — they share identical tempo, voicing, and note timing.  This is
 * deliberately *not* `exportMidiFromGeneration` + `exportWavFromGeneration` back
 * to back, which would schedule the track twice.
 *
 *   resolve configs → ChordTimelineBuilder → MidiEventScheduler
 *                        ├── MidiWriterFileExporter.export → midi
 *                        └── BasicChordSynth.render → WavFileEncoder.encode → wav
 *
 * @param result    A finished generation run.
 * @param overrides Optional {@link PlaybackExportOverrides}; MIDI fields merge
 *                  onto `DefaultMidiExportConfig`, audio fields onto
 *                  `DefaultAudioRenderConfig` (with a shared `bpm`).
 * @returns `{ midi, wav }` — both buffers from one track.
 */
export function exportPlayableChordProgression(
  result: GenerationResult,
  overrides?: PlaybackExportOverrides,
): PlayableProgression {
  const midiConfig = resolveMidiExportConfig(overrides);
  const audioConfig = resolveAudioConfig(midiConfig.bpm, overrides);

  // Build the shared timeline + track ONCE — the whole point of this helper.
  const timeline = ChordTimelineBuilder.build({ result, config: midiConfig });
  const track = MidiEventScheduler.schedule({ timeline, config: midiConfig });

  const midi = exporter.export(track, midiConfig);
  const wav = WavFileEncoder.encode(BasicChordSynth.render({ track, config: audioConfig }));

  return { midi, wav };
}

/**
 * Merge the audio-only overrides onto the synth defaults, forcing `bpm` to the
 * resolved MIDI tempo so the two stay in lock-step.  Only defined keys are
 * forwarded, respecting `exactOptionalPropertyTypes`.
 */
function resolveAudioConfig(
  bpm: number,
  overrides: PlaybackExportOverrides | undefined,
): AudioRenderConfig {
  return resolveAudioRenderConfig({
    bpm,
    ...(overrides?.sampleRate !== undefined ? { sampleRate: overrides.sampleRate } : {}),
    ...(overrides?.channels !== undefined ? { channels: overrides.channels } : {}),
    ...(overrides?.attackSeconds !== undefined ? { attackSeconds: overrides.attackSeconds } : {}),
    ...(overrides?.releaseSeconds !== undefined
      ? { releaseSeconds: overrides.releaseSeconds }
      : {}),
    ...(overrides?.gain !== undefined ? { gain: overrides.gain } : {}),
  });
}
