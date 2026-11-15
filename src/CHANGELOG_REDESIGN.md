# Coordinated Storytelling Redesign — Change Log

## Files added
- `src/skills/custom/skills/STORYTELLING_STANDARD.md`
- `src/skills/custom/skills/PIPELINE_CONTRACTS.md`
- `src/skills/custom/skills/QUALITY_RUBRIC.md`
- `src/skills/custom/skills/REVISION_PROTOCOL.md`
- `src/skills/custom/skills/AUDIT_AND_DEPENDENCY_MAP.md`

## Files updated
- All nine active skill files under `src/skills/custom/skills/**/SKILL.md`: linked each to shared authority.
- `director/SKILL.md`, `scriptwriter/SKILL.md`, `storyboard/SKILL.md`, `composition/SKILL.md`,
  `continuity/SKILL.md`, `qa/SKILL.md`, `renderer/SKILL.md`, `reference-video-style/SKILL.md`,
  `visual-director/SKILL.md`: received shared authority block.
- `storyboard/SKILL.md`: softened forced protagonist/aha cutaway/bookend rules so the story structure
  fits the subject rather than the subject being forced into a template.
- `composition/SKILL.md`: replaced the noncanonical example composition type and listed the shared enum.
- `continuity/SKILL.md`, `renderer/SKILL.md`: corrected example `sceneId` values to positive integers.
- `renderer/SKILL.md`: aligned example canvas colors to the shared cream background.
- `reference-video-style/SKILL.md`: aligned the red accent with the established `#E63946` palette and
  stated palette authority.
- `qa/SKILL.md`: added required ten-dimension scorecard guidance and targeted revision specificity.
- `agents/director.agent.ts`, `agents/scriptwriter.agent.ts`, `agents/storyboard.agent.ts`,
  `agents/compositionPlannerAgent.agent.ts`, `agents/visual-director.agent.ts`: replaced broad/legacy
  role instructions with explicit responsibility and canonical output contracts.
- `graphs/workflow.state.ts`: added typed ten-dimension `creativeScores` to the quality report.
- `graphs/workflow.node.ts`: carries QA creative scores into the stored quality report.
- `reference-video-style/SKILL.md`, `renderer/SKILL.md`: removed black letterbox/alternate cream/red
  variants and aligned full-frame 9:16 canvas, safe zones, and `#E63946` accent with the shared contract.

## Shared framework
The adapted workflow uses audience/promise → genuine tension → fit-for-topic structure → causal argument
→ visual proof/analogy mapping → earned aha → resolution/callback → clarity/integrity audit. It borrows
the reference's narrative-first approach, progressive disclosure, annotation, framing, metaphor, and
integrity checks, adapted for static 9:16 cards and programmatic typography.

## Contract changes
- Numeric `sceneId` is canonical; beat IDs are `Bnn`, character IDs `Cnn`, prop IDs `Pnn`.
- Canonical composition enum: `character-and-environment`, `top-bottom-comparison`,
  `foreground-background-contrast`, `line-chart`, `process-flow`, `cutaway-magnifier`.
- `Scene`, `CompositionPlan`, and `VisualPrompt` structures are explicitly defined in one shared contract.
- Storyboard output is an object with `scenes`; composition output is an array or `{compositionPlan}`;
  visual prompt output is `{imagePrompts}` (legacy transport adapters documented).
- Narration and captions are copied verbatim downstream; generated art is text-free; overlays are
  rendered programmatically; 9:16 safe zones and palette authority are explicit.
- `visualCompositions` from artDirection remains an ancillary artifact: current QA does not consume it.

## Quality rubric
Ten equally weighted dimensions: hook/curiosity, narrative structure, central-idea clarity,
cause/effect, emotional engagement, analogy fidelity, visual storytelling, aha/payoff, factual accuracy,
and ending/memorability. Average honestly; report technical compliance separately. 9+ is a target,
not a promise or scoring adjustment.

## Validation performed
- Inspected all 55 archive entries and all nine active skill documents.
- Confirmed registry references point to skill folders present in the archive.
- Confirmed shared contract composition enum is used in the updated composition-agent prompt and example.
- Confirmed downstream example scene IDs are numeric where updated.
- Confirmed skill documents now point to shared authority.
- Confirmed the shared standards and audit map exist.
- Imported and executed the deterministic validator under Node 22 type stripping; it returned a
  structured `revise` report for an intentionally empty package (5 blockers, 1 review item), confirming
  the validator loads and executes. This is a smoke test only, not a passing production-package test.

## Not run / remaining risks
- No `package.json`, lockfile, `tsconfig`, test runner, dependencies, or sample package were included.
  TypeScript compilation, real package validation, and graph execution were therefore not run.
- The three schema files (`script.schema.ts`, `storyboard.schema.ts`, `scene.schema.ts`) and two services
  (`voice.service.ts`, `video-render.services.ts`) are empty in the supplied archive. They remain empty;
  inventing runtime schemas or rendering behavior without the missing project/dependencies would be unsafe.
- `types.ts` remains a legacy simplified model distinct from `workflow.state.ts`.
- Art direction emits `visualCompositions`, but QA does not consume it; decide whether to remove this
  redundant stage or explicitly integrate its output in a future code-level change.
- Deterministic validator and QA output currently do not expose a dedicated machine-readable ten-score
  array. QA skill instructs scores/rationales in report text, but a future schema change is needed for
  robust downstream analytics.
- No actual generated images or render assets were supplied; visual/image-level QA cannot be claimed.

## Honest assessment
The revised instructions provide a substantially stronger, more coherent creative operating standard,
but they cannot guarantee a 9/10 average. That target is plausible for selected, carefully researched
films after iteration, not something established by this documentation-only pass. The repository
still needs populated schemas/services, runnable tests, a regression package, and real image/render
inspection before production readiness or average quality can be demonstrated.
