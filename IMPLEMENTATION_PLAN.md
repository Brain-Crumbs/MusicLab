Parallel Implementation Plan
Wave 0 — Project Skeleton

These can happen first.

Task ID	Task	Output	Depends on
T0.1	Create TypeScript package scaffold	package.json, tsconfig.json, vitest.config.ts	none
T0.2	Add lint/format/test scripts	npm run test, npm run lint, npm run typecheck	none
T0.3	Create folder structure	Empty src/core, src/renderers, src/visualizations, test folders	none
T0.4	Define public barrel exports	Initial src/index.ts, src/core/index.ts	T0.3
Wave 1 — Core Model Contracts

All of these can mostly happen in parallel once the scaffold exists.

Task ID	Task	Output	Depends on
M1.1	Define chord identifiers	ChordId.ts	T0.3
M1.2	Define harmonic function enums	HarmonicFunction.ts	T0.3
M1.3	Define chord model	Chord.ts	M1.1, M1.2
M1.4	Define harmonic edge model	HarmonicEdge.ts	M1.1
M1.5	Define topology model interface	HarmonicTopology.ts	M1.3, M1.4
M1.6	Define musical state model	MusicalState.ts	M1.1, M1.2
M1.7	Define cadence state model	CadenceState.ts	M1.1
M1.8	Define generation config model	GenerationConfig.ts	M1.1
M1.9	Define style profile model	StyleProfile.ts	M1.1, M1.2
M1.10	Define phrase template model	PhraseTemplate.ts	none
M1.11	Define generation step/trace models	GenerationStep.ts, GenerationTrace.ts	M1.5, M1.6
Wave 2 — Topology Construction

These can run in parallel after the model contracts are available.

Task ID	Task	Output	Depends on
G2.1	Implement chord catalog	ChordCatalog.ts with MVP chords: I, ii, iii, IV, V, V7, vi, vii°, bVII	M1.3
G2.2	Implement edge factory	EdgeFactory.ts	M1.4
G2.3	Implement functional motion classifier	FunctionalMotionClassifier.ts	M1.3, M1.4
G2.4	Implement topology builder interface	TopologyBuilder.ts	M1.5
G2.5	Implement major-key topology builder	MajorKeyTopologyBuilder.ts	G2.1, G2.2, G2.4
G2.6	Unit test chord catalog	ChordCatalog.test.ts	G2.1
G2.7	Unit test topology edges	MajorKeyTopologyBuilder.test.ts	G2.5
Wave 3 — Phrase, Tension, and State

These are separable but share the state contracts.

Task ID	Task	Output	Depends on
S3.1	Implement phrase templates	PhraseTemplates.ts	M1.10
S3.2	Implement phrase engine	PhraseEngine.ts	M1.10, S3.1
S3.3	Implement phrase position classifier	PhrasePositionClassifier.ts	M1.10
S3.4	Implement initial state factory	InitialStateFactory.ts	M1.6, M1.8
S3.5	Implement tension estimator	TensionEstimator.ts	M1.3, M1.4
S3.6	Implement cadence classifier	CadenceClassifier.ts	M1.4, M1.7
S3.7	Implement repetition tracker	RepetitionTracker.ts	M1.6
S3.8	Implement surprise budget updater	SurpriseBudgetUpdater.ts	M1.6, M1.8
S3.9	Implement harmonic region tracker	HarmonicRegionTracker.ts	M1.6, M1.2
S3.10	Implement state transitioner	StateTransitioner.ts	S3.2, S3.5, S3.6, S3.7, S3.8, S3.9
S3.11	Unit test state transitions	StateTransitioner.test.ts	S3.10
Wave 4 — Factor Engines

Each factor should be a separate task and independently testable.

Task ID	Task	Output	Depends on
F4.1	Define factor engine interface	FactorEngine.ts	M1.4, M1.6, M1.8
F4.2	Define factor context model	FactorContext.ts	F4.1, M1.5
F4.3	Define factor score model	FactorScore.ts	F4.1
F4.4	Implement harmonic gravity factor	HarmonicGravityFactor.ts	F4.1, F4.2, F4.3
F4.5	Implement tension fit factor	TensionFitFactor.ts	F4.1, F4.2, S3.5
F4.6	Implement phrase fit factor	PhraseFitFactor.ts	F4.1, F4.2, S3.2, S3.3
F4.7	Implement cadence fit factor	CadenceFitFactor.ts	F4.1, F4.2, S3.6
F4.8	Implement novelty factor	NoveltyFactor.ts	F4.1, F4.2, S3.7
F4.9	Implement surprise factor	SurpriseFactor.ts	F4.1, F4.2, S3.8
F4.10	Implement style factor	StyleFactor.ts	F4.1, F4.2, M1.9
F4.11	Implement memory factor	MemoryFactor.ts	F4.1, F4.2, M1.6
F4.12	Implement composite factor scorer	CompositeFactorScorer.ts	F4.3 plus at least one factor
F4.13	Unit test harmonic gravity	HarmonicGravityFactor.test.ts	F4.4
F4.14	Unit test tension fit	TensionFitFactor.test.ts	F4.5
F4.15	Unit test phrase fit	PhraseFitFactor.test.ts	F4.6
F4.16	Unit test cadence fit	CadenceFitFactor.test.ts	F4.7
F4.17	Unit test novelty	NoveltyFactor.test.ts	F4.8
F4.18	Unit test surprise	SurpriseFactor.test.ts	F4.9
F4.19	Unit test composite scorer	CompositeFactorScorer.test.ts	F4.12

For MVP, F4.10 and F4.11 can be deferred, because the attached spec lists style and memory as important but the MVP starts with gravity, tension, phrase, cadence, novelty, and surprise.

Wave 5 — Probability Engine

These are almost completely parallel and music-theory independent.

Task ID	Task	Output	Depends on
P5.1	Define probability distribution model	ProbabilityDistribution.ts	M1.4
P5.2	Implement softmax normalizer	Softmax.ts	P5.1
P5.3	Define random source interface	RandomSource.ts	none
P5.4	Implement seeded random source	SeededRandomSource.ts	P5.3
P5.5	Implement weighted sampler	WeightedSampler.ts	P5.1, P5.3
P5.6	Unit test softmax	Softmax.test.ts	P5.2
P5.7	Property test softmax	Softmax.property.test.ts	P5.2
P5.8	Unit test weighted sampler	WeightedSampler.test.ts	P5.5
P5.9	Property test weighted sampler	WeightedSampler.property.test.ts	P5.5
Wave 6 — Generator Integration

This is where the pieces become the actual stochastic harmonic engine.

Task ID	Task	Output	Depends on
X6.1	Define generator dependency model	GeneratorDependencies.ts	Waves 1–5
X6.2	Define generate request/result models	GenerateRequest.ts, GenerationResult.ts	M1.11
X6.3	Implement step generator	StepGenerator.ts	F4.12, P5.2, P5.5, S3.10
X6.4	Implement generation session	GenerationSession.ts	X6.3
X6.5	Implement main generator class	HarmonicPotentialFieldGenerator.ts	X6.2, X6.3, X6.4
X6.6	Implement default MVP factory	createDefaultMvpGenerator.ts	G2.5, S3.1, F4.12, P5.4, X6.5
X6.7	Smoke test 4-bar generation	GenerateFourBarProgression.smoke.test.ts	X6.5
X6.8	Smoke test 8-bar generation	GenerateEightBarProgression.smoke.test.ts	X6.5
X6.9	Smoke test seeded determinism	SeededGeneration.smoke.test.ts	X6.5, P5.4
X6.10	Smoke test no impossible transitions	NoImpossibleTransitions.smoke.test.ts	X6.5, G2.5
Wave 7 — Diagnostics and Traceability

These should not affect generation. They consume generation output.

Task ID	Task	Output	Depends on
D7.1	Define score breakdown model	ScoreBreakdown.ts	F4.3, X6.3
D7.2	Define distribution snapshot model	DistributionSnapshot.ts	P5.1, X6.3
D7.3	Define state snapshot model	StateSnapshot.ts	M1.6
D7.4	Implement trace recorder	TraceRecorder.ts	M1.11, D7.1, D7.2, D7.3
D7.5	Add trace output to generator	Updated GenerationResult with trace	D7.4, X6.5
D7.6	Snapshot test generation trace	generation-trace.snapshot.test.ts	D7.5
Wave 8 — Renderers

These are also parallel because they consume final results only.

Task ID	Task	Output	Depends on
R8.1	Implement Roman numeral renderer	RomanNumeralRenderer.ts	X6.2
R8.2	Implement concrete chord renderer	ConcreteChordRenderer.ts	M1.3
R8.3	Implement progression text renderer	ProgressionTextRenderer.ts	R8.1, R8.2
R8.4	Implement lead sheet renderer	LeadSheetRenderer.ts	R8.1
R8.5	Implement JSON trace renderer	JsonTraceRenderer.ts	D7.5
R8.6	Implement CSV trace renderer	CsvTraceRenderer.ts	D7.5
R8.7	Unit test Roman numeral rendering	RomanNumeralRenderer.test.ts	R8.1
R8.8	Unit test concrete chord rendering	ConcreteChordRenderer.test.ts	R8.2
R8.9	Snapshot test lead sheet output	LeadSheetRenderer.snapshot.test.ts	R8.4
Wave 9 — Visualization Data Builders

These should produce data only. React, D3, SVG, or Mermaid can come later.

Task ID	Task	Output	Depends on
V9.1	Define generic graph data model	GraphData.ts	none
V9.2	Implement topology graph data builder	TopologyGraphDataBuilder.ts	V9.1, M1.5
V9.3	Implement trajectory graph data builder	TrajectoryGraphDataBuilder.ts	V9.1, D7.5
V9.4	Implement candidate distribution data builder	CandidateDistributionDataBuilder.ts	D7.5
V9.5	Implement tension timeline data builder	TensionTimelineDataBuilder.ts	D7.5
V9.6	Implement factor contribution data builder	FactorContributionDataBuilder.ts	D7.5, F4.3
V9.7	Snapshot test topology graph data	topology-graph-data.snapshot.test.ts	V9.2
V9.8	Snapshot test tension timeline data	tension-timeline-data.snapshot.test.ts	V9.5
V9.9	Snapshot test factor contribution data	factor-contribution-data.snapshot.test.ts	V9.6
Wave 10 — Visualization Renderers

These are optional adapters. They should not be imported by the core generator.

Task ID	Task	Output	Depends on
A10.1	Implement Mermaid topology adapter	MermaidGraphAdapter.ts	V9.2
A10.2	Implement Mermaid trajectory adapter	MermaidTrajectoryAdapter.ts	V9.3
A10.3	Implement SVG topology renderer	SvgTopologyRenderer.ts	V9.2
A10.4	Implement SVG tension timeline renderer	SvgTensionTimelineRenderer.ts	V9.5
A10.5	Implement React Flow topology adapter	ReactFlowTopologyAdapter.ts	V9.2
A10.6	Implement D3 topology adapter	D3TopologyAdapter.ts	V9.2
A10.7	Snapshot test Mermaid topology	mermaid-topology.snapshot.test.ts	A10.1
A10.8	Snapshot test SVG timeline	svg-tension-timeline.snapshot.test.ts	A10.4
Wave 11 — CLI and Examples

These are thin wrappers around the core.

Task ID	Task	Output	Depends on
C11.1	Implement basic CLI entrypoint	src/cli/index.ts	X6.6, R8.1
C11.2	Add CLI config loading	loadGeneratorConfig.ts	M1.8, C11.1
C11.3	Add CLI trace export option	--trace json/csv	R8.5, R8.6
C11.4	Add basic example script	examples/generate-basic-progression.ts	X6.6, R8.1
C11.5	Add folk-style example script	examples/generate-folk-progression.ts	M1.9, F4.10
C11.6	Add potential-field debug example	examples/debug-potential-field.ts	D7.5, V9.4, V9.6
MVP Critical Path

The shortest path to a working generator is:

T0.1
T0.3
M1.1-M1.11
G2.1
G2.2
G2.5
S3.1
S3.2
S3.4
S3.5
S3.6
S3.10
F4.1-F4.9
F4.12
P5.1-P5.5
X6.1-X6.6
R8.1

That gives you:

generator.generate({
  steps: 8,
  initialChord: "I",
});

and:

I - IV - V7 - I - vi - ii - V7 - I