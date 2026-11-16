# Storyboard batch fix

## Root cause of run 2fe1db44

Batches were validated against `batchScript`, which inherits the full script's `title` and `oneIdea`.
The validator required the model to copy both exactly. The model paraphrased them, so batch 1 was
rejected on both attempts (about 11 minutes of CPU time each). The merge step overwrites those fields
anyway, so the check added failure without adding safety.

## Changes

- **Application owns script facts.** `reconcileStoryboardBatch` writes `videoTitle`, `oneIdea`,
  `aspectRatio`, `sceneId`, `sourceBeatIds`, `narration`, `estimatedDurationSeconds`, `isAhaCard`,
  `headerText`, and `caption` from the script beats. It runs before validation through a new
  `normalize` hook in `callJson`.
- **Optional structural fields are defaulted** (`visualMetaphor`, `analogyRelationShown`, `echoesScene`,
  arrays, `programmaticOverlays`, `transitionToNext`), so omitting them does not cause a rejection.
- **Smaller storyboard output.** The storyboard prompt no longer asks the model to repeat narration,
  captions, or titles. On CPU, generated tokens are the main cost, so this shortens every batch.
- **Per-stage model override.** `OLLAMA_MODEL_STORYBOARD` runs only the storyboard stage on a different
  model, so a smaller model can be tested without changing the rest of the pipeline.
- The model still owns all creative fields, and validation still checks them: compositionType enum,
  scene count, required arrays, and visualPurpose content.

## Verified

- The real validator and reconciler, transpiled from `workflow.node.ts`, accept the failing batch shape.
- The original validation path rejects the same output.
- Negative controls still reject an invalid compositionType and a wrong scene count.
