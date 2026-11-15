# Repository Audit and Dependency Map

## Scope inspected
All 55 ZIP entries were inventoried. Inspected the TypeScript agents, LangGraph state/nodes/edges,
skill registry/loader, all nine active `SKILL.md` files, the deterministic QA validator, schemas,
services, and utility files.

## Existing pipeline
`director → scriptwriter → storyboardGenerator → compositionPlanner → continuity → visualDirector → artDirection → qa`

The QA package consumes: `creativeBrief`, `script`, parsed `storyboard`, normalized `scenes`,
`compositionPlan`, `productionBible`, and `visualPrompts`. `visualCompositions` produced by the
art-direction node is not currently passed into deterministic or LLM QA.

## Dependency map
- Director brief (central idea, beat map, claim ledger, analogy map) → script, storyboard, composition,
  continuity, visual prompts, render.
- Script beats (narration/order/duration/captions) → storyboard/scenes → composition → visual prompts
  → images/render; also audio/TTS.
- Storyboard (scene mapping, visual purpose, analogy, captions) → composition, continuity review,
  visual prompts, render.
- Composition plan (coordinates, scale, depth, hierarchy) → visual prompts → images/render.
- Production bible (characters, props, palette, art style, safe zones) → visual prompts → images/render.
- Visual prompts → image assets → render.
- Render manifest/audio timings → final assembly and render QA.

## Findings before edits
1. Narrative rules were spread across skills, with rigid card/protagonist/aha/callback requirements that
   could force an unsuitable story form.
2. Several local schemas/terms conflicted: composition example used a noncanonical composition type;
   continuity and renderer examples used `S01` string IDs while state uses numeric `sceneId`; the
   composition agent described a legacy array schema unlike `CompositionPlan`; storyboard agent
   described a legacy scene shape unlike `Scene`.
3. Visual identity values were inconsistent across skills (including red/cream variants).
4. Visual director and art-direction agent overlap. `visualCompositions` is generated but not included
   in the QA package; it is currently ancillary and not a validated source of truth.
5. Three TypeScript schema files (`script.schema.ts`, `storyboard.schema.ts`, `scene.schema.ts`) are
   empty. `voice.service.ts` and `video-render.services.ts` are empty. No package manifest, test
   configuration, sample production package, or build scripts were included in the archive.
6. Existing deterministic validation is substantive, but it does not by itself measure the requested
   ten-dimension creative score. QA agent schema also does not expose a dedicated numeric 10-item
   score array; the revised QA skill therefore requires scores/rationales in its report text.
7. Existing `types.ts` describes a simpler legacy FilmScene/FilmState shape and is not the canonical
   LangGraph `workflow.state.ts` schema.

## Changes made
See the root-level `CHANGELOG_REDESIGN.md`. Existing production capabilities were retained; shared
rules were centralized and role prompts/schema examples were aligned where the included source
supported a safe change.

## Validation limitations
The archive lacks package.json/lockfile, tsconfig, test runner configuration, dependencies, and a
representative package. Therefore TypeScript build, CLI validator execution against a real package,
and end-to-end graph execution could not be run from this archive. Static consistency checks are
reported in the changelog; this is not a claim of runtime success.
