import { classifyPhrasePosition, PhraseZone } from "../model/PhraseTemplate.js";

/**
 * Stateless utility for classifying phrase positions into PhraseZones.
 *
 * Wraps the model helper with named boolean accessors so calling code reads
 * naturally ("PhrasePositionClassifier.isEnding(pos, len)") rather than
 * comparing against enum values inline.
 */
export class PhrasePositionClassifier {
  /** Zone for the given position within a phrase of the given length. */
  static classify(phrasePosition: number, phraseLength: number): PhraseZone {
    return classifyPhrasePosition(phrasePosition, phraseLength);
  }

  static isBeginning(phrasePosition: number, phraseLength: number): boolean {
    return classifyPhrasePosition(phrasePosition, phraseLength) === PhraseZone.Beginning;
  }

  static isMiddle(phrasePosition: number, phraseLength: number): boolean {
    return classifyPhrasePosition(phrasePosition, phraseLength) === PhraseZone.Middle;
  }

  static isPreCadential(phrasePosition: number, phraseLength: number): boolean {
    return classifyPhrasePosition(phrasePosition, phraseLength) === PhraseZone.PreCadential;
  }

  static isEnding(phrasePosition: number, phraseLength: number): boolean {
    return classifyPhrasePosition(phrasePosition, phraseLength) === PhraseZone.Ending;
  }
}
