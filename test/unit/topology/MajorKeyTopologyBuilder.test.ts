import { describe, it, expect, beforeAll } from "vitest";
import { MajorKeyTopologyBuilder } from "../../../src/core/topology/MajorKeyTopologyBuilder.js";
import { HarmonicTopology } from "../../../src/core/model/HarmonicTopology.js";
import { FunctionalMotion } from "../../../src/core/model/HarmonicFunction.js";
import { StyleTag } from "../../../src/core/model/HarmonicEdge.js";
import type { HarmonicEdge } from "../../../src/core/model/HarmonicEdge.js";

// ---------------------------------------------------------------------------
// Shared topology instance — built once for all tests
// ---------------------------------------------------------------------------

let topology: HarmonicTopology;

beforeAll(() => {
  topology = new MajorKeyTopologyBuilder().build();
});

// ---------------------------------------------------------------------------
// Structure
// ---------------------------------------------------------------------------

describe("MajorKeyTopologyBuilder — structure", () => {
  it("builds without throwing", () => {
    expect(() => new MajorKeyTopologyBuilder().build()).not.toThrow();
  });

  it("contains exactly 9 chords", () => {
    expect(topology.chordCount).toBe(9);
  });

  it("contains exactly 35 edges", () => {
    expect(topology.edgeCount).toBe(35);
  });

  it("all 9 MVP chord IDs are accessible via getChord", () => {
    const ids = ["I", "ii", "iii", "IV", "V", "V7", "vi", "vii°", "bVII"];
    for (const id of ids) {
      expect(() => topology.getChord(id), `getChord("${id}") should not throw`).not.toThrow();
    }
  });

  it("getChord throws for an unknown id", () => {
    expect(() => topology.getChord("X")).toThrow();
  });

  it("is idempotent — two builds produce equal chord and edge counts", () => {
    const t2 = new MajorKeyTopologyBuilder().build();
    expect(t2.chordCount).toBe(topology.chordCount);
    expect(t2.edgeCount).toBe(topology.edgeCount);
  });
});

// ---------------------------------------------------------------------------
// Chord connectivity — expected edges exist
// ---------------------------------------------------------------------------

describe("MajorKeyTopologyBuilder — expected edges exist", () => {
  const expectedEdges: [string, string][] = [
    // From I
    ["I", "IV"],
    ["I", "V"],
    ["I", "V7"],
    ["I", "ii"],
    ["I", "vi"],
    ["I", "iii"],
    ["I", "bVII"],
    // From ii
    ["ii", "V"],
    ["ii", "V7"],
    ["ii", "IV"],
    // From iii
    ["iii", "vi"],
    ["iii", "IV"],
    ["iii", "ii"],
    // From IV
    ["IV", "V"],
    ["IV", "V7"],
    ["IV", "I"],
    ["IV", "ii"],
    ["IV", "vii°"],
    ["IV", "bVII"],
    // From V
    ["V", "I"],
    ["V", "vi"],
    ["V", "V7"],
    ["V", "IV"],
    ["V", "bVII"],
    // From V7
    ["V7", "I"],
    ["V7", "vi"],
    // From vi
    ["vi", "ii"],
    ["vi", "IV"],
    ["vi", "V"],
    ["vi", "V7"],
    ["vi", "I"],
    // From vii°
    ["vii°", "I"],
    ["vii°", "vi"],
    // From bVII
    ["bVII", "I"],
    ["bVII", "IV"],
  ];

  for (const [from, to] of expectedEdges) {
    it(`has edge ${from}→${to}`, () => {
      expect(topology.hasEdge(from, to), `${from}→${to} should exist`).toBe(true);
    });
  }
});

// ---------------------------------------------------------------------------
// Chord connectivity — unexpected edges are absent
// ---------------------------------------------------------------------------

