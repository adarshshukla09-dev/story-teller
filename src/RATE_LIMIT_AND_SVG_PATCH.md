# Rate-limit and SVG output patch

Changes:
- Provider 429 / RESOURCE_EXHAUSTED quota errors now stop retries immediately instead of sleeping 20–65 seconds and repeating the same exhausted request.
- If the quota is exhausted after the storyboard stage, composition, continuity, and visual-director stages use deterministic fallbacks so the workflow can still produce a result.
- Each visualPrompts[] item now contains an embedded `svg` string. It is a self-contained 9:16 SVG card and is saved automatically inside result/result<N>.json.
- SVG rendering is local and does not call Gemini.

Important:
- This does not increase Gemini's actual provider quota. Check Google AI Studio / Cloud project quota and billing, or select a model with available quota.
- The deterministic SVG is a fallback illustration template, not a substitute for a detailed generated image. You can replace `src/services/svg-renderer.service.ts` with a richer scene-specific renderer later.
- This fallback only applies to quota errors. Authentication, permission, schema, and other failures still surface normally.
