Top-level shape

I would build this as a small TypeScript monorepo or package with a pure core and optional consumers.

harmonic-potential-field/
  package.json
  tsconfig.json
  vitest.config.ts

  src/
    core/
    presets/
    renderers/
    visualizations/
    cli/
    index.ts

  test/
    unit/
    property/
    smoke/
    fixtures/
    snapshots/

  examples/
    generate-basic-progression.ts
    generate-folk-progression.ts
    debug-potential-field.ts

The most important design choice is this:

src/core = pure math/music engine
src/renderers = chord/output formatting only
src/visualizations = debug data and graph views only
src/cli or React app = application layer

The generator should not depend on React, DOM, SVG, MIDI, or audio. Those should be adapters around the core.

Core File Structure
src/
  core/
    model/
      Chord.ts
      ChordId.ts
      HarmonicFunction.ts
      HarmonicEdge.ts
      HarmonicTopology.ts
      MusicalState.ts
      CadenceState.ts
      GenerationConfig.ts
      StyleProfile.ts
      PhraseTemplate.ts
      GenerationStep.ts
      GenerationTrace.ts

    topology/
      TopologyBuilder.ts
      MajorKeyTopologyBuilder.ts
      EdgeFactory.ts
      ChordCatalog.ts
      FunctionalMotionClassifier.ts

    phrase/
      PhraseEngine.ts
      TensionCurve.ts
      PhrasePositionClassifier.ts

    factors/
      FactorEngine.ts
      FactorContext.ts
      FactorScore.ts
      HarmonicGravityFactor.ts
      TensionFitFactor.ts
      PhraseFitFactor.ts
      CadenceFitFactor.ts
      NoveltyFactor.ts
      MemoryFactor.ts
      StyleFactor.ts
      SurpriseFactor.ts
      CompositeFactorScorer.ts

    probability/
      Softmax.ts
      ProbabilityDistribution.ts
      WeightedSampler.ts
      RandomSource.ts
      SeededRandomSource.ts

    state/
      InitialStateFactory.ts
      StateTransitioner.ts
      TensionEstimator.ts
      CadenceClassifier.ts
      RepetitionTracker.ts
      SurpriseBudgetUpdater.ts
      HarmonicRegionTracker.ts

    generator/
      HarmonicPotentialFieldGenerator.ts
      GenerationSession.ts
      StepGenerator.ts

    diagnostics/
      ScoreBreakdown.ts
      DistributionSnapshot.ts
      StateSnapshot.ts
      TraceRecorder.ts

    index.ts
Main Runtime Flow
HarmonicPotentialFieldGenerator
  -> asks topology for outgoing edges
  -> builds FactorContext
  -> asks CompositeFactorScorer for candidate scores
  -> sends scores to Softmax
  -> asks WeightedSampler to choose one edge
  -> asks StateTransitioner for next MusicalState
  -> records GenerationStep / GenerationTrace

In code shape:

const generator = new HarmonicPotentialFieldGenerator({
  topology,
  factors,
  phraseEngine,
  sampler,
  stateTransitioner,
  config,
});

const result = generator.generate({
  steps: 16,
  initialChord: "I",
});
Core Domain Models
Chord
export interface Chord {
  id: ChordId;              // "I", "ii", "V7", "bVII"
  scaleDegree: number;      // 1-7
  accidentalOffset: number; // -1 for bVII, 0 for diatonic
  quality: ChordQuality;
  extensions: ChordExtension[];
  inversion?: number;
  harmonicFunction: HarmonicFunction;
  sourceMode?: SourceMode;
}
HarmonicEdge
export interface HarmonicEdge {
  id: string;
  from: ChordId;
  to: ChordId;

  baseAffinity: number;
  circleDistance: number;
  functionalMotion: FunctionalMotion;
  tensionDelta: number;
  cadenceStrength: number;
  surpriseCost: number;

