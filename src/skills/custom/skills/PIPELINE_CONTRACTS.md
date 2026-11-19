# Pipeline Contracts

## Authority and ownership

The LangGraph pipeline is linear: `director → scriptwriter → storyboard → composition → continuity → visual director → art direction → QA`. The artifacts consumed by deterministic QA are the parsed `creativeBrief`, `script`, `storyboard`, `scenes`, `compositionPlan`, `visualPrompts`, and `productionBible`. The code normalizes script word counts/duration; do not hand-edit computed values.

| Stage                  | Owns                                                                                 | Must preserve                                 | Must not do                                 |
| ---------------------- | ------------------------------------------------------------------------------------ | --------------------------------------------- | ------------------------------------------- |
| Director               | central idea, audience, structure, beat map, analogy map, sourced claims             | factual uncertainty and traceability          | write final narration or invent evidence    |
| Scriptwriter           | beat narration, transitions, caption copy, timing proposal, beat-to-claim references | approved story/claims; compute no fake counts | add unsupported claims or pad               |
| Storyboard             | scene-to-beat mapping, visual purpose, visual metaphor, scene captions/overlays      | narration verbatim and beat order             | change story or composition coordinates     |
| Composition            | spatial blueprint and hierarchy                                                      | scene IDs, visual intent, square 1:1 zones    | change narrative, introduce story elements  |
| Continuity             | production bible: canonical cast, props, palette, drawing style, card template       | approved storyboard/composition               | invent facts or alter narrative             |
| Visual director        | full-card image prompt with exact title/caption + overlay metadata                    | storyboard, composition, production bible     | rewrite text, move elements, invent objects |
| Renderer/art direction | rendering implementation and asset styling                                           | exact order, timing, palette, overlays        | claim inspection or QA not performed        |
| QA                     | deterministic validation + independent creative judgment                             | evidence and all upstream artifacts           | silently repair upstream artifacts          |

### Scriptwriter output boundary

The Scriptwriter produces canonical Script beats only.

It must not add scene IDs, scene numbers, image descriptions, visual prompts, composition instructions, character specifications, or SVG-generation instructions to Script beats.

Visual purpose and metaphor belong to Storyboard.
Scene IDs and scene mapping belong to the Scene/Storyboard stage.
Composition coordinates and hierarchy belong to Composition.
Character, prop, palette, and drawing-style decisions belong to Continuity and the productionBible.

The Scriptwriter may suggest caption copy, but downstream scene caption structures and overlay placement follow the canonical Scene and VisualPrompt schemas.

## Canonical identifiers and scene mapping

- `sceneId`: positive integer, stable across all downstream artifacts.
- `sourceBeatIds`: array of stable beat IDs in `B01`, `B02`, … format. Each scene maps to one or more source beats; coverage must be complete, ordered, and non-duplicated unless an explicit reuse is documented.
- Beat IDs use `Bnn`; character IDs use `Cnn`; prop IDs use `Pnn`. Do not substitute `S08`, stringified scene numbers, or alternate prefixes.
- `sceneId` is the canonical join key across `scenes`, `compositionPlan`, `visualPrompts`, and rendered assets.

## Canonical scene fields

`Script.beats[]`: `beatId` (`B01`, `B02`, ...), 1-based integer `cardNumber`, `stage`, `connector`, `narration`, `estimatedDurationSeconds`, `suggestedCaption`, `isAhaCard`, and `claimIds:string[]`. Each `claimIds` entry resolves to a Director `claimLedger` ID; use an empty array only when the beat has no material factual claim. Each material claim in `claimLedger` must map through `sourceId`/`sourceIds` to a real Research `sourceList[].id`.

`Scene`: `sceneId:number`, `sourceBeatIds:string[]`, `narration:string` (verbatim beat narration), `estimatedDurationSeconds:number`, `centralIdea:string`, `visualPurpose:string`, `visualMetaphor:string|null`, `analogyRelationShown:string|null`, `compositionType`, `primarySubject`, `supportingElements:string[]`, `isAhaCard:boolean`, `echoesScene:number|null`, `characters[]`, `headerText`, `caption:{line1,line2?,redEmphasis?}`, `programmaticOverlays:{diagramLabels:string[]}`, `transitionToNext`.

