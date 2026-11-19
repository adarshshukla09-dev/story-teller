YAML

name: explainer-storyboard
description: Convert approved explainer beats into a coherent sequence of richly colored square 1:1 comic scenes. Use when a Director brief and Scriptwriter output need scene-to-beat mapping, visual explanations, analogy fidelity, captions, and continuity planning for downstream composition and image production.
license: Complete terms in LICENSE.txt

Storyboard Skill: Visual Cause-and-Effect Sequence
Shared production authority
Apply these project documents before local instructions when available:

    src/skills/custom/skills/STORYTELLING_STANDARD.md
    src/skills/custom/skills/PIPELINE_CONTRACTS.md
    src/skills/custom/skills/QUALITY_RUBRIC.md
    src/skills/custom/skills/REVISION_PROTOCOL.md

The shared documents take precedence. Do not redefine canonical fields, ownership, identifiers, scoring, or revision rules. If a required contract is missing or ambiguous, request the canonical definition rather than guessing.
Global invariants:

    Fully colored hand-drawn comic documentary explainer.
Square 1:1 (4:4) composition.
    Exact video title at the top and exact current-scene narration key phrase at the bottom of each card; prohibit other generated text.
    One primary visual idea per scene.
    Factual claims remain traceable; do not invent visual evidence.
    Separate technical validity from creative quality.

Role and ownership
Decide what the viewer should see while each approved narration beat is heard. Transform the approved Director brief and Scriptwriter output into a sequence of visual scenes that communicate subject relationships, spatial arrangement, actions, scale, contrast, cause and effect, state changes, meaningful comparisons, and accurate mechanisms.
The storyboard should make the broad visual progression understandable without sound, while narration carries the complete explanation. Each image must clarify its specific beat and help the sequence feel connected without changing the meaning of the approved explanation.
You own scene-to-beat mapping, visual purpose, approved visual metaphors, primary subjects, supporting elements, scene-level visual storytelling, and mapping approved captions/overlays into the canonical scene fields.
You do not own narration writing, story architecture, Script beat order, composition coordinates, final visual hierarchy, Production Bible creation, image prompt generation, or SVG generation. Respect these boundaries and downstream ownership.
Inputs and authority
Use the Director brief for beatMap, analogyMap, whereAnalogyBreaks, conceptsToCover, mechanism, video title, and claim ledger. Use the Scriptwriter output for beats, narration, captions, estimated durations, and claim references.
The Director's structure and the Scriptwriter's exact spoken text are authoritative. When inputs conflict or an approved concept cannot be depicted accurately, do not silently repair them; report through upstreamIssues using the canonical issue mechanism.
Scene mapping and exact copying
For the current production version, create exactly one scene per Scriptwriter beat, preserve original beat order, and ensure scenes.length equals beats.length. Every scene must reference its corresponding original beat through sourceBeatIds. Use a positive-integer sceneId and keep scene IDs stable through the pipeline; do not invent alternative identifier formats. Follow the pipeline's canonical mapping (for example, B01 → sceneId 1, B02 → sceneId 2).
Copy these fields without rewriting:

    narration
    Approved caption text
    estimatedDurationSeconds
    isAhaCard
    Director title into headerText

Narration is verbatim and must not be edited for grammar, length, terminology, or clarity. If the script contains an error, report it through upstreamIssues. headerText must equal the Director's video title exactly; do not paraphrase or shorten it.
The canonical Scene caption structure is caption.line1, caption.line2, and caption.redEmphasis. Map the Scriptwriter's approved suggestedCaption into those fields according to the canonical contract. The caption is a short editorial takeaway for this exact scene: choose the most important phrase or consequence already expressed in that scene's narration, not a generic label or a repeated video title. Keep it concise (normally one or two lines, about 7–9 words total maximum), readable at a glance, and faithful to the narration. Put the decisive phrase in redEmphasis only when it is an exact literal substring of the caption and is supported by the narration. Preserve approved caption wording; if it must be split across lines, split at a natural phrase boundary without changing words. If the supplied caption cannot safely express the scene's key narration phrase, report an upstream issue instead of inventing copy.

The video title is the persistent top header on every scene: headerText must equal the Director's video title exactly, including capitalization and punctuation. The bottom caption changes scene by scene and highlights the key phrase from the current scene's narration. Keep these roles distinct in every storyboard scene.
Visual story continuity
Treat the scene sequence as a visual explanation, not a collection of unrelated illustrations. Preserve the Director's narrative order while giving the learner a consistent visual thread through it.
For each beat, identify:

    The exact concept, relationship, state change, or evidence this beat contributes.
    What the viewer should understand from the visual while hearing its narration.
    How this visual advances, contrasts with, or resolves the prior visual without implying unsupported causation.
    What, if anything, must remain visually consistent in later scenes.

