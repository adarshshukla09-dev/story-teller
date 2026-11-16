# Reliability changes

Motivated by the failing run `2a1b8cb3`: the director stage ("Universal Explainer Story Architect")
aborted with `token repeat limit reached` after 280s, and the run was lost.

## Fixed

- **Timeout was not enforced.** Stages ran 230s and 280s against a 180s limit. `withTimeout` now races
  the model call against a hard deadline and aborts it.
- **Default timeout raised** to 420s, because the timeout is now real and the strategy stage needs ~230s.
- **Repeat loops are retried with a stronger repeat penalty.** `repeatPenalty` starts at 1.15 and
  rises 0.15 per retry (capped at 1.5). Logs now flag `repeatLoop: true`.
- **Retries on by default.** `AGENT_MAX_ATTEMPTS` defaults to 2 (was 1), so one loop no longer kills the run.
- **Context window raised** to 16384 (`OLLAMA_NUM_CTX`). Ollama's default is small, and the director prompt
  (skills bundle plus upstream JSON) can exceed it. Overflow is silently dropped, which weakens output.

## Cleanup

- Single model config in `src/config/model.ts`. `ai.service.ts` previously defaulted to a different model name.
- Removed unused modules: `services/ai.service.ts`, `services/video-render.services.ts` (empty),
  `services/voice.service.ts` (empty), `types.ts` (no imports).
- Skills path resolves relative to the source file, not `process.cwd()`.
- `.env.example` and `OLLAMA_SETUP.md` document every model and execution setting.

## Not changed (needs a decision)

- `package.json`, `tsconfig.json`, and `.env` are not in the upload. Run the project after adding them.
- The log shows model `gemma4:e2b` while the config default is `gemma:e2b`. Set `OLLAMA_MODEL` to the tag you
  actually pulled.
- `storage.service.ts` is unused. Left in place pending confirmation.
