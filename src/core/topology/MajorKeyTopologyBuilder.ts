import { HarmonicTopology } from "../model/HarmonicTopology.js";
import { StyleTag } from "../model/HarmonicEdge.js";
import { FunctionalMotion } from "../model/HarmonicFunction.js";
import { ChordCatalog } from "./ChordCatalog.js";
import { EdgeFactory } from "./EdgeFactory.js";
import type { TopologyBuilder } from "./TopologyBuilder.js";
import type { Chord } from "../model/Chord.js";

/**
 * Builds the immutable harmonic topology for a generic major key.
 *
 * The graph contains the nine MVP chords (I ii iii IV V V7 vi vii° bVII) and
 * thirty-three directed edges covering:
 *
 *   - All standard functional chains: T→PD, T→D, PD→D, D→T
 *   - Deceptive resolutions: V→vi, V7→vi, vii°→vi
 *   - Plagal cadence: IV→I
 *   - Dominant intensification: V→V7
 *   - Modal return and departure: bVII→I, I→bVII
 *   - Common tonic-area motion: I↔vi, iii→vi
 *   - Blues/folk back-cycle: V→IV
 *   - Mediant connections: iii→IV, iii→ii
 *
 * EdgeFactory derives most edge properties automatically; overrides are applied
 * only where the automatic values would be musically misleading.
 */
export class MajorKeyTopologyBuilder implements TopologyBuilder {
  build(): HarmonicTopology {
    const chords = ChordCatalog.majorKeyMvp();
    const get = buildLookup(chords);

    const I    = get("I");
    const ii   = get("ii");
    const iii  = get("iii");
    const IV   = get("IV");
    const V    = get("V");
    const V7   = get("V7");
    const vi   = get("vi");
    const viio = get("vii°");
    const bVII = get("bVII");

    const e = EdgeFactory.create.bind(EdgeFactory);

    const edges = [
      // -----------------------------------------------------------------------
      // From I  (Tonic)
      // -----------------------------------------------------------------------
      e(I, IV),    // T→PD  — most natural forward motion
      e(I, V),     // T→D   — direct dominant approach
      e(I, V7),    // T→D   — direct dominant seventh approach
      e(I, ii),    // T→PD  — common pre-dominant approach
      // I→vi: extremely common (I-vi-IV-V, I-vi-ii-V); auto-Neutral is too weak
      e(I, vi,   { baseAffinity: 0.6, surpriseCost: 0.0 }),
      // I→iii: moderately common (I-iii-IV, I-iii-vi); Neutral but not unusual
      e(I, iii,  { baseAffinity: 0.45, surpriseCost: 0.2 }),
      // I→bVII: modal departure (e.g. Mixolydian I-bVII-IV-I); classifier would
      //   incorrectly call this StepwiseDescending (Bb is 2 semitones below C)
      e(I, bVII, {
        functionalMotion: FunctionalMotion.Neutral,
        surpriseCost: 0.2,
        styleTags: [StyleTag.Folk, StyleTag.Modal],
      }),

      // -----------------------------------------------------------------------
      // From ii  (Predominant)
      // -----------------------------------------------------------------------
      e(ii, V),    // PD→D  — textbook predominant-to-dominant
      e(ii, V7),   // PD→D  — predominant to dominant seventh
      e(ii, IV),   // PD→PD — both are predominant; acts as a pre-dominant exchange

      // -----------------------------------------------------------------------
      // From iii  (Mediant)
      // -----------------------------------------------------------------------
      // iii→vi: standard mediant resolution to relative minor; auto-Neutral is too weak
      e(iii, vi,  { baseAffinity: 0.55, surpriseCost: 0.1 }),
      e(iii, IV),  // ascending step (E→F); StepwiseAscending, auto-computed correctly
      e(iii, ii),  // descending step (E→D); StepwiseDescending, auto-computed correctly

      // -----------------------------------------------------------------------
      // From IV  (Predominant)
      // -----------------------------------------------------------------------
      e(IV, V),    // PD→D  — strongest standard approach to dominant
      e(IV, V7),   // PD→D  — direct dominant seventh approach
      // IV→I: plagal cadence; auto-Retrogression gives baseAffinity 0.35 and
      //   surpriseCost 0.25, but IV→I is very common
      e(IV, I,    { baseAffinity: 0.65, surpriseCost: 0.0 }),
      e(IV, ii),   // PD→PD — both are predominant; pivot between subdominants
      e(IV, viio), // PD→D  — leading-tone diminished approach

      // -----------------------------------------------------------------------
      // From V  (Dominant)
      // -----------------------------------------------------------------------
      e(V, I),     // D→T   — authentic cadence
      e(V, vi),    // Deceptive — V resolves to vi instead of I
      // V→V7: dominant intensification; auto-Neutral gives baseAffinity 0.4 and
      //   surpriseCost 0.35, but adding the seventh is very natural
      e(V, V7,   { baseAffinity: 0.7, surpriseCost: 0.0 }),
      // V→IV: back-cycle retrogression; idiomatic in blues and folk (V-IV-I)
      e(V, IV,   { styleTags: [StyleTag.BluesRock, StyleTag.Folk] }),

      // -----------------------------------------------------------------------
      // From V7  (Dominant seventh)
      // -----------------------------------------------------------------------
      e(V7, I),    // D→T   — strongest authentic cadence (cadenceStrength 1.0)
      e(V7, vi),   // Deceptive — deceptive resolution to vi

      // -----------------------------------------------------------------------
      // From vi  (Tonic)
      // -----------------------------------------------------------------------
      e(vi, ii),   // T→PD  — most common continuation after vi
      e(vi, IV),   // T→PD  — vi-IV is a standard tonic-to-subdominant move
      e(vi, V),    // T→D   — vi can move directly to dominant
      e(vi, V7),   // T→D   — vi moving to dominant seventh
      // vi→I: tonic-to-tonic back-motion; auto-Neutral is reasonable but slightly low
      e(vi, I,    { baseAffinity: 0.5, surpriseCost: 0.1 }),

      // -----------------------------------------------------------------------
      // From vii°  (Dominant / Leading-tone)
      // -----------------------------------------------------------------------
      e(viio, I),  // D→T   — leading-tone resolution (cadenceStrength 0.75)
      e(viio, vi), // Deceptive — vii° resolves to vi instead of I

      // -----------------------------------------------------------------------
      // From bVII  (Modal)
      // -----------------------------------------------------------------------
      e(bVII, I),  // ModalReturn — primary raison d'être for bVII (cadenceStrength 0.5)
      // bVII→IV: common in modal/folk progressions (e.g. bVII-IV-I);
      //   auto-Neutral gives low affinity and no style tags
      e(bVII, IV, {
        baseAffinity: 0.5,
        surpriseCost: 0.2,
        styleTags: [StyleTag.Folk, StyleTag.Modal],
      }),
    ];

    return HarmonicTopology.from(chords, edges);
  }
}

// ---------------------------------------------------------------------------
// Internal helper
// ---------------------------------------------------------------------------

function buildLookup(chords: readonly Chord[]): (id: string) => Chord {
  const map = new Map<string, Chord>();
  for (const chord of chords) map.set(chord.id, chord);
  return (id: string): Chord => {
    const chord = map.get(id);
    if (chord === undefined) {
      throw new Error(`MajorKeyTopologyBuilder: unknown chord id "${id}"`);
    }
    return chord;
  };
}
