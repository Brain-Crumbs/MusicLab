/**
 * Configuration for the dependency-free PCM synth (Wave 5).
 *
 * sampleRate: output samples per second (e.g. 44100).
 * channels: 1 = mono, 2 = stereo. MVP renders mono only.
 * bpm: tempo used to convert note beats → wall-clock seconds.
 * attackSeconds / releaseSeconds: per-note envelope ramps (prevent clicks).
 * gain: normalization target / peak ceiling in [0, 1] (keeps mixes off the rails).
 *
 * All fields have defaults via `DefaultAudioRenderConfig`; merge caller
 * overrides with `resolveAudioRenderConfig` (respects `exactOptionalPropertyTypes`).
 */
export interface AudioRenderConfig {
  readonly sampleRate: number;
  readonly channels: 1 | 2;
  readonly bpm: number;
  readonly attackSeconds: number;
  readonly releaseSeconds: number;
  readonly gain: number;
}

export const DefaultAudioRenderConfig: AudioRenderConfig = {
  sampleRate: 44100,
  channels: 1,
  bpm: 90,
  attackSeconds: 0.02,
  releaseSeconds: 0.2,
  gain: 0.2,
};

/**
 * Merge caller overrides on top of `DefaultAudioRenderConfig`.
 * Only defined keys in `overrides` are applied; undefined values are skipped
 * so that `exactOptionalPropertyTypes` is satisfied.
 */
export function resolveAudioRenderConfig(
  overrides?: Partial<AudioRenderConfig>,
): AudioRenderConfig {
  if (overrides === undefined) {
    return DefaultAudioRenderConfig;
  }

  return {
    ...DefaultAudioRenderConfig,
    ...(overrides.sampleRate !== undefined ? { sampleRate: overrides.sampleRate } : {}),
    ...(overrides.channels !== undefined ? { channels: overrides.channels } : {}),
    ...(overrides.bpm !== undefined ? { bpm: overrides.bpm } : {}),
    ...(overrides.attackSeconds !== undefined ? { attackSeconds: overrides.attackSeconds } : {}),
    ...(overrides.releaseSeconds !== undefined ? { releaseSeconds: overrides.releaseSeconds } : {}),
    ...(overrides.gain !== undefined ? { gain: overrides.gain } : {}),
  };
}
