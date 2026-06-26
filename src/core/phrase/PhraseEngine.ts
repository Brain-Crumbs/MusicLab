import {
  targetTensionAt,
  classifyPhrasePosition,
  PhraseZone,
} from "../model/PhraseTemplate.js";
import type { PhraseTemplate } from "../model/PhraseTemplate.js";

/**
 * A snapshot of the phrase context at a single generation step.
 * Consumed by factor engines (PhraseFitFactor, CadenceFitFactor) and the
 * StateTransitioner without them needing a direct reference to PhraseEngine.
 */
export interface PhraseFrame {
  readonly phrasePosition: number;
  readonly phraseLength: number;
  readonly zone: PhraseZone;
  readonly targetTension: number;
  readonly isAtEnd: boolean;
  readonly isPreCadential: boolean;
}

/**
 * Stateless helper that interprets a PhraseTemplate for a given position.
 *
 * PhraseEngine does not choose chords — it only exposes the desired tension
 * and zone at each position so that factors and the state machine can read it.
 */
export class PhraseEngine {
  private readonly _template: PhraseTemplate;

  constructor(template: PhraseTemplate) {
    this._template = template;
  }

  get template(): PhraseTemplate {
    return this._template;
  }

  get phraseLength(): number {
    return this._template.phraseLength;
  }

  /** Target tension at the given position, clamped to the valid range. */
  getTargetTension(phrasePosition: number): number {
    return targetTensionAt(this._template, phrasePosition);
  }

  /** Zone of the phrase at the given position. */
  classifyPosition(phrasePosition: number): PhraseZone {
    return classifyPhrasePosition(phrasePosition, this._template.phraseLength);
  }

  /**
   * Builds a PhraseFrame snapshot for the given phrase position.
   * Factors consume PhraseFrame rather than calling PhraseEngine directly so
   * they remain testable without constructing a full engine.
   */
  buildFrame(phrasePosition: number): PhraseFrame {
    const len = this._template.phraseLength;
    return {
      phrasePosition,
      phraseLength: len,
      zone: this.classifyPosition(phrasePosition),
      targetTension: this.getTargetTension(phrasePosition),
      isAtEnd: phrasePosition >= len - 1,
      isPreCadential: phrasePosition === len - 2 && len > 2,
    };
  }
}
