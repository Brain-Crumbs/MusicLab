// ---------------------------------------------------------------------------
// Wave 10 — Shared deterministic layout helper
//
// Several Wave 10 renderers need 2-D coordinates for graph nodes: the SVG
// topology renderer draws them, and the React Flow adapter ships them as node
// positions.  A force-directed layout would be non-deterministic and pull in a
// dependency, so this places nodes evenly around a circle — a stable, dependency
// -free arrangement that snapshots cleanly and reads well for the tiny MVP
// chord-space.
//
// Pure and framework-free: it maps a list of node ids to points and nothing
// more.  Renderers decide what to do with the points.
// ---------------------------------------------------------------------------

/** A 2-D point in renderer coordinate space (origin top-left). */
export interface Point {
  readonly x: number;
  readonly y: number;
}

export interface CircularLayoutOptions {
  /** Canvas width the ring is centred within.  Default 800. */
  readonly width?: number;
  /** Canvas height the ring is centred within.  Default 600. */
  readonly height?: number;
  /**
   * Ring radius.  Defaults to the largest circle that fits inside the canvas
   * with `padding` on every side.
   */
  readonly radius?: number;
  /** Inset from the canvas edges when `radius` is not given.  Default 60. */
  readonly padding?: number;
  /**
   * Angle (radians) of the first node, measured clockwise from the positive
   * x-axis.  Default `-π/2` places the first node at the top.
   */
  readonly startAngle?: number;
  /** Decimal places coordinates are rounded to for stable output.  Default 2. */
  readonly precision?: number;
}

const DEFAULTS = {
  width: 800,
  height: 600,
  padding: 60,
  startAngle: -Math.PI / 2,
  precision: 2,
} as const;

/**
 * Lays `ids` out evenly around a circle, returning a map from id to point.
 *
 * Node order in `ids` fixes angular order (first id at `startAngle`, going
 * clockwise).  A single id is placed at the centre; an empty list yields an
 * empty map.  Coordinates are rounded so callers get stable, snapshot-friendly
 * output.
 */
export function circularLayout(
  ids: readonly string[],
  options: CircularLayoutOptions = {},
): Map<string, Point> {
  const width = options.width ?? DEFAULTS.width;
  const height = options.height ?? DEFAULTS.height;
  const padding = options.padding ?? DEFAULTS.padding;
  const startAngle = options.startAngle ?? DEFAULTS.startAngle;
  const precision = options.precision ?? DEFAULTS.precision;

  const cx = width / 2;
  const cy = height / 2;
  const radius = options.radius ?? Math.max(0, Math.min(width, height) / 2 - padding);

  const points = new Map<string, Point>();
  const n = ids.length;

  if (n === 0) return points;
  if (n === 1) {
    const only = ids[0];
    if (only !== undefined) {
      points.set(only, { x: round(cx, precision), y: round(cy, precision) });
    }
    return points;
  }

  ids.forEach((id, i) => {
    const angle = startAngle + (2 * Math.PI * i) / n;
    points.set(id, {
      x: round(cx + radius * Math.cos(angle), precision),
      y: round(cy + radius * Math.sin(angle), precision),
    });
  });

  return points;
}

/** Rounds to `precision` decimals, normalising -0 to 0. */
function round(value: number, precision: number): number {
  const r = Number(value.toFixed(precision));
  return r === 0 ? 0 : r;
}