describe("MajorKeyTopologyBuilder — absent edges", () => {
  const absentEdges: [string, string][] = [
    ["I", "I"], // no self-loops
    ["V7", "V"], // dominant does not step back to plain triad
    ["V7", "IV"], // V7 does not retrogress to IV in this topology
    ["V7", "bVII"], // no dominant-to-modal edge
    ["ii", "I"], // ii does not resolve directly to tonic
    ["bVII", "V"], // no modal-to-dominant edge
    ["bVII", "V7"], // no modal-to-dominant-seventh edge
    ["vii°", "IV"], // leading-tone chord does not retrogress
  ];

  for (const [from, to] of absentEdges) {
    it(`does not have edge ${from}→${to}`, () => {
      expect(topology.hasEdge(from, to), `${from}→${to} should be absent`).toBe(false);
    });
  }
});

// ---------------------------------------------------------------------------
// Functional motion classification
// ---------------------------------------------------------------------------

describe("MajorKeyTopologyBuilder — functional motion", () => {
  function edgeOrFail(from: string, to: string): HarmonicEdge {
    const edge = topology.getOutgoingEdges(from).find((e) => e.to === to);
    if (!edge) throw new Error(`edge ${from}→${to} not found`);
    return edge;
  }

  it("V7→I is DominantToTonic", () => {
    expect(edgeOrFail("V7", "I").functionalMotion).toBe(FunctionalMotion.DominantToTonic);
  });

  it("V→I is DominantToTonic", () => {
    expect(edgeOrFail("V", "I").functionalMotion).toBe(FunctionalMotion.DominantToTonic);
  });

  it("vii°→I is DominantToTonic", () => {
    expect(edgeOrFail("vii°", "I").functionalMotion).toBe(FunctionalMotion.DominantToTonic);
  });

  it("V→vi is Deceptive", () => {
    expect(edgeOrFail("V", "vi").functionalMotion).toBe(FunctionalMotion.Deceptive);
  });

  it("V7→vi is Deceptive", () => {
    expect(edgeOrFail("V7", "vi").functionalMotion).toBe(FunctionalMotion.Deceptive);
  });

  it("vii°→vi is Deceptive", () => {
    expect(edgeOrFail("vii°", "vi").functionalMotion).toBe(FunctionalMotion.Deceptive);
  });

  it("bVII→I is ModalReturn", () => {
    expect(edgeOrFail("bVII", "I").functionalMotion).toBe(FunctionalMotion.ModalReturn);
  });

  it("I→IV is TonicToSubdominant", () => {
    expect(edgeOrFail("I", "IV").functionalMotion).toBe(FunctionalMotion.TonicToSubdominant);
  });

  it("I→V is TonicToDominant", () => {
    expect(edgeOrFail("I", "V").functionalMotion).toBe(FunctionalMotion.TonicToDominant);
  });

  it("ii→V7 is PredominantToDominant", () => {
    expect(edgeOrFail("ii", "V7").functionalMotion).toBe(FunctionalMotion.PredominantToDominant);
  });

  it("IV→V is PredominantToDominant", () => {
    expect(edgeOrFail("IV", "V").functionalMotion).toBe(FunctionalMotion.PredominantToDominant);
  });

  it("IV→I is Retrogression (plagal)", () => {
    expect(edgeOrFail("IV", "I").functionalMotion).toBe(FunctionalMotion.Retrogression);
  });

  it("iii→IV is StepwiseAscending", () => {
    expect(edgeOrFail("iii", "IV").functionalMotion).toBe(FunctionalMotion.StepwiseAscending);
  });

  it("iii→ii is StepwiseDescending", () => {
    expect(edgeOrFail("iii", "ii").functionalMotion).toBe(FunctionalMotion.StepwiseDescending);
  });
});

// ---------------------------------------------------------------------------
// Cadence strength
// ---------------------------------------------------------------------------

