import type { ChordId } from "../model/ChordId.js";

/**
 * Maintains the per-chord play count used by NoveltyFactor and MemoryFactor.
 *
 * All methods are pure — they return new objects rather than mutating the
 * input record, consistent with the immutable MusicalState contract.
 */
export class RepetitionTracker {
  /**
   * Returns a new counts record with `chord` incremented by 1.
   * Safe to call with an empty record for the initial chord.
   */
  static update(
    previousCounts: Readonly<Record<ChordId, number>>,
    chord: ChordId,
  ): Readonly<Record<ChordId, number>> {
    return {
      ...previousCounts,
      [chord]: (previousCounts[chord] ?? 0) + 1,
    };
  }

  /** How many times the given chord has been played (0 if never). */
  static getCount(counts: Readonly<Record<ChordId, number>>, chord: ChordId): number {
    return counts[chord] ?? 0;
  }

  /** Returns an empty counts record suitable for the very first step. */
  static empty(): Readonly<Record<ChordId, number>> {
    return {};
  }
}
