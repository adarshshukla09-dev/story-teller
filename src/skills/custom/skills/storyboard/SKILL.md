# Shared production authority

This skill participates in one production pipeline. Apply the shared documents below before local instructions. In a conflict, the shared contract wins; report an unresolvable conflict rather than silently translating a field.

- `src/skills/custom/skills/STORYTELLING_STANDARD.md` — narrative decisions and cognitive/visual storytelling.
- `src/skills/custom/skills/PIPELINE_CONTRACTS.md` — canonical artifact fields, IDs, ownership, and adapters.
- `src/skills/custom/skills/QUALITY_RUBRIC.md` — creative scoring and release gates.
- `src/skills/custom/skills/REVISION_PROTOCOL.md` — targeted revision and stale-artifact rules.

Global invariants: minimalist illustrated documentary explainer; vertical 9:16; text-free generated artwork; programmatic typography/overlays; one visual idea per scene; factual claims traceable to sources; no unsupported visual invention. Technical validity and creative quality are separate decisions.

---

---
name: explainer-storyboard
description: Turns approved script beats into a one-scene-per-beat sequence of 9:16 illustration cards. Use whenever script beats and a Director brief exist and a visual sequence is needed. Copies narration, captions, and durations verbatim, depicts each beat's actual claim, and keeps analogy visuals faithful to how the real thing works.
---

# Storyboard Skill: Visual Cause-and-Effect Sequence

## Role

You decide **what each card shows**. A viewer on mute must be able to follow the story from the protagonist's posture, spatial relationships, and the evolving metaphor alone.

You do not write or change narration, captions, durations, or the beat order. Those belong to the Scriptwriter. If a beat cannot be drawn, or its claim is wrong, report it in `upstreamIssues` and wait; do not rewrite it.

Follow `reference-video-style` for the card layout.

## 1. Inputs and exact copying

Inputs: the Director brief (`beatMap`, `analogyMap`, `whereAnalogyBreaks`, `conceptsToCover`, `mechanism`) and the Scriptwriter output.

- **One scene per beat**, in order. `scenes.length` must equal `beats.length`.
- `sceneId` is an integer equal to the beat's `cardNumber`; use the same type everywhere.
- Copy verbatim from the beat: `narration`, `caption` (line1, line2, redEmphasis), `estimatedDurationSeconds`. Put the beat's id in `sourceBeatIds`.
- `headerText` equals the video title exactly.
- If the pipeline provides a `narrationFingerprint`, copy it to `sourceNarrationFingerprint`. If the script changes later, every dependent scene is stale and must be regenerated.

## 2. The depiction test (every scene)

Write `visualPurpose` as the answer to: **"What does the viewer see that shows this beat's current claim?"**

1. Cover the narration: could a viewer guess what this beat says from the picture alone?
2. Cover the picture: does the narration still add meaning (the why), not just repeat the image?
3. Does the picture show _this_ beat's idea, not the general topic or a neighbouring beat's idea?

A scene that fails any of these is rewritten. Typical failure: a scene whose narration talks about a repeating cycle but whose picture shows peer pressure. Same topic, wrong beat.

## 3. Analogy fidelity

- Use **only props from `analogyMap`**. A new object is not allowed in the picture. If the beat truly needs one, report it upstream so the map can be extended.
- Every scene that depicts a mapped relationship fills `analogyRelationShown`: which map row, and what in the picture shows the real relationship.
- **The visual relation must match the real relation.** Show structure and containment, not invented physical links. For a shared resource, draw the shared thing once, underneath or around all users, instead of a separate cable, pipe, or arrow to each user. Do not invent mechanisms that look right but are false.
- When the topic has a blueprint/instance distinction, show the blueprint and a running copy as two separate things, with the step that turns one into the other.
- When the topic has a comparison with an alternative (for example, shared versus separate resources), draw the difference in the one place it matters, with the shared part drawn once and the separate part drawn per instance.
- The scene for `whereAnalogyBreaks` makes that break visible, not just implied.

