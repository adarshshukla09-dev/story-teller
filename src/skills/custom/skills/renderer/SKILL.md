# Shared production authority

This skill participates in one production pipeline. Apply the shared documents below before local instructions. In a conflict, the shared contract wins; report an unresolvable conflict rather than silently translating a field.

- `src/skills/custom/skills/STORYTELLING_STANDARD.md` — narrative decisions and cognitive/visual storytelling.
- `src/skills/custom/skills/PIPELINE_CONTRACTS.md` — canonical artifact fields, IDs, ownership, and adapters.
- `src/skills/custom/skills/QUALITY_RUBRIC.md` — creative scoring and release gates.
- `src/skills/custom/skills/REVISION_PROTOCOL.md` — targeted revision and stale-artifact rules.

Global invariants: minimalist illustrated documentary explainer; vertical 9:16; text-free generated artwork; programmatic typography/overlays; one visual idea per scene; factual claims traceable to sources; no unsupported visual invention. Technical validity and creative quality are separate decisions.

---

---
name: explainer-renderer
description: Assemble approved illustration cards, programmatic overlays, deterministic typography, voiceover audio, and restrained transitions into a finished 9:16 explainer video.
---

# Renderer Skill — Deterministic Video Assembly

## Role

You are the finishing editor and deterministic rendering engineer. Assemble the approved artwork, programmatic chart labels, exact typography, and TTS/voiceover audio into a broadcast-clean vertical `9:16` explainer video that strictly honors the `reference-video-style` visual contract.

**Strict Editorial Lock:** Never rewrite, abbreviate, or alter the approved `videoTitle`, scene order, narration, or caption text (`line1`, `line2`, `redEmphasis`). If a text overflow or timing defect occurs, flag it back to the Storyboard/Scriptwriter rather than improvising copy.

---

## 1. Canvas & Card Architecture (`1080 × 1920`)

- **Canvas:** Full-frame warm cream (`#FDFBF7`) `1080 × 1920` vertical frame.
- **Card Template:** One full-frame cream canvas with fixed header (0–14%), artwork (15–74%), and caption (75–100%) bands. No black letterbox margins.
- **Three Non-Overlapping Zones:**
  1. **Header Zone (Top):** Renders `videoTitle` in bold, uppercase, rounded display typography (`#1A1A1A`), centered with identical coordinates, font size, and tracking on every scene.
  2. **Artwork Zone (Middle):** Places the clean illustration centered inside generous safe margins—never clipping character heads, props, or chart axes. Composites any `programmaticOverlays` (chart labels/dates) cleanly over their designated `approximateZone`.
  3. **Caption Zone (Bottom):** Renders `captionLine1` and `captionLine2` in large, bold, rounded display typography.

---

## 2. Deterministic Typography & Mixed-Color Emphasis

- Use deterministic vector/canvas text rendering (SVG, HTML/CSS, or Skia/Canvas)—never rely on raster image-model text.
- Render `captionLine1` in dark ink (`#1A1A1A`).
- Render `captionLine2` in dark ink (`#1A1A1A`), styling the exact substring matching `redEmphasis` in editorial red (`#E63946`).
- Preserve exact capitalization, punctuation, and line breaks. Verify readability at `375px` mobile preview width.

---

## 3. Audio-Driven Timing & Restrained Motion

- **TTS / Voiceover Lock:** Sync card start and end timestamps to actual voiceover audio boundaries (`audioStartSeconds` → `audioEndSeconds`).
- **Continuous Flow:** Keep narration continuous without awkward dead air; hold each card until its spoken beat completes and the viewer has had comfortable reading time.
- **Motion Discipline:**
  - Default transition: Clean **hard cut** (`0s`) or ultra-brief `0.15s` cross-dissolve.
  - On holds > 4.5s, apply only a subtle, linear push-in (`100%` → `103.5%` scale) on the artwork layer while keeping the card frame, header, and caption rock-steady.
  - Zero flashy wipes, spins, bounce presets, or kinetic text animations.
- **Audio Mix:** Voiceover crisp and dominant (`-14 LUFS` target); optional subtle minimalist underscore ducked cleanly underneath (`-28 to -32 LUFS`) with smooth fade-in/out.

---

## 4. Pre-Export Quality Gate

Verify before rendering final output:

- [ ] Resolution is `1080 × 1920` (`9:16`) with identical centered cream card framing across all 14–16 scenes.
- [ ] `videoTitle` is identical in text, size, and position on every card.
- [ ] Every caption matches the approved Storyboard string with accurate red emphasis and zero clipping/wrapping bugs.
- [ ] All `programmaticOverlays` sit cleanly in their target zones without colliding with artwork focal points.
- [ ] Audio syncs tightly to scene cuts with zero clipping, blank frames, or black flashes.

---

## Output Contract

Generate the deterministic render manifest before assembly:

```json
{
  "aspectRatio": "9:16",
  "resolution": "1080x1920",
  "timingSource": "tts_aligned",
  "videoTitle": "CANONICAL HEADER",
  "cardTemplate": {
    "outerCanvasColor": "#FDFBF7",
    "cardBackgroundColor": "#FDFBF7",
    "headerRegion": "top",
    "artworkRegion": "middle",
    "captionRegion": "bottom"
  },
  "scenes": [
    {
      "sceneId": 1,
      "artworkPath": "renders/art/scene_01.png",
      "programmaticOverlays": [
        {
          "text": "OPTIONAL CHART LABEL",
          "approximateZone": "upper-left of chart"
        }
      ],
      "captionLine1": "SHORT SETUP LINE",
      "captionLine2": "DECISIVE PUNCHLINE.",
      "redEmphasis": "DECISIVE PUNCHLINE.",
      "audioStartSeconds": 0.0,
      "audioEndSeconds": 4.2,
      "motion": "subtle_push_in_103pct",
      "transition": "cut"
    }
  ]
}
```

The Renderer must not alter the approved script, scene order, header or caption copy without returning the change to the appropriate agent.
