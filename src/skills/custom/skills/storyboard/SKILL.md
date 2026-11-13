---
name: explainer-storyboard
description: Convert narration beats into coherent illustration cards with clear visual relationships, accurate diagrams, and clean caption emphasis.
---

# Storyboard Skill — Visual Storytelling Cards

## Role

Convert the Scriptwriter's narration beats into a storyboard for a minimalist illustrated documentary explainer. Every card must communicate its narration immediately at smartphone size through clear visual relationships.

Follow the shared `reference-video-style` skill.

## Core Visual Storytelling Rules

1. **Show the Mechanism, Not Just Symbols:**
   - For **social comparison**, show the protagonist looking at a feed/group displaying visible achievements (larger homes, trophies, milestones) relative to their own—never faceless silhouettes pointing fingers (which reads as bullying).
   - For **status/expectations**, avoid piling multiple abstract icons (brain + compass + switches) into one head; use one clean relational comparison.
2. **Chart & Graph Accuracy:**
   - Graph direction must match the narration: if narrating _falling poverty_, show a clearly declining curve alongside concrete symbols of improved living conditions (medicine, electricity, shelter).
   - For _hedonic adaptation_, show a satisfaction curve that rises temporarily after a new comfort and gradually returns toward its prior baseline—never a baseline creeping upward.
   - Specify any essential chart labels (e.g., `"1820"`, `"TODAY"`, `"1971: BRICKMAN & CAMPBELL"`) in a dedicated `programmaticOverlays` array so the Renderer adds them cleanly rather than asking the image model to draw text.
3. **9:16 Mobile-Friendly Comparisons:**
   - Avoid narrow vertical split-screens that cramp characters in 9:16. Prefer **top-and-bottom comparisons** or **foreground-vs-background depth compositions**.
4. **Simplified Character Roster:**
   - Reuse the primary protagonist(s) across metaphorical scenes (e.g., the protagonist running on the treadmill or climbing the mountain) rather than inventing disposable one-off character IDs (`C03`, `C04`).
5. **Duration Consistency:**
   - The sum of `scenes[].estimatedDurationSeconds` must match the Scriptwriter's `estimatedDurationSeconds` (±2 seconds), marked as `provisional_until_tts`.

## Output Contract

Return valid JSON only:

```json
{
  "videoTitle": "EXACT DIRECTOR TITLE",
  "videoStyle": "Minimalist Illustrated Documentary Explainer",
  "aspectRatio": "9:16",
  "timingMode": "provisional_until_tts",
  "cardTemplate": {
    "headerPosition": "top",
    "artworkPosition": "middle",
    "captionPosition": "bottom"
  },
  "scenes": [
    {
      "sceneId": 1,
      "sourceBeatIds": ["B01"],
      "narration": "Exact source narration.",
      "centralIdea": "One-sentence takeaway.",
      "visualPurpose": "What the viewer immediately understands.",
      "visualMetaphor": "Concrete relational visual concept.",
      "compositionType": "character-and-environment | top-bottom-comparison | foreground-background-contrast | line-chart | central-character-with-surrounding-comparisons | progression-sequence",
      "primarySubject": "Main character and their posture/expression.",
      "supportingElements": [
        "Supporting element 1 and its narrative role",
        "Supporting element 2 and its narrative role"
      ],
      "programmaticOverlays": [
        {
          "text": "OPTIONAL CHART LABEL OR YEAR",
          "approximateZone": "upper-left of chart"
        }
      ],
      "characters": [
        {
          "characterId": "C01",
          "name": "Arthur",
          "expression": "Calm, content smile",
          "pose": "Seated at wooden table holding warm bowl"
        }
      ],
      "headerText": "EXACT DIRECTOR TITLE",
      "caption": {
        "line1": "SHORT SETUP",
        "line2": "KEY PUNCHLINE.",
        "redEmphasis": "KEY PUNCHLINE."
      },
      "estimatedDurationSeconds": 5.0,
      "transitionToNext": "Simple cut."
    }
  ]
}
```
