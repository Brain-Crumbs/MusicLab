/**
 * Linear attack/sustain/release gain envelope applied per note.
 *
 * Gain ramps `0 → 1` over the attack, holds at `1`, then ramps `1 → 0` over the
 * release at the note's tail. Attack and release are clamped so their combined
 * length never exceeds the note — this guarantees a continuous ramp (no clicks)
 * even for very short notes.
 *
 * Pure and stateless once constructed.
 */
export class Envelope {
  private readonly attackSamples: number;
  private readonly releaseSamples: number;

  constructor(attackSeconds: number, releaseSeconds: number, sampleRate: number) {
    this.attackSamples = Math.max(0, Math.round(attackSeconds * sampleRate));
    this.releaseSamples = Math.max(0, Math.round(releaseSeconds * sampleRate));
  }

  /**
   * Gain in [0, 1] for sample `index` of a note that is `totalSamples` long.
   * Out-of-range indices return 0.
   */
  gainAt(index: number, totalSamples: number): number {
    if (totalSamples <= 0 || index < 0 || index >= totalSamples) {
      return 0;
    }

    let attack = this.attackSamples;
    let release = this.releaseSamples;

    // Clamp: if the ramps overlap, shrink them proportionally to fit the note.
    if (attack + release > totalSamples) {
      const scale = totalSamples / (attack + release);
      attack = Math.floor(attack * scale);
      release = totalSamples - attack;
    }

    if (index < attack) {
      return index / attack;
    }

    const releaseStart = totalSamples - release;
    if (index >= releaseStart) {
      // release === 0 only when attack === totalSamples, handled above.
      return (totalSamples - index) / release;
    }

    return 1;
  }
}
