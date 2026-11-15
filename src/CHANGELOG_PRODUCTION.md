# Production upgrade changelog

## Added
- Research dossier stage with explicit evidence provenance and verification-needed markers.
- Adaptive explanation-strategy stage that selects a topic-appropriate learning/story form.
- Independent factuality/domain-safety review after script generation.
- Beginner viewer-comprehension evaluation with an 80/100 minimum and blocking-gap handling.
- Independent creative QA with a 9/10 default release target, with factual/safety/structural blockers taking precedence.
- Source materials and audience fields on workflow input state.
- Bounded exponential model retry, required API-key validation, structured lifecycle logs.
- Import-safe entry point; model calls occur only through explicit workflow invocation or opt-in RUN_DEMO.
- Production deployment checklist and 50-topic benchmark plan.

## Preserved
- Existing script/storyboard/visual/continuity/QA agents and their artifact contracts.
- Existing deterministic package validator and three-revision ceiling.
- Existing Director and Scriptwriter responsibilities, expanded with research and strategy inputs.

## Known limitations
- No web retrieval/grounding provider is configured in the supplied archive; research does not claim live browsing or independently verified citations.
- No package manifest, lockfile, tsconfig, or CI config was included, so full dependency-resolved build and integration tests remain pending in the host repository.
- Automated model review is not a substitute for qualified human review in medical, legal, and safety-sensitive domains.

## QA retry and iterable crash fix

- Normalize model-generated reviewer collections with an array guard. Values such as `false`, `null`, or missing fields are treated as empty collections rather than being spread/iterated.
- Bound `MAX_REVISIONS` to 0–3 (default 3), preventing accidental runaway retry configurations.
- Derive LangGraph's step budget only from that bounded retry count; removed the unbounded `WORKFLOW_RECURSION_LIMIT` override.
- Added a regression test for boolean reviewer fields and retained a bounded-revision test.

## Storycraft and structural reliability update

- Added `viral-explainer-storycraft` and registered it for Director/brief generation, Scriptwriter, Storyboard, and QA.
- Strengthened agent prompts to require the canonical `script.beats` array, stable Bnn beat IDs, exact beat-to-scene copying, and factual claim IDs.
- Replaced the three empty script/storyboard/scene schema modules with canonical TypeScript interfaces and wired them into workflow state and script/storyboard parsing nodes.
- Added deterministic provenance checks from script beat claim IDs through the Director claim ledger to source IDs in the Research dossier. Missing sources now block production rather than appearing only as a caveat.
- Added explicit diagnostics for absent/malformed `script.beats`, required titles and central-idea fields, and explicit analogy limitations. Missing beat arrays are no longer represented only as a generic zero-beat count.
- Fixed the mismatch between QA's 1–10 arithmetic mean and the workflow's 0–100 threshold. The default creative target is now 9/10; existing percentage-style environment overrides remain supported. The existing `weightedQualityAverage` output remains on its 0–100 scale for compatibility, with an explicit 1–10 average also reported.
- Added ten runnable regression tests, including deterministic validator checks and evaluation-fixture coverage for all five domains and ten creative dimensions. Before/after creative scores remain unrun because this source archive has no model runtime configuration, dependencies, credentials, baseline package, or saved demo output.
- Verified that `buildFeedback` is exported from `agents/QA.agent.ts` and imported by `graphs/workflow.node.ts`; the referenced import/export is present in the supplied source.
- The supplied archive has no `package.json`, lockfile, TypeScript configuration, or existing test runner. Full application build and the requested end-to-end demo therefore remain unverified in this extracted source-only copy.


## Universal storytelling quality update (2026-11-14)

- Reworked the storycraft skill from a human-story-first/analogy-first formula into an adaptive cross-domain framework. It now selects the strongest topic-fit story engine and entry point (human, technical, historical, observational, or decision-based) without forcing protagonists, emotion, twists, or analogies.
- Added a repeatable curiosity-to-payoff design process, earned-aha criteria, audience retell test, and domain-specific checks for CS/engineering, history, psychology/economics, science, and medicine.
- Strengthened Director and Scriptwriter prompts to generate and select hook candidates internally, explain the real mechanism/causal chain, and finish with a precise payoff.
- Calibrated creative quality to an evidence-based 8.5/10 production target, with 9+ reserved for exceptional work. Updated workflow default threshold from 9.0 to 8.5; scores are never inflated to meet the target.
- Updated QA to avoid requiring a human protagonist or artificial bookend callback and to assess honest causal/temporal/evidential transitions.
- Expanded benchmark cases with Docker, the Progress Paradox, and the Berlin Wall; sources must be supplied and verified per case.
- Fixed QA revision routing so epistemic issues involving missing dossier source IDs return to the Director/brief stage rather than being treated as script-only defects.
- Validation note: the included Node test cannot run directly in this extracted archive because the test imports a TypeScript module and the archive has no package manifest/TS loader. JSON fixture parsing succeeded; full build and model-based before/after scoring remain unverified.