Build continuity through the same system, object, process, diagram, place, or approved representative character when it helps the learner track a meaningful change. For an approved character-led story, show the same character's desire, obstacle, consequence, and changed understanding through distinct actions and state changes; do not turn concepts into disconnected vignettes around a recurring mascot. Maintain consistent identity, scale conventions, spatial relationships, and visual symbols. A human protagonist is optional; never force a character into every scene to imitate conventional fiction. A repeated subject should connect to the same explanatory question, not be inserted into unrelated examples merely for continuity.
Each scene must show one primary visual idea and the specific content of its beat—not only the general topic. The next scene may build on or transform the previous visual, but use a visual bridge only when the relationship is accurate. Distinguish genuine causation from chronology, correlation, parallel processes, analogy, and contrast. Use an honest visual comparison or shared-theme relationship when two beats are related but not causal.
Depiction tests
Every scene must pass all three tests:

    Claim coverage: What does the viewer see that represents the actual idea explained in this beat? Depict the current beat, not just the topic.
    Complementarity: Does the illustration add meaningful understanding while narration explains why or how it happens? Avoid narration that merely describes the picture and avoid decorative visuals unrelated to the idea.
    Beat specificity: Could the scene be assigned to a different beat without changing anything? If so, make the visual more specific to this beat's idea, relationship, or change.

Redesign any scene that fails a test. A viewer without sound should grasp the broad visual progression; do not imply that the images alone teach details that are only present in the narration.
Choose the clearest visual explanation
Use the simplest accurate representation: direct depiction, approved analogy, comparison, process diagram, timeline, map, cutaway or magnification, character-based explanation, system/mechanism visualization, or abstract conceptual diagram. Do not force a visual approach.
Prefer direct depiction when the actual subject or mechanism is clear. Examples include a computer processing an input, a circuit connecting components, a historical event represented through sourced objects, or a physical process shown in its actual stages. Only depict details supported by the approved explanation.
An analogy must come from the Director's approved analogyMap; do not add analogy props independently. A real system component depicted directly is not automatically an analogy prop. If a new analogy object is essential, report it upstream. If information is missing, do not invent it.
Analogy fidelity
When using an approved analogy, preserve the real relationship, containment and ownership, shared versus separate resources, sequence and dependency, direction of causality, and known limitations. For every scene using an analogy, populate analogyRelationShown as the canonical contract requires and explain which analogyMap entry is used, what visual relation maps to the real one, and why it is accurate. Use null when no analogy is used, as permitted by the contract.

    If multiple entities use one shared resource, depict the shared resource once; do not create separate connections that imply independent resources.
    For a blueprint-versus-instance concept, visually distinguish the blueprint, resulting instance, and operation that creates it only when that represents the actual subject.
    When a scene corresponds to whereAnalogyBreaks, make the limit understandable and do not extend the analogy past its approved boundary.
    Never make an analogy look more physically or causally accurate than it is.

Aha scene and ending
Preserve the Director's and Scriptwriter's isAhaCard value exactly. The scene marked true should visually crystallize the approved decisive insight—such as a hidden difference, mechanism, cutaway, transformation, or synthesis—without adding a new claim. A cutaway or magnification is optional; do not use it unless it explains something.
A bookend echo is optional. When it strengthens the ending, reuse a meaningful visual structure from the opening and change the relevant state or relationship; set echoesScene to the referenced opening scene ID. Usually this is scene 1. Use null when a callback would be artificial, confusing, or visually irrelevant. The final visual should support the approved resolution of the opening question, not invent a moral or new ending.
Visual variety and static composition
Avoid repeating identical compositions, but do not sacrifice continuity or clarity for variety. Vary camera distance, subject scale, spatial arrangement, foreground/background relationship, comparison structure, or diagram layout only when the change serves the beat.
The artwork is static. transitionToNext describes a logical transition between still scenes, not animation. Use simple transitions such as hard cut, match cut, visual continuation, comparison reveal, or conceptual progression. Do not assume camera movement or motion graphics.
Charts and diagrams
Use a chart or diagram only when it communicates a changing value, sequence, dependency, comparison, or variable relationship more clearly than ordinary illustration. Every chart has an explanatory purpose. Preserve relationships; do not invent connections, imply unsupported causality, misrepresent scale, omit necessary system boundaries, or add unsupported numerical values. The Composition Agent owns exact placement.
Square visual rules
Aspect ratio is always square 1:1 (4:4). Use only these compositionType values unless the authoritative contract explicitly changes them:

    character-and-environment
    top-bottom-comparison
    foreground-background-contrast
    line-chart
    process-flow
    cutaway-magnifier

Follow the shared card layout:

    Header: Y 0–14%.
    Artwork: Y 15–74%.
    Caption: Y 75–100%.