describe("MajorKeyTopologyBuilder — cadence strength", () => {
  function cadenceStrength(from: string, to: string): number {
    const edge = topology.getOutgoingEdges(from).find((e) => e.to === to);
    if (!edge) throw new Error(`edge ${from}→${to} not found`);
    return edge.cadenceStrength;
  }

  it("V7→I has cadenceStrength 1.0 (perfect authentic)", () => {
    expect(cadenceStrength("V7", "I")).toBe(1.0);
  });

  it("V→I has cadenceStrength 0.85 (authentic without seventh)", () => {
    expect(cadenceStrength("V", "I")).toBe(0.85);
  });

  it("vii°→I has cadenceStrength 0.75 (leading-tone resolution)", () => {
    expect(cadenceStrength("vii°", "I")).toBe(0.75);
  });

  it("IV→I has cadenceStrength 0.55 (plagal)", () => {
    expect(cadenceStrength("IV", "I")).toBe(0.55);
  });

  it("bVII→I has cadenceStrength 0.5 (modal return)", () => {
    expect(cadenceStrength("bVII", "I")).toBe(0.5);
  });

  it("V7→vi has cadenceStrength 0.4 (deceptive)", () => {
    expect(cadenceStrength("V7", "vi")).toBe(0.4);
  });

  it("non-cadential edges have cadenceStrength 0", () => {
    expect(cadenceStrength("I", "IV")).toBe(0);
    expect(cadenceStrength("ii", "V7")).toBe(0);
    expect(cadenceStrength("I", "vi")).toBe(0);
  });

  it("authentic cadence strength ordering: V7→I > V→I > vii°→I > IV→I", () => {
    expect(cadenceStrength("V7", "I")).toBeGreaterThan(cadenceStrength("V", "I"));
    expect(cadenceStrength("V", "I")).toBeGreaterThan(cadenceStrength("vii°", "I"));
    expect(cadenceStrength("vii°", "I")).toBeGreaterThan(cadenceStrength("IV", "I"));
  });
});

// ---------------------------------------------------------------------------
// Surprise cost
// ---------------------------------------------------------------------------

describe("MajorKeyTopologyBuilder — surprise cost", () => {
  function surpriseCost(from: string, to: string): number {
    const edge = topology.getOutgoingEdges(from).find((e) => e.to === to);
    if (!edge) throw new Error(`edge ${from}→${to} not found`);
    return edge.surpriseCost;
  }

  it("standard functional moves have surpriseCost 0", () => {
    expect(surpriseCost("V7", "I")).toBe(0);
    expect(surpriseCost("ii", "V7")).toBe(0);
    expect(surpriseCost("I", "IV")).toBe(0);
    expect(surpriseCost("I", "V7")).toBe(0);
    expect(surpriseCost("IV", "I")).toBe(0); // override: plagal is common
    expect(surpriseCost("V", "V7")).toBe(0); // override: dominant intensification
    expect(surpriseCost("I", "vi")).toBe(0); // override: I-vi is very common
  });

  it("modal and deceptive moves have low but nonzero surpriseCost", () => {
    expect(surpriseCost("bVII", "I")).toBeGreaterThan(0);
    expect(surpriseCost("bVII", "I")).toBeLessThan(0.3);
    expect(surpriseCost("V7", "vi")).toBeGreaterThan(0);
    expect(surpriseCost("V7", "vi")).toBeLessThan(0.3);
  });

  it("retrogressive moves have higher surpriseCost than functional moves", () => {
    expect(surpriseCost("V", "IV")).toBeGreaterThan(surpriseCost("V", "I"));
  });
});

// ---------------------------------------------------------------------------
// Base affinity
// ---------------------------------------------------------------------------

