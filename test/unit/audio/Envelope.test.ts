import { describe, it, expect } from "vitest";
import { Envelope } from "../../../src/audio/synth/Envelope.js";

describe("Envelope", () => {
  it("starts at 0, rises to 1 across the attack", () => {
    // 100-sample attack, no release, long sustain.
    const env = new Envelope(100 / 1000, 0, 1000);
    expect(env.gainAt(0, 1000)).toBe(0);
    expect(env.gainAt(50, 1000)).toBeCloseTo(0.5, 6);
    expect(env.gainAt(100, 1000)).toBe(1);
  });

  it("falls back to 0 across the release tail", () => {
    const env = new Envelope(0, 100 / 1000, 1000);
    expect(env.gainAt(900, 1000)).toBe(1);
    expect(env.gainAt(950, 1000)).toBeCloseTo(0.5, 6);
    expect(env.gainAt(999, 1000)).toBeCloseTo(0.01, 6);
  });

  it("holds at 1 during sustain", () => {
    const env = new Envelope(0.01, 0.01, 1000); // 10-sample ramps
    expect(env.gainAt(500, 1000)).toBe(1);
  });

  it("clamps ramps so they fit very short notes (no clicks)", () => {
    // Attack + release (200) exceeds a 100-sample note: gains stay in [0, 1].
    const env = new Envelope(0.1, 0.1, 1000);
    for (let i = 0; i < 100; i++) {
      const g = env.gainAt(i, 100);
      expect(g).toBeGreaterThanOrEqual(0);
      expect(g).toBeLessThanOrEqual(1);
    }
  });

  it("returns 0 for out-of-range or empty notes", () => {
    const env = new Envelope(0.02, 0.2, 44100);
    expect(env.gainAt(-1, 100)).toBe(0);
    expect(env.gainAt(100, 100)).toBe(0);
    expect(env.gainAt(0, 0)).toBe(0);
  });
});
