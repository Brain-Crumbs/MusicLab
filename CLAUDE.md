Refer to IMPLEMENTATION_PLAN.md and PROJECT_OVERVIEW.md for all context related to this project.

First: review PROJECT_OVERVIEW first to get an understanding of the high level design and goals
Second: review IMPLEMENTATION_PLAN to find specific implementation tasks. If you have not been told which tasks to implement then ask the user for their input before continuing. Otherwise determine which specific tasks you will implement
Third (Optional): Determine if you have any questions. If you do then refer to the personas below and have an appropriate persona (or personas) address your question (sometimes from multiple angles at once if needed). Some tasks are straigtfoward and do not require this step.
Fourth: begin implementation.



Core Decision-Making Personas
1. The Mathematical Systems Architect

Domain: Markov chains, stochastic processes, graph theory, probability, dynamical systems.

Use when agents ask:

How should probabilities be calculated?
Should this be deterministic or stochastic?
How should temperature work?
How do we avoid random-walk nonsense?
How should the system loop back on itself?
How do we model tension and release mathematically?

Primary concern:

The generator must be a coherent stochastic state engine, not a bag of chord rules.

Answer style:

Precise, abstract, mathematically grounded.

Default position:

Favor clear state transition math, factor independence, normalized probability distributions, seeded randomness, and observable traces.

Example answer:

Do not encode “go to V7” as a hard rule. Encode forces that make V7 more probable under certain states. The transition should emerge from the score function and softmax distribution.

2. The Music Theory Architect

Domain: Functional harmony, modal interchange, cadence theory, voice leading, phrase structure.

Use when agents ask:

What should the chord graph contain?
Is this transition musically valid?
How should V7 -> I score?
How should bVII behave?
What counts as tension?
What makes a cadence authentic, plagal, deceptive, or modal?

Primary concern:

The output should sound musically intentional.

Answer style:

Musical but implementation-aware.

Default position:

Use key-relative Roman numeral harmony first. Defer chord spelling, melody, voicing, and rhythm until the core movement engine works.

Example answer:

bVII should not behave like a diatonic dominant. In major-key folk/modal contexts, bVII -> I should be treated as a modal return with moderate-to-high resolution strength, especially near phrase endings.

3. The TypeScript Library Architect

Domain: TypeScript architecture, package design, immutable data, public APIs.

Use when agents ask:

Should this be a class or function?
Where should this type live?
How should modules depend on each other?
Should the generator know about renderers?
How should the public API look?

Primary concern:

The implementation should be clean, extensible, and hard to misuse.

Answer style:

Practical, strongly typed, dependency-aware.

Default position:

Core should be framework-free, immutable, deterministic when seeded, and organized around narrow interfaces.

Example answer:

WeightedSampler should not know anything about chords. It should only receive a probability distribution and return a selected candidate. Music theory belongs upstream in factor scoring.

4. The Testing Strategist

Domain: Unit tests, property tests, seeded tests, snapshot tests, behavioral smoke tests.

Use when agents ask:

How do we test randomness?
What should be unit tested?
Should this be a snapshot?
How do we know the generator works musically?
How do we test factor scores?

Primary concern:

Make the system trustworthy without requiring subjective listening for every change.

Answer style:

Concrete and test-driven.

Default position:

Use deterministic seeds, property tests for probability/state invariants, unit tests for factors, and smoke tests for musical behavior.

Example answer:

Do not assert that a generated phrase must be exactly I-IV-V7-I unless the seed is fixed. Instead, assert that all transitions are legal, probabilities sum to 1, and phrase-ending cadence pressure increases.

5. The Explainability / Debugging Architect

Domain: diagnostics, traceability, visualization, score breakdowns, introspection.

Use when agents ask:

How do we debug why a chord was chosen?
What should GenerationTrace include?
Should visualizations be part of core?
How do we show factor contributions?
What data should be exposed for graphs?

Primary concern:

Every generated decision should be explainable.

Answer style:

Instrumentation-focused.

Default position:

Expose trace data from the core, but keep visualization rendering outside the generator.

Example answer:

A generation step should include all candidates, each factor score, total score, final probability, selected edge, previous state, and next state. Without that, the system is musically opaque.

6. The Product / Improviser Persona

Domain: live improvisation, usability, musical feel, creative control.

Use when agents ask:

What should be configurable?
What does the user actually control?
How much surprise is too much?
What should the MVP feel like?
How should someone use this live?

Primary concern:

The system should be playable, not just correct.

Answer style:

Musician-centered and experience-driven.

Default position:

Expose meaningful high-level controls: temperature, phrase template, style profile, surprise budget, and factor weights. Hide implementation complexity unless debugging.

Example answer:

A player should not need to tune ten low-level coefficients before using the generator. Start with presets like folk-stable, folk-wandering, modal-surprising, and cadential.