describe("MajorKeyTopologyBuilder — base affinity", () => {
  function affinity(from: string, to: string): number {
    const edge = topology.getOutgoingEdges(from).find((e) => e.to === to);
    if (!edge) throw new Error(`edge ${from}→${to} not found`);
    return edge.baseAffinity;
  }

  it("dominant-to-tonic moves have the highest affinity", () => {
    expect(affinity("V7", "I")).toBeGreaterThan(affinity("IV", "I"));
    expect(affinity("V7", "I")).toBeGreaterThan(affinity("bVII", "I"));
  });

  it("V→V7 dominant intensification has high affinity", () => {
    expect(affinity("V", "V7")).toBeGreaterThanOrEqual(0.6);
  });

  it("all affinities are in [0, 1]", () => {
    for (const edge of topology.getAllEdges()) {
      expect(edge.baseAffinity, `${edge.id} affinity`).toBeGreaterThanOrEqual(0);
      expect(edge.baseAffinity, `${edge.id} affinity`).toBeLessThanOrEqual(1);
    }
  });
});

// ---------------------------------------------------------------------------
// Circle distance
// ---------------------------------------------------------------------------

describe("MajorKeyTopologyBuilder — circle distance", () => {
  function dist(from: string, to: string): number {
    const edge = topology.getOutgoingEdges(from).find((e) => e.to === to);
    if (!edge) throw new Error(`edge ${from}→${to} not found`);
    return edge.circleDistance;
  }

  it("I→V is 1 fifth", () => {
    expect(dist("I", "V")).toBe(1);
  });

  it("I→IV is 1 fifth", () => {
    expect(dist("I", "IV")).toBe(1);
  });

  it("V7→I is 1 fifth", () => {
    expect(dist("V7", "I")).toBe(1);
  });

  it("V→V7 is 0 (same root)", () => {
    expect(dist("V", "V7")).toBe(0);
  });

  it("I→vi is 3 fifths", () => {
    expect(dist("I", "vi")).toBe(3);
  });

  it("all circle distances are in [0, 6]", () => {
    for (const edge of topology.getAllEdges()) {
      expect(edge.circleDistance, `${edge.id} circleDistance`).toBeGreaterThanOrEqual(0);
      expect(edge.circleDistance, `${edge.id} circleDistance`).toBeLessThanOrEqual(6);
    }
  });
});

// ---------------------------------------------------------------------------
// Tension delta
// ---------------------------------------------------------------------------

describe("MajorKeyTopologyBuilder — tension delta", () => {
  function tensionDelta(from: string, to: string): number {
    const edge = topology.getOutgoingEdges(from).find((e) => e.to === to);
    if (!edge) throw new Error(`edge ${from}→${to} not found`);
    return edge.tensionDelta;
  }

  it("V7→I has negative tensionDelta (tension releases)", () => {
    expect(tensionDelta("V7", "I")).toBeLessThan(0);
  });

  it("I→V7 has positive tensionDelta (tension increases)", () => {
    expect(tensionDelta("I", "V7")).toBeGreaterThan(0);
  });

  it("V→V7 has positive tensionDelta (adds seventh increases tension)", () => {
    expect(tensionDelta("V", "V7")).toBeGreaterThan(0);
  });

  it("all tension deltas are in [-1, 1]", () => {
    for (const edge of topology.getAllEdges()) {
      expect(edge.tensionDelta, `${edge.id} tensionDelta`).toBeGreaterThanOrEqual(-1);
      expect(edge.tensionDelta, `${edge.id} tensionDelta`).toBeLessThanOrEqual(1);
    }
  });
});

// ---------------------------------------------------------------------------
// Style tags
// ---------------------------------------------------------------------------