  styleTags: StyleTag[];
}
HarmonicTopology
export class HarmonicTopology {
  constructor(
    private readonly chords: Map<ChordId, Chord>,
    private readonly adjacency: Map<ChordId, HarmonicEdge[]>,
  ) {}

  getChord(id: ChordId): Chord {
    // lookup only
  }

  getOutgoingEdges(from: ChordId): HarmonicEdge[] {
    return this.adjacency.get(from) ?? [];
  }

  getAllChords(): Chord[] {
    return [...this.chords.values()];
  }

  getAllEdges(): HarmonicEdge[] {
    return [...this.adjacency.values()].flat();
  }
}

The topology should be immutable after construction. It is the permanent harmonic geometry.

Topology Builders
MajorKeyTopologyBuilder

Responsible for the MVP graph:

I
ii
iii
IV
V
V7
vi
vii°
bVII
export class MajorKeyTopologyBuilder implements TopologyBuilder {
  build(): HarmonicTopology {
    const chords = ChordCatalog.majorKeyMvp();
    const edges = [
      EdgeFactory.create("I", "IV", { functionalMotion: "tonic_to_subdominant" }),
      EdgeFactory.create("ii", "V7", { functionalMotion: "predominant_to_dominant" }),
      EdgeFactory.create("V7", "I", { functionalMotion: "dominant_to_tonic" }),
      EdgeFactory.create("V7", "vi", { functionalMotion: "deceptive" }),
      EdgeFactory.create("bVII", "I", { functionalMotion: "modal_return" }),
      // etc.
    ];

    return HarmonicTopology.from(chords, edges);
  }
}

Recommended classes:

TopologyBuilder
MajorKeyTopologyBuilder
EdgeFactory
ChordCatalog
FunctionalMotionClassifier
Phrase and Tension Engine

The phrase engine should not choose chords. It only exposes the current desired tension.

export class PhraseEngine {
  constructor(private readonly template: PhraseTemplate) {}

  getTargetTension(phrasePosition: number): number {
    return this.template.tensionCurve[phrasePosition];
  }

  classifyPosition(phrasePosition: number): PhraseZone {
    // "beginning" | "middle" | "ending"
  }
}

Example templates:

export const PhraseTemplates = {
  fourBarResolutionPump: {
    phraseLength: 4,
    tensionCurve: [0.2, 0.5, 0.85, 0.1],
  },

  eightBarLongArc: {
    phraseLength: 8,
    tensionCurve: [0.2, 0.3, 0.5, 0.7, 0.6, 0.85, 0.95, 0.15],
  },
} satisfies Record<string, PhraseTemplate>;
Factor Engine Architecture

Every factor should be pure, stateless, and independently testable.

export interface FactorEngine {
  readonly id: FactorId;

  score(context: FactorContext): FactorScore;
}
export interface FactorContext {
  edge: HarmonicEdge;
  fromChord: Chord;
  toChord: Chord;
  state: MusicalState;
  config: GeneratorConfig;
  topology: HarmonicTopology;
  phrase: PhraseFrame;
}
export interface FactorScore {
  factorId: FactorId;
  rawScore: number;
  weightedScore: number;
  explanation?: string;
}
Proposed factor classes
HarmonicGravityFactor
TensionFitFactor
PhraseFitFactor
CadenceFitFactor
NoveltyFactor
MemoryFactor
StyleFactor
SurpriseFactor
CompositeFactorScorer
export class CompositeFactorScorer {
  constructor(private readonly factors: FactorEngine[]) {}

  scoreCandidate(context: FactorContext): CandidateScore {
    const factorScores = this.factors.map(factor => factor.score(context));
    const totalScore = factorScores.reduce(
      (sum, score) => sum + score.weightedScore,
      0,
    );

    return {
      edge: context.edge,
      totalScore,
      factorScores,
    };
  }
}

This gives you interpretable generation, not just output chords.

Probability and Sampling

Keep this completely separate from music theory.

Softmax
ProbabilityDistribution
WeightedSampler
RandomSource
SeededRandomSource
Softmax
export class Softmax {
  static normalize(scores: CandidateScore[], temperature: number): ProbabilityDistribution {
    // score -> probability
  }
}
WeightedSampler
export class WeightedSampler {
  constructor(private readonly random: RandomSource) {}

  sample(distribution: ProbabilityDistribution): SampledCandidate {
    // weighted random selection
  }
}
SeededRandomSource

Use seeded randomness from day one. It makes tests, debugging, and rendering reproducible.

export interface RandomSource {
  next(): number; // [0, 1)
}
State Management

The state object should be immutable. Each generation step returns a new state.

export interface MusicalState {
  key: MusicalKey;
  mode: Mode;

  currentChord: ChordId;
  previousChord?: ChordId;
  recentChords: ChordId[];

  measureIndex: number;
  phraseLength: number;
  phrasePosition: number;

  currentTension: number;
  targetTension: number;
  tensionVelocity: number;

  harmonicRegion: HarmonicRegion;
  cadenceState: CadenceState;

  timeSinceTonic: number;
  timeSinceDominant: number;
  timeSinceSubdominant: number;

  recentCircleDirection?: CircleDirection;
  repetitionCounts: Record<ChordId, number>;

  surpriseBudget: number;
}
StateTransitioner
export class StateTransitioner {
  constructor(
    private readonly cadenceClassifier: CadenceClassifier,
    private readonly tensionEstimator: TensionEstimator,
    private readonly surpriseBudgetUpdater: SurpriseBudgetUpdater,
  ) {}

  applyTransition(args: {
    state: MusicalState;
    selectedEdge: HarmonicEdge;
    phraseEngine: PhraseEngine;
    config: GeneratorConfig;
  }): MusicalState {
    // returns next state
  }
}

Supporting classes:

InitialStateFactory
StateTransitioner
TensionEstimator
CadenceClassifier
RepetitionTracker
SurpriseBudgetUpdater
HarmonicRegionTracker
Generator Layer
HarmonicPotentialFieldGenerator

This is the public orchestration class.

export class HarmonicPotentialFieldGenerator {
  constructor(private readonly deps: GeneratorDependencies) {}

  generate(request: GenerateRequest): GenerationResult {
    let state = InitialStateFactory.create(request, this.deps.config);
    const steps: GenerationStep[] = [];

    for (let i = 0; i < request.steps; i++) {
      const step = this.generateStep(state);
      steps.push(step);
      state = step.nextState;
    }

    return {
      chords: steps.map(step => step.selectedChord),
      steps,
      finalState: state,
      trace: TraceRecorder.fromSteps(steps),
    };
  }

  generateStep(state: MusicalState): GenerationStep {
    // topology -> factors -> softmax -> sampler -> state transition
  }
}
GenerationStep

This should contain everything needed for testing and visualization.

export interface GenerationStep {
  stepIndex: number;

  previousState: MusicalState;
  selectedEdge: HarmonicEdge;
  selectedChord: ChordId;
  nextState: MusicalState;

  candidates: CandidateScore[];
  distribution: ProbabilityDistribution;

  targetTension: number;
  resultingTension: number;

  cadenceState: CadenceState;
  surpriseBudgetBefore: number;
  surpriseBudgetAfter: number;
}

This is the key to debugging the musical behavior.

Rendering Architecture

Rendering should happen after generation.

src/renderers/
  RomanNumeralRenderer.ts
  ConcreteChordRenderer.ts
  ProgressionTextRenderer.ts
  LeadSheetRenderer.ts
  JsonTraceRenderer.ts
  CsvTraceRenderer.ts
RomanNumeralRenderer
export class RomanNumeralRenderer {
  render(result: GenerationResult): string {
    return result.chords.join(" - ");
  }
}

Example:

