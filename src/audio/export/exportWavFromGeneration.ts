import type { GenerationResult } from "../../core/generator/GenerationResult.js";
import type { MidiExportConfig } from "../../midi/model/MidiExportConfig.js";
import { resolveMidiExportConfig } from "../../midi/model/MidiExportConfig.js";
import { ChordTimelineBuilder } from "../../midi/timeline/ChordTimelineBuilder.js";
import { MidiEventScheduler } from "../../midi/timeline/MidiEventScheduler.js";
import type { AudioRenderConfig } from "../model/AudioRenderConfig.js";
import { BasicChordSynth } from "../synth/BasicChordSynth.js";
import { WavFileEncoder } from "./WavFileEncoder.js";

export interface ExportWavOptions {
  /**
   * Extra render overrides forwarded to {@link BasicChordSynth} (sampleRate,
   * gain, envelope, …).  `bpm` is taken from the export config below so the
   * audio tempo always matches the rendered timeline; an explicit `bpm` here
   * still wins if you really want them to differ.
   */
  readonly audio?: Partial<AudioRenderConfig>;
}

/**
 * AUD-6.3 — the one-call public bridge from a {@link GenerationResult} to a
 * 16-bit PCM `.wav` byte stream.
 *
 * Runs the full export pipeline:
 *   resolveMidiExportConfig → ChordTimelineBuilder → MidiEventScheduler →
 *   BasicChordSynth → WavFileEncoder.encode → Uint8Array
 *
 * @param result    A finished generation run.
 * @param overrides Optional {@link MidiExportConfig} overrides (key, bpm, …);
 *                  merged onto `DefaultMidiExportConfig`.  `bpm` flows through
 *                  to the synth so audio and timeline stay in tempo lock-step.
 * @param options   Optional synth render overrides (sampleRate, gain, …).
 * @returns The `.wav` bytes (begins with the 44-byte `RIFF`/`WAVE` header).
 */
export function exportWavFromGeneration(
  result: GenerationResult,
  overrides?: Partial<MidiExportConfig>,
  options: ExportWavOptions = {},
): Uint8Array {
  const config = resolveMidiExportConfig(overrides);
  const timeline = ChordTimelineBuilder.build({ result, config });
  const track = MidiEventScheduler.schedule({ timeline, config });

  const audioConfig: Partial<AudioRenderConfig> = {
    bpm: config.bpm,
    ...options.audio,
  };
  const buffer = BasicChordSynth.render({ track, config: audioConfig });

  return WavFileEncoder.encode(buffer);
}
