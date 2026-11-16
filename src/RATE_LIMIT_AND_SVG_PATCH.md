# Local Ollama and SVG rendering

- All language-model calls use the local Ollama server.
- Default model: `gemma:e2b`.
- No cloud SDK, API key, cloud quota handling, or provider-specific throttling is required.
- SVG rendering is local and does not call an image-generation provider.

See `.env.example` for Ollama settings. Gemma is a text model; visual assets in this project are represented through generated prompts and locally rendered SVG rather than Gemma image generation.