describe("MajorKeyTopologyBuilder — style tags", () => {
  function tags(from: string, to: string): readonly StyleTag[] {
    const edge = topology.getOutgoingEdges(from).find((e) => e.to === to);
    if (!edge) throw new Error(`edge ${from}→${to} not found`);
    return edge.styleTags;
  }

  it("V7→I carries Classical and Cadential tags", () => {
    expect(tags("V7", "I")).toContain(StyleTag.Classical);
    expect(tags("V7", "I")).toContain(StyleTag.Cadential);
  });

  it("bVII→I carries Folk and Modal tags", () => {
    expect(tags("bVII", "I")).toContain(StyleTag.Folk);
    expect(tags("bVII", "I")).toContain(StyleTag.Modal);
  });

  it("I→bVII carries Folk and Modal tags", () => {
    expect(tags("I", "bVII")).toContain(StyleTag.Folk);
    expect(tags("I", "bVII")).toContain(StyleTag.Modal);
  });

  it("V7→vi carries Deceptive tag", () => {
    expect(tags("V7", "vi")).toContain(StyleTag.Deceptive);
  });

  it("IV→I carries Cadential and Folk tags (plagal)", () => {
    expect(tags("IV", "I")).toContain(StyleTag.Cadential);
    expect(tags("IV", "I")).toContain(StyleTag.Folk);
  });

  it("V→IV carries BluesRock and Folk tags", () => {
    expect(tags("V", "IV")).toContain(StyleTag.BluesRock);
    expect(tags("V", "IV")).toContain(StyleTag.Folk);
  });

  it("bVII→IV carries Folk and Modal tags", () => {
    expect(tags("bVII", "IV")).toContain(StyleTag.Folk);
    expect(tags("bVII", "IV")).toContain(StyleTag.Modal);
  });

  it("IV→bVII carries Folk and Modal tags (modal approach)", () => {
    expect(tags("IV", "bVII")).toContain(StyleTag.Folk);
    expect(tags("IV", "bVII")).toContain(StyleTag.Modal);
  });

  it("V→bVII carries Folk and Modal tags (modal approach)", () => {
    expect(tags("V", "bVII")).toContain(StyleTag.Folk);
    expect(tags("V", "bVII")).toContain(StyleTag.Modal);
  });
});

// ---------------------------------------------------------------------------
// Edge invariants (loop over all 33 edges)
// ---------------------------------------------------------------------------

describe("MajorKeyTopologyBuilder — edge invariants", () => {
  it("every edge's 'from' chord exists in the topology", () => {
    for (const edge of topology.getAllEdges()) {
      expect(topology.hasChord(edge.from), `${edge.id} from="${edge.from}"`).toBe(true);
    }
  });

  it("every edge's 'to' chord exists in the topology", () => {
    for (const edge of topology.getAllEdges()) {
      expect(topology.hasChord(edge.to), `${edge.id} to="${edge.to}"`).toBe(true);
    }
  });

  it("every edge id matches the convention '{from}->{to}'", () => {
    for (const edge of topology.getAllEdges()) {
      expect(edge.id, edge.id).toBe(`${edge.from}->${edge.to}`);
    }
  });

  it("no self-loop edges exist", () => {
    for (const edge of topology.getAllEdges()) {
      expect(edge.from, `self-loop on ${edge.from}`).not.toBe(edge.to);
    }
  });

  it("cadenceStrength is in [0, 1] for all edges", () => {
    for (const edge of topology.getAllEdges()) {
      expect(edge.cadenceStrength, edge.id).toBeGreaterThanOrEqual(0);
      expect(edge.cadenceStrength, edge.id).toBeLessThanOrEqual(1);
    }
  });

  it("surpriseCost is in [0, 1] for all edges", () => {
    for (const edge of topology.getAllEdges()) {
      expect(edge.surpriseCost, edge.id).toBeGreaterThanOrEqual(0);
      expect(edge.surpriseCost, edge.id).toBeLessThanOrEqual(1);
    }
  });

  it("every source chord has at least one outgoing edge", () => {
    for (const chord of topology.getAllChords()) {
      expect(
        topology.getOutgoingEdges(chord.id).length,
        `${chord.id} should have outgoing edges`,
      ).toBeGreaterThan(0);
    }
  });

  it("bVII is reachable away from the tonic, not just from I", () => {
    // Regression for #16: bVII used to have a single incoming edge (I→bVII),
    // so its modal colour almost never surfaced once the music left the tonic.
    const incoming = topology.getAllEdges().filter((e) => e.to === "bVII");
    const sources = incoming.map((e) => e.from);
    expect(incoming.length).toBeGreaterThan(1);
    expect(sources).toContain("IV");
    expect(sources).toContain("V");
  });
});
