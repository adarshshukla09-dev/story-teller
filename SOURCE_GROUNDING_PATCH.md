# Source grounding patch

## What this patch changes

- Adds a typed, documented input shape for caller-supplied research sources.
- Normalizes source metadata before it reaches the research agent.
- Rejects duplicate source IDs.
- Rebuilds the dossier source list exclusively from supplied source records.
- Marks a claim `verified` only when its source ID exists and its quoted excerpt is an exact substring of supplied source content or a supplied key excerpt.
- Leaves unsupported or mismatched claims `unverified` and records a reason.

This is excerpt matching, **not independent authentication** of a publication. The pipeline still does not browse. Supply source text you are permitted to use and a real reference. Never use the example URL or placeholder text as evidence.

## Copy-paste example

See `src/examples/source-materials.example.ts`. Copy the `sourceMaterials` array into your existing `runFilmWorkflow(topic, { sourceMaterials })` call and replace every placeholder with a real source record.

## Files changed

- `src/lib/source-grounding.ts` (new)
- `src/graphs/workflow.node.ts` (research node now normalizes and grounds dossier)
- `src/examples/source-materials.example.ts` (new usage example)