I - IV - V7 - I
ConcreteChordRenderer
export class ConcreteChordRenderer {
  renderChord(chord: Chord, key: MusicalKey): string {
    // V7 + C major -> G7
    // bVII + C major -> Bb
  }
}
LeadSheetRenderer

Useful later, but can be simple for MVP.

| I     | IV    | V7    | I     |
Visualization / Debug Rendering

I would not start with audio. Start with explainability visualizations.

src/visualizations/
  data/
    TopologyGraphDataBuilder.ts
    CandidateDistributionDataBuilder.ts
    TensionTimelineDataBuilder.ts
    FactorContributionDataBuilder.ts
    TrajectoryGraphDataBuilder.ts

  svg/
    SvgTopologyRenderer.ts
    SvgTensionTimelineRenderer.ts

  adapters/
    ReactFlowTopologyAdapter.ts
    D3TopologyAdapter.ts
    MermaidGraphAdapter.ts
Visualization 1: topology graph

Shows the permanent chord-space.

I -> IV
ii -> V7
V7 -> I
V7 -> vi
bVII -> I

Class:

export class TopologyGraphDataBuilder {
  build(topology: HarmonicTopology): GraphData {
    return {
      nodes: topology.getAllChords().map(toGraphNode),
      edges: topology.getAllEdges().map(toGraphEdge),
    };
  }
}
Visualization 2: candidate distribution per step

Shows what the generator was considering.

Current: ii

Candidate   Total Score   Probability
V7          4.8           62%
IV          1.9           14%
vi          1.1           8%
bVII        0.2           3%

Class:

export class CandidateDistributionDataBuilder {
  build(step: GenerationStep): CandidateDistributionDatum[] {
    return step.candidates.map(candidate => ({
      chord: candidate.edge.to,
      score: candidate.totalScore,
      probability: step.distribution.get(candidate.edge.id),
    }));
  }
}
Visualization 3: tension timeline

Shows whether the resolution pump is working.

Step     Target Tension     Actual Tension
0        0.20               0.18
1        0.50               0.45
2        0.85               0.82
3        0.10               0.22

Class:

export class TensionTimelineDataBuilder {
  build(trace: GenerationTrace): TensionTimelineDatum[] {
    return trace.steps.map(step => ({
      stepIndex: step.stepIndex,
      targetTension: step.targetTension,
      actualTension: step.resultingTension,
    }));
  }
}
Visualization 4: factor contribution breakdown

This is probably the most valuable debugging tool.

Candidate: V7 -> I

harmonicGravity   +2.0
tensionFit        +1.2
cadenceFit        +2.4
novelty           -0.3
surprise          +0.0
total             +5.3

Class:

export class FactorContributionDataBuilder {
  build(candidate: CandidateScore): FactorContributionDatum[] {
    return candidate.factorScores.map(score => ({
      factorId: score.factorId,
      rawScore: score.rawScore,
      weightedScore: score.weightedScore,
      explanation: score.explanation,
    }));
  }
}
Testing Architecture
test/
  unit/
    topology/
      MajorKeyTopologyBuilder.test.ts

    factors/
      HarmonicGravityFactor.test.ts
      TensionFitFactor.test.ts
      PhraseFitFactor.test.ts
      CadenceFitFactor.test.ts
      NoveltyFactor.test.ts
      SurpriseFactor.test.ts

    probability/
      Softmax.test.ts
      WeightedSampler.test.ts

    state/
      StateTransitioner.test.ts
      CadenceClassifier.test.ts
      SurpriseBudgetUpdater.test.ts

    renderers/
      ConcreteChordRenderer.test.ts

  property/
    Softmax.property.test.ts
    WeightedSampler.property.test.ts
    StateTransitioner.property.test.ts

  smoke/
    GenerateFourBarProgression.smoke.test.ts
    GenerateEightBarProgression.smoke.test.ts
    SurpriseBudgetBehavior.smoke.test.ts
    AvoidInfiniteLoop.smoke.test.ts

  snapshots/
    seeded-folk-progression.snapshot.test.ts
    topology-graph-data.snapshot.test.ts
    tension-timeline-data.snapshot.test.ts

  fixtures/
    testConfigs.ts
    testTopologies.ts
    testStates.ts
