# Stability changelog

## Fixed (found in a real run log)
- **GraphRecursionError after the first QA revision.** LangGraph's default recursion limit is 25 steps, but one pass is ~11 nodes, so any second pass crashed and the whole (paid) run was lost. The limit is now derived from `MAX_REVISIONS` (`RECURSION_LIMIT`, 53 by default) and passed to the graph.
- **Impossible release gate.** Without a retrieval provider, every claim is "verification required", and each one was a blocking issue, so QA could never pass. They are now `publicationCaveats` in the report (set `STRICT_SOURCE_VERIFICATION=true` to restore blocking).
- **Duplicate concurrent runs.** The log showed every agent starting twice (two jobs sharing one rate limit). `runFilmWorkflow` is now single-flight per topic+audience, and every log line carries a `runId`.
- **Hardcoded Telegram bot token** in `services/storage.service.ts` (and the bot started on import). Token removed; now `TELEGRAM_BOT_TOKEN`, created on demand. **Revoke the old token in @BotFather.**
- **`console.time` label collisions** ("Label already exists" / "No such label" warnings): replaced with `durationMs` in structured logs.

## Improved
- Revision routing now considers every blocking source (fact check, comprehension, quality score), not just the validator; a failed QA *judge* call ends the run instead of pointlessly rerunning the script.
- QA feedback includes comprehension `revisionInstructions` and fact-check `correctedClaimSuggestions`.
- Art direction runs once, only after QA passes (it is not inspected by QA and cost a call per pass); its failure no longer discards an approved package.
- Invalid/truncated JSON from a model is retried once with a repair instruction before failing.
- Per-agent temperature (reviewers 0.1-0.2, writers 0.7), `maxOutputTokens`, per-call timeout, quota-aware backoff, fatal errors (bad key) are not retried, array-style Gemini content handled.
- Crashed runs save their last known state to `result/result<N>.failed.json`; result writes are atomic.
- Skill files cached; rate limits and thresholds configurable via env (see `.env.example`).
- `src/index.ts` is now a CLI: `npm run dev -- "topic"`; no model calls on import or without a topic.

## Tests
`npx tsx --test tests/workflow.routing.test.ts` (no API key needed; model is mocked): revision ceiling, source-verification caveat, regression for the limit-25 crash, JSON repair retry.
