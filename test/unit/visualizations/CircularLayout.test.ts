import { describe, it, expect } from "vitest";
import { circularLayout } from "../../../src/visualizations/layout/CircularLayout.js";

describe("CircularLayout — circularLayout()", () => {
  it("returns an empty map for empty input", () => {
    expect(circularLayout([])).toEqual(new Map());
  });

  it("places a single node at the canvas centre", () => {
    const map = circularLayout(["I"]);
    expect(map.size).toBe(1);
    const pt = map.get("I")!;
    // defaults: width=800, height=600 → cx=400, cy=300
    expect(pt.x).toBe(400);
    expect(pt.y).toBe(300);
  });

  it("places a single node at the custom canvas centre", () => {
    const map = circularLayout(["I"], { width: 1000, height: 400 });
    const pt = map.get("I")!;
    expect(pt.x).toBe(500);
    expect(pt.y).toBe(200);
  });

  it("places multiple nodes on a circle of the expected radius", () => {
    const ids = ["I", "IV", "V7"];
    const width = 800;
    const height = 600;
    const padding = 60;
    const expectedRadius = Math.min(width, height) / 2 - padding;
    const cx = width / 2;
    const cy = height / 2;

    const map = circularLayout(ids);
    for (const pt of map.values()) {
      const dist = Math.hypot(pt.x - cx, pt.y - cy);
      expect(dist).toBeCloseTo(expectedRadius, 0);
    }
  });

  it("assigns unique positions to every node", () => {
    const ids = ["I", "ii", "iii", "IV", "V", "V7", "vi", "vii°", "bVII"];
    const map = circularLayout(ids);
    const serialised = [...map.values()].map((p) => `${p.x},${p.y}`);
    expect(new Set(serialised).size).toBe(ids.length);
  });

  it("is deterministic for the same input", () => {
    const ids = ["I", "IV", "V7", "vi"];
    const a = circularLayout(ids);
    const b = circularLayout(ids);
    expect(a).toEqual(b);
  });

  it("emits every supplied id as a key", () => {
    const ids = ["I", "IV", "V7"];
    const map = circularLayout(ids);
    for (const id of ids) {
      expect(map.has(id)).toBe(true);
    }
  });

  it("respects a custom explicit radius", () => {
    const ids = ["I", "IV"];
    const radius = 100;
    const cx = 400;
    const cy = 300;
    const map = circularLayout(ids, { radius });
    for (const pt of map.values()) {
      const dist = Math.hypot(pt.x - cx, pt.y - cy);
      expect(dist).toBeCloseTo(radius, 1);
    }
  });

  it("respects a custom startAngle — first node lands at that angle", () => {
    const startAngle = 0; // rightmost point on circle
    const map = circularLayout(["A", "B"], { startAngle });
    const pt = map.get("A")!;
    // y should equal cy (cy=300), x should be > cx (cx=400)
    expect(pt.y).toBeCloseTo(300, 1);
    expect(pt.x).toBeGreaterThan(400);
  });

  it("coordinates have at most 2 decimal places by default", () => {
    const map = circularLayout(["I", "IV", "V7", "vi", "ii"]);
    for (const pt of map.values()) {
      const decimals = (v: number): number => (v.toString().split(".")[1] ?? "").length;
      expect(decimals(pt.x)).toBeLessThanOrEqual(2);
      expect(decimals(pt.y)).toBeLessThanOrEqual(2);
    }
  });

  it("respects a custom padding when no explicit radius is given", () => {
    const ids = ["I", "IV"];
    const padding = 10;
    const width = 800;
    const height = 600;
    const expectedRadius = Math.min(width, height) / 2 - padding;
    const cx = 400;
    const cy = 300;
    const map = circularLayout(ids, { padding });
    for (const pt of map.values()) {
      const dist = Math.hypot(pt.x - cx, pt.y - cy);
      expect(dist).toBeCloseTo(expectedRadius, 1);
    }
  });
});