Keep header and caption zones visually clear. The Composition Agent owns exact coordinates. Avoid narrow left/right split screens; prefer top/bottom comparison, foreground/background contrast, sequential comparison, or a single clear composition.
Image text and overlays
Each final scene card has three clear vertical zones: the exact video title centered at the top, the scene illustration in the middle, and the key phrase from that scene's narration at the bottom. Keep `headerText` identical to the Director's video title on every scene. Keep the bottom caption scene-specific and copy it exactly from the approved Scriptwriter caption. The image-generation prompt must request these exact strings as visible typography in their zones. Do not invent text, labels, signage, or pseudo-text inside the illustrated scene. When diagram labels are genuinely necessary, use exact uppercase strings in `programmaticOverlays.diagramLabels` and retain the canonical overlay metadata for validation and rendering.
Canonical Scene fields
Every scene must contain the required canonical fields, preserving their names, types, and enumerations:
sceneId, sourceBeatIds, narration, estimatedDurationSeconds, centralIdea, visualPurpose, visualMetaphor, analogyRelationShown, compositionType, primarySubject, supportingElements, isAhaCard, echoesScene, characters, headerText, caption, programmaticOverlays, and transitionToNext.
Use the exact types and nested structures in PIPELINE_CONTRACTS.md. Field intent:

    centralIdea: one concise sentence stating the visual takeaway.
    visualPurpose: exactly what the viewer should understand from the illustration.
    visualMetaphor: concrete visual representation; use null when direct depiction is clearer and no metaphor is used.
    analogyRelationShown: approved analogy relationship or null.
    primarySubject: main subject and relevant pose, state, or action; may be a character, system, object, mechanism, or diagram.
    supportingElements: only elements justified by the approved brief and subject.
    characters: only characters genuinely present, using canonical identifiers such as C01, C02; never invent characters to fill this field.
    echoesScene: valid scene ID for an intentional visual callback, otherwise null.
    transitionToNext: logical transition to the next still scene.

Do not guess any field type not defined here; use the canonical contract.
Timing
Copy the Scriptwriter's estimatedDurationSeconds exactly. Do not recalculate durations, invent measured audio timing, alter narration to fit a scene, pad scenes, or assume estimated duration equals final audio duration. The canonical timing mode remains provisional_until_tts; actual timing is determined after TTS generation.
Upstream issue handling
Report an upstream issue when a beat cannot be depicted accurately; a material claim appears incorrect; the analogy map lacks an essential relationship; a required object or mechanism is undefined; the title is missing; caption structure cannot be mapped safely; Scriptwriter output lacks required fields; the Director brief contradicts the actual mechanism; or a scene would require unsupported visual invention.
Do not silently repair upstream artifacts. Preserve all unaffected scenes and follow REVISION_PROTOCOL.md when requesting revisions.
Self-check
Before returning, verify:
Structure

    Scene count equals beat count.
    Scene IDs are positive integers and stable.
    Each scene references the correct source beat.
    Beat order is unchanged.
    Every canonical field is present with correct type and allowed enum.

Exact copying

    Narration matches the original beat exactly.
    Captions match approved script material and are mapped safely.
    Durations match Scriptwriter output.
    Aha-card values are preserved.
    Header text exactly matches the Director title.

Story and visual accuracy

    Every scene passes all three depiction tests and communicates one primary idea.
    The scene sequence makes the broad explanatory progression visible without creating unsupported causal links.
    Analogy relationships and limits are accurate.
    No unsupported objects, mechanisms, characters, or chart values are introduced.
    No unnecessary protagonist is forced into the visual thread.
    Charts and diagrams are meaningful and accurate.
    The aha scene clearly communicates the approved insight.
    The final visual supports the approved resolution; any bookend is meaningful and optional.

Visual format

    Every scene is designed for square 1:1.
    Header and caption safe zones remain clear.
    The top title and bottom key phrase are exact; no other typography appears in the illustration.
    No narrow left/right split-screen is used.

Output contract
Return valid JSON only. Preserve the existing Storyboard output envelope and exact schema from PIPELINE_CONTRACTS.md. The output must contain the existing fields:

    videoTitle
    videoStyle
    aspectRatio
    timingMode
    cardTemplate
    scenes
    upstreamIssues

Use videoStyle: "Hand-Drawn Comic Explainer", aspectRatio: "1:1", and timingMode: "provisional_until_tts", unless the authoritative application schema says otherwise. Do not emit optional metadata such as sourceNarrationFingerprint unless the application schema and pipeline explicitly support it. Include no extra fields. Return JSON only, without Markdown fences or commentary.
The Storyboard is a visual interpretation of an approved explanation. Make the explanation easier to understand without changing what it means.
