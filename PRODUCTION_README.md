# Universal Storyteller — Production Readiness Upgrade

This package extends the existing illustrated explainer workflow with research/evidence planning, adaptive explanation strategy, independent factual review, learner-comprehension evaluation, stronger release gates, bounded retries, and safe import behavior.

## Updated workflow

```text
Topic + optional source materials + audience
  -> Research dossier
  -> Explanation strategy selection
  -> Director / creative brief
  -> Scriptwriter
  -> Independent fact-check
  -> Viewer comprehension evaluation
  -> Storyboard
  -> Composition planning
  -> Continuity / production bible
  -> Visual direction
  -> Deterministic validator + independent QA
  -> Pass -> Art direction -> done
  -> Fail -> restart at the earliest defective stage (bounded by MAX_REVISIONS QA runs, default 3)
```

## Calling the workflow

Import `runFilmWorkflow` from `src/index.ts` and call:

```ts
const { result, savedPath } = await runFilmWorkflow(
  "Explain Docker in computer science",
  {
    audience: "curious beginner",
    sourceMaterials: [
      // Optional: excerpts, notes, source URLs, or structured reference material.
    ],
  },
);

if (result.qualityStatus !== "pass") {
  // Do not publish automatically. Inspect qualityReport and validatorReport.
}
```

Importing `src/index.ts` never starts model calls. From the command line:

```bash
npm run dev -- "Explain Docker in computer science"
# or: RUN_DEMO=true DEMO_TOPIC="How vaccines work" npm run dev
```

Run without a topic it only prints usage. Identical concurrent calls are de-duplicated. See `.env.example` for every setting and `src/CHANGELOG_STABILITY.md` for recent fixes.

## Environment

- `GEMINI_API_KEY` — required.
- `GEMINI_MODEL` — optional; defaults to `gemini-3.1-flash-lite`.
- `AGENT_MAX_ATTEMPTS` — optional bounded retry count; defaults to 3.
- `RUN_DEMO=true` — optional local demo switch.
- `DEMO_TOPIC` — optional demo topic.

The existing repository archive did not include a package manifest, lockfile, tsconfig, CI configuration, or dependency installation metadata. Those must be restored from the owning application before a reproducible build/deploy can be certified.

## Evidence integrity limitation

The Research Agent organizes supplied reference material and marks claims requiring external verification. The current model adapter is Gemini without a configured web-search/grounding tool. Therefore this upgrade does **not** claim autonomous live web research or verified citations. For production publication, connect a trusted retrieval/search provider and pass retrieved source excerpts/metadata in `sourceMaterials`; persist claim-to-source mappings and require source review for high-stakes claims.

## Domain safeguards

The agents are instructed to apply heightened caution to medicine, law, engineering safety, history, science, and technical topics. These LLM reviews are not a substitute for qualified domain review. Medical content must not become individualized diagnosis or treatment advice; legal explanations must identify jurisdiction; engineering/safety claims need standards and assumptions.

## Release gates

- Deterministic package validation remains authoritative for schema, counts, timing, and scene/prompt contracts.
- Independent fact-check errors and unsafe claims block release.
- Viewer comprehension score below 80/100 or any blocking comprehension gap blocks release.
- QA applies a weighted quality rubric with an 85/100 target; quality scores never override factual/safety blockers.
- A failed QA result remains `revise`; callers must not publish it as approved.
- The graph stops after `MAX_REVISIONS` QA runs (default 3: the first run plus two revisions) and the LangGraph recursion limit is derived from it. Missing external source verification is reported as `publicationCaveats`, not as a blocker, unless `STRICT_SOURCE_VERIFICATION=true`.

## Operational hardening included

- Required API key validation before paid model calls.
- Bounded exponential retry for transient model failures.
- Structured agent/workflow log events.
- No automatic paid model calls when the module is imported.

## Still required before production deployment

1. Restore/commit the real package manifest, lockfile, tsconfig, and supported Node version.
2. Configure retrieval/grounding and source persistence; do not treat model-generated references as evidence.
3. Add secrets management, rate limiting across multiple processes, request timeouts/cancellation, and per-user quotas.
4. Add tracing/metrics for token usage, latency, retries, failures, cost, and revision count.
5. Add integration tests with mocked model responses and a benchmark suite covering the domains in `tests/PRODUCTION_BENCHMARK.md`.
6. Add human approval for medical/legal/safety-sensitive publication.
7. Validate the generated package against the consuming renderer's actual schemas before deployment.

## Test status

The supplied ZIP had no package manifest or TypeScript configuration, so a full compile, dependency-resolved integration test, and live model test cannot be run from this archive alone. The included benchmark and release checklist define the tests to run after restoring the host application's build metadata.

### Validation performed in this handoff

Update: with the dependencies installed in a scratch project the code typechecks under `strict` and `tests/workflow.routing.test.ts` passes (mocked model, no live-model test). Earlier note: a TypeScript syntax/typecheck pass was attempted with the globally available compiler. It was blocked by the archive's missing dependencies and Node type declarations (`@langchain/google-genai`, `@langchain/langgraph`, `@google/genai`, `@types/node`) and missing project module configuration. No runtime or live-model test is claimed. Restore the host project's manifest and lockfile, install its pinned dependencies, then run its normal build and test commands.