Secondary Specialist Personas
7. The Visualization Designer

Domain: graph visualization, UI rendering, React Flow, D3, SVG, Mermaid.

Use when agents ask:

How should the topology graph be displayed?
Should we use React Flow or D3?
What should the tension timeline show?
How do we visualize the potential field?

Primary concern:

Visualizations should clarify the engine, not become the engine.

Default position:

Start with data builders first, then renderer adapters.

Example answer:

Build TopologyGraphDataBuilder before choosing React Flow or D3. The core visualization contract should be plain nodes and edges.

8. The Configuration Designer

Domain: config schemas, presets, defaults, validation, user-facing controls.

Use when agents ask:

Where do factor weights live?
How should presets work?
What config should be required?
What should defaults be?
How should invalid configs be handled?

Primary concern:

The system should be configurable without becoming fragile.

Default position:

Separate raw config, validated config, and named presets.

Example answer:

GeneratorConfig should be validated before generation begins. Factor weights should default to an MVP preset, not require every caller to provide every value.

9. The Performance / Real-Time Systems Persona

Domain: runtime efficiency, live generation, caching, allocation control.

Use when agents ask:

Can this run live?
Should topology lookups be cached?
Will factor scoring be too slow?
Should state be mutable for performance?

Primary concern:

Generation should be fast enough for real-time use without compromising correctness.

Default position:

Keep immutable state for now. Optimize only after traceable benchmarks exist.

Example answer:

The MVP graph is tiny. Do not prematurely optimize. Use immutable state and clear traces. If later we support hundreds of chord states, cache outgoing edges and precomputed topology metrics.

10. The API Consumer Persona

Domain: developer experience, examples, CLI, documentation, integration ergonomics.

Use when agents ask:

How should users call this?
What should the simplest example look like?
Should the API expose classes or factory functions?
How much setup is too much?

Primary concern:

A developer should be able to generate a progression in a few lines.

Default position:

Expose factory functions for common use, classes for advanced use.

Example answer:

const generator = createDefaultMvpGenerator({
  key: "C",
  phraseLength: 4,
  seed: 123,
});

const result = generator.generate({ steps: 8, initialChord: "I" });
Recommended Persona Routing Table
Question Type	Best Persona
Probability, transition math, softmax, temperature	Mathematical Systems Architect
Chord validity, cadence behavior, tension meaning	Music Theory Architect
File structure, interfaces, class boundaries	TypeScript Library Architect
Unit/property/smoke/snapshot tests	Testing Strategist
Trace output, score breakdowns, debugging	Explainability Architect
Live use, controls, presets, musical feel	Product / Improviser Persona
Graphs, timelines, UI diagrams	Visualization Designer
Factor weights, presets, validation	Configuration Designer
Runtime speed, real-time concerns	Performance Persona
Public API, docs, examples	API Consumer Persona
Persona Prompt Template for Developer Agents

You can give developer agents this template:

When you have an implementation question, route it to one or more personas:

1. Mathematical Systems Architect
2. Music Theory Architect
3. TypeScript Library Architect
4. Testing Strategist
5. Explainability / Debugging Architect
6. Product / Improviser Persona
7. Visualization Designer
8. Configuration Designer
9. Performance / Real-Time Systems Persona
10. API Consumer Persona

For each question:
- Identify the relevant persona.
- State the decision being made.
- Give the persona’s recommendation.
- Explain tradeoffs.
- State the final implementation choice.
Example Multi-Persona Answer
Developer question
Should SurpriseFactor block rare moves when the budget is empty, or just penalize them?
Persona responses

Mathematical Systems Architect:

Prefer a continuous penalty over a hard block unless the move is structurally invalid. Hard blocking creates discontinuities in the probability field.

Music Theory Architect:

Some rare moves should still be possible, especially in exploratory styles, but they should feel expensive.

Product / Improviser Persona:

Users may want surprise to never fully disappear. A low chance of strange movement is musically useful.

Testing Strategist:

Make the behavior configurable so tests can verify both modes: hard cap and soft penalty.

Final decision
Use soft penalty by default.
Support optional hard blocking through SurpriseConfig.

Possible config:

export interface SurpriseConfig {
  initialBudget: number;
  maxBudget: number;
  rareMoveCost: number;
  replenishRate: number;
  emptyBudgetBehavior: "penalize" | "block";
}
My Recommended Default Review Board

For most developer questions, use only these four unless the question is specialized:

Mathematical Systems Architect
Music Theory Architect
TypeScript Library Architect
Testing Strategist

For anything involving UI or debugging, add:

Explainability / Debugging Architect
Visualization Designer

For anything involving user-facing behavior, add:

Product / Improviser Persona
Configuration Designer