# Run Story Teller with Ollama

1. Install Ollama: https://ollama.com/
2. Pull the model you intend to use, e.g. `ollama pull gemma:e2b`.
3. Start the server: `ollama serve` (if it is not already running).
4. Copy `.env.example` to `.env` and set `OLLAMA_MODEL` to the exact tag you pulled.
5. Install dependencies and start the app using the scripts in the project's `package.json`.

## Configuration

All model settings live in one place (`src/config/model.ts`) and are overridden by environment variables:

| Variable | Default | Purpose |
| --- | --- | --- |
| `OLLAMA_MODEL` | `gemma:e2b` | Model tag. Must match `ollama list` exactly. |
| `OLLAMA_NUM_CTX` | `16384` | Context window. Too small silently drops prompt content. |
| `OLLAMA_REPEAT_PENALTY` | `1.15` | Stops repetition loops. Increased on each retry. |
| `AGENT_MAX_ATTEMPTS` | `2` | Tries per agent call. |
| `AGENT_TIMEOUT_MS` | `420000` | Hard per-call deadline. |

## Notes

No cloud account or API key is used. Throughput is limited by local hardware (RAM/VRAM) and the Ollama server. The app does not impose a request-rate limiter.

`gemma:e2b` is a text model. The SVG output is generated locally by the project's SVG renderer, not by the model.