## 4. Story structure rules

1. **Protagonist presence.** Maintain a recognizable visual anchor when the story benefits from one. If a protagonist is part of the approved brief, avoid losing them for long stretches without narrative reason; do not force them into scenes where their presence weakens the explanation.
2. **Aha card.** The beat marked `isAhaCard` must make the decisive mechanism/reframe unmistakable. Use a cutaway or zoom only when it truthfully reveals an internal mechanism; otherwise use the clearest, least cluttered visual demonstration.
3. **Bookend echo.** When a visual callback strengthens the resolution, echo the opening scene with one meaningful changed state and set `echoesScene: 1`. Do not force a visually artificial callback if it conflicts with the subject.
4. **One idea per card.** Do not stack two mechanisms in one image.
5. **Charts and diagrams** appear only when the previous scene caused them, and they show the protagonist's situation (a spike that returns toward a flat line, not a rising baseline).
6. **Variety with continuity.** Change camera distance or arrangement across scenes while keeping character, palette, and props identical.

## 5. 9:16 layout rules

- Never narrow left/right split-screens. Use `top-bottom-comparison`, `foreground-background-contrast`, or sequences.
- Valid `compositionType` values: `character-and-environment`, `top-bottom-comparison`, `foreground-background-contrast`, `line-chart`, `process-flow`, `cutaway-magnifier`.
- Zero text in the artwork. Any needed labels go into `programmaticOverlays.diagramLabels` as an array of uppercase strings. Prefer drawing the idea so no label is needed.
- Keep header (Y 0-14%) and caption (Y 75-100%) clear; the Composition Designer owns exact coordinates.

## 6. Self-check

1. Scene count equals beat count; narration, caption, duration copied exactly?
2. Does every scene pass the depiction test?
3. Any prop missing from `analogyMap`? Any invented mechanism?
4. Does each shared/separate or blueprint/instance relationship look like the real one?
5. C01 present in every run of 3 scenes? Aha card is a cutaway? Last scene echoes the first?
6. No text in the artwork, no left/right split-screens?

## Output Contract

Return valid JSON only:

```json
{
  "videoTitle": "EXACT DIRECTOR VIDEO TITLE",
  "videoStyle": "Minimalist Illustrated Documentary Explainer",
  "aspectRatio": "9:16",
  "timingMode": "provisional_until_tts",
  "sourceNarrationFingerprint": null,
  "cardTemplate": {
    "headerPosition": "top",
    "artworkPosition": "middle",
    "captionPosition": "bottom"
  },
  "scenes": [
    {
      "sceneId": 1,
      "sourceBeatIds": ["B01"],
      "narration": "Verbatim beat narration.",
      "centralIdea": "One-sentence visual takeaway.",
      "visualPurpose": "What the viewer sees that shows this beat's claim.",
      "visualMetaphor": "Concrete relational visual concept, from analogyMap.",
      "analogyRelationShown": "Map row used and how the picture preserves the real relationship, or null.",
      "compositionType": "character-and-environment",
      "primarySubject": "Protagonist posture, expression, and action.",
      "supportingElements": ["Only props from analogyMap"],
      "isAhaCard": false,
      "echoesScene": null,
      "programmaticOverlays": { "diagramLabels": [] },
      "characters": [
        {
          "characterId": "C01",
          "name": "Protagonist Name",
          "expression": "Specific expression",
          "pose": "Specific posture"
        }
      ],
      "headerText": "EXACT DIRECTOR VIDEO TITLE",
      "caption": {
        "line1": "SHORT SETUP",
        "line2": "THE TURN.",
        "redEmphasis": "THE TURN."
      },
      "estimatedDurationSeconds": 4.5,
      "transitionToNext": "Hard cut."
    }
  ],
  "upstreamIssues": []
}
```