Allowed `compositionType`: `character-and-environment`, `top-bottom-comparison`, `foreground-background-contrast`, `line-chart`, `process-flow`, `cutaway-magnifier`. Do not use informal synonyms.

`CompositionPlan`: `sceneId:number`, `compositionType` (same enum), `primarySubject:CompositionElement`, `elements:CompositionElement[]`, `visualHierarchy:string[]`, `visualFlow:string`, `negativeSpace:string`, `safeZones:{headerSafeZone,artworkZone,captionSafeZone}`. Each `CompositionElement` has `element`, `position`, `coordinates` (normalized 0–100 points), `relativeSize` (`large|medium|small`), `depth` (`foreground|midground|background`), `visualPriority:number`, optional `relationship`.

`VisualPrompt`: `sceneId:number`, `assetType:"central-artwork"` (legacy schema value; the prompt describes the complete card), `prompt`, `negativePrompt`, `requiredElements:string[]`, `mustNotInclude:string[]`, `textOverlays:{header:string|null,captionLine1:string|null,captionLine2:string|null,redEmphasis:string|null,diagramLabels:string[]}`.

## Visual identity and layout

- Aspect ratio is always square `1:1` (4:4), rendered at 1080×1080 unless the active image service specifies another square size.
- Shared style authority is `reference-video-style/SKILL.md` and `productionBible`; no stage may create a competing palette or type system.
- Full-card image prompts request the exact video title in the top `0–14%` band, a richly colored square-scene illustration in the middle `15–74%` band, and the exact current-scene key phrase in the bottom `75–100%` band. No text, labels, speech bubbles, or pseudo-text may appear in the middle illustration.
- Safe zones: header `0–14%` vertical; artwork `15–74%`; caption `75–100%`. Keep the illustration clear of title and caption text. If a renderer receives an image that already includes the title and caption, do not draw those overlays again.
- Palette: exact hex values in `productionBible.palette` are canonical. Red is selective and purposeful; no skill may introduce a new red or reinterpret the palette.
- Captions: uppercase, normally 1–2 concise lines, approximately 7–9 words total maximum; `redEmphasis` must be a literal substring of the caption. Caption complements narration; it does not duplicate it.
- Narration: `script.beats[].narration` is source truth. `normalizeScript` computes missing stable beat IDs/card numbers, counts from words, and the sum of beat `estimatedDurationSeconds`. If `script.beats` is absent/non-array, the validator blocks explicitly; never silently substitute a legacy `scenes` or `cards` field.
- Timing: estimated beat/scene durations are seconds. Scene durations must map to beat timing; final timing is provisional until actual TTS duration is known. Never silently treat estimates as measured render durations.

### Scriptwriter timing boundary

The Scriptwriter proposes estimated beat durations according to the Director's target duration. For this production format, each beat/scene is 3–4 seconds and the combined estimated runtime is 50–52 seconds, with a hard minimum of 50 seconds. Validate the total before downstream production. Do not assign 3.5 seconds to every beat by default; for 15 beats, use durations totaling 50–52 seconds (for example, 3.4 seconds each totals 51 seconds).

The Scriptwriter must report impossible timing rather than sacrifice explanatory accuracy.

`normalizeScript` computes word counts and total estimated duration. Actual audio duration is established after TTS.

## Adapters and ambiguity

The storyboard may be stored as raw JSON string in `state.storyboard` and parsed into `state.scenes`; this is a storage adapter, not a second schema. The visual director returns `{imagePrompts:[...]}` (the node also accepts a legacy array adapter); canonical state is `visualPrompts[]`. The visual-node overlay lock copies overlay strings from `scenes` onto matching prompts. Do not rely on a legacy field such as `caption` where the canonical structure is `caption.line1/line2`.
The composition node accepts an array or `{compositionPlan:[...]}` as a transport adapter, but downstream canonical shape is `CompositionPlan[]`.
If required information is absent, emit an explicit upstream issue; never infer missing characters, props, coordinates, source citations, or factual relationships.