Unit tests

Directly map these to the spec:

V7 -> I receives high harmonic gravity.
At phrase end, cadence factor increases.
At high target tension, V7 scores above I.
Repeated tonic receives novelty penalty.
Rare moves are blocked or penalized when surpriseBudget is depleted.
Property tests
Softmax probabilities always sum to 1.
Softmax never returns negative probabilities.
Higher temperature flattens distribution.
Lower temperature sharpens distribution.
State counters update consistently.
Sampler never selects an impossible edge.
Smoke tests

These should generate full progressions using seeded randomness.

A 4-bar phrase usually releases near bar 4.
An 8-bar phrase builds more gradually.
The generator does not get stuck on I.
Surprise budget decreases on rare moves.
The same seed produces the same progression.
MVP Implementation Order
Phase 1: Pure model and topology
Chord
ChordId
HarmonicEdge
HarmonicTopology
MajorKeyTopologyBuilder
ChordCatalog

Goal:

topology.getOutgoingEdges("V7");

works.

Phase 2: phrase and state
MusicalState
InitialStateFactory
PhraseEngine
TensionCurve
CadenceClassifier
StateTransitioner

Goal:

state = transitioner.applyTransition({
  state,
  selectedEdge,
  phraseEngine,
  config,
});

works.

Phase 3: factor scoring
FactorEngine
HarmonicGravityFactor
TensionFitFactor
PhraseFitFactor
CadenceFitFactor
NoveltyFactor
SurpriseFactor
CompositeFactorScorer

Goal:

scorer.scoreCandidate(context);

returns a transparent factor breakdown.

Phase 4: probability and sampling
Softmax
ProbabilityDistribution
WeightedSampler
SeededRandomSource

Goal:

const distribution = Softmax.normalize(scores, config.temperature);
const selected = sampler.sample(distribution);

works reproducibly.

Phase 5: full generator
HarmonicPotentialFieldGenerator
GenerationSession
GenerationStep
GenerationTrace

Goal:

generator.generate({ steps: 16, initialChord: "I" });

returns progression plus trace.

Phase 6: renderers and visualizations
RomanNumeralRenderer
ConcreteChordRenderer
ProgressionTextRenderer
TopologyGraphDataBuilder
CandidateDistributionDataBuilder
TensionTimelineDataBuilder
FactorContributionDataBuilder

Goal:

renderer.render(result);
visualizationBuilder.build(result.trace);

works without changing generation behavior.

Proposed Public API
import {
  HarmonicPotentialFieldGenerator,
  MajorKeyTopologyBuilder,
  PhraseTemplates,
  createDefaultMvpConfig,
  RomanNumeralRenderer,
} from "@harmonic-field/core";

const topology = new MajorKeyTopologyBuilder().build();

const generator = HarmonicPotentialFieldGenerator.createDefault({
  topology,
  config: createDefaultMvpConfig({
    key: "C",
    mode: "major",
    phraseTemplate: PhraseTemplates.fourBarResolutionPump,
    temperature: 0.8,
    seed: 12345,
  }),
});

const result = generator.generate({
  steps: 8,
  initialChord: "I",
});

const rendered = new RomanNumeralRenderer().render(result);

console.log(rendered);
console.log(result.trace);

Example output:

I - IV - V7 - I - vi - ii - V7 - I
Key Design Rule

Do not let this become:

ChordGenerator.ts

with everything inside it.

The clean separation should be:

Topology = what can happen
Factors = why something wants to happen
Softmax/Sampler = how desire becomes probability
StateTransitioner = what the choice means
Renderer = how the result is displayed
Trace = why the result happened