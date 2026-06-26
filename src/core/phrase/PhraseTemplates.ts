/**
 * Phrase template library — re-exports the built-in templates from the model
 * and provides convenience utilities for the phrase layer.
 *
 * Import from here rather than directly from the model when working inside
 * src/core/phrase/ or src/core/state/.
 */
export {
  PhraseTemplates,
  PhraseZone,
  targetTensionAt,
  classifyPhrasePosition,
} from "../model/PhraseTemplate.js";
export type { PhraseTemplate } from "../model/PhraseTemplate.js";

import type { PhraseTemplate } from "../model/PhraseTemplate.js";

/**
 * Creates a custom phrase template with a validated tension curve.
 * Throws if tensionCurve length does not match phraseLength or if any
 * value falls outside [0, 1].
 */
export function createPhraseTemplate(
  phraseLength: number,
  tensionCurve: readonly number[],
  name?: string,
): PhraseTemplate {
  if (tensionCurve.length !== phraseLength) {
    throw new Error(
      `createPhraseTemplate: tensionCurve length (${tensionCurve.length}) must equal phraseLength (${phraseLength})`,
    );
  }
  for (const [i, v] of tensionCurve.entries()) {
    if (v < 0 || v > 1) {
      throw new Error(`createPhraseTemplate: tensionCurve[${i}] = ${v} is out of range [0, 1]`);
    }
  }
  return name !== undefined ? { phraseLength, tensionCurve, name } : { phraseLength, tensionCurve };
}
