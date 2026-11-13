---
name: explainer-renderer
description: Assemble illustration cards, exact typography, voiceover and restrained transitions into a vertical explainer video.
---

# Renderer Skill — Assemble the Cards into a Video

## Role

Turn approved artwork, narration, captions and timing into a finished vertical video that preserves the reference's card-based presentation.

## Card construction

Build every final card from three regions:
1. **Header region:** repeated video title.
2. **Artwork region:** generated illustration.
3. **Caption region:** exact storyboard caption, usually one or two lines.

Use a deterministic renderer (SVG, HTML/CSS, canvas or equivalent) for header and caption text. Do not depend on image-model text for spelling or line breaks.

## Typography and emphasis

- Use a bold, rounded, friendly display typeface similar in spirit to the reference.
- Header: consistent uppercase or title treatment, centered/aligned identically across cards.
- Caption: large, bold, dark/black text.
- Render the specified emphasis phrase in red.
- Preserve exact capitalization, punctuation and line breaks.
- Ensure text fits without shrinking to unreadable sizes.
- Do not invent or rewrite captions during rendering.

## Composition and framing

- Output vertical 9:16.
- Preserve the shared card template and safe margins.
- Place the artwork in the central region without covering the header or caption.
- If reproducing the reference framing, place the light card in the center of a dark vertical canvas with deliberate black space above and below. Keep this framing identical across all scenes.
- Never crop important character parts, chart details or comparison elements.
- Check the result at actual phone display size.

## Timing and alignment

- Use actual TTS/audio timing when available, not only storyboard estimates.
- Start a card when its assigned narration begins.
- Hold the card until the narration for that card has finished and the caption has been readable.
- Typical holds are several seconds; avoid changing images on every sentence.
- If a card must remain longer, use a subtle slow push-in or a very restrained reveal. Do not animate every object.
- Do not speed through captions.
- Keep narration continuous unless the script explicitly includes pauses.
- Use simple cuts or gentle fades. Avoid flashy wipes, spins, glitch effects and unrelated motion graphics.

## Audio

- Keep narration clear and dominant.
- Background music should be subtle and should not compete with speech.
- Use consistent loudness and smooth audio transitions.
- Do not add sound effects unless they reinforce a specific visual moment.

## Validation before export

Check:
- correct aspect ratio and resolution;
- every scene appears in the correct order;
- title repeats consistently;
- exact caption text and red emphasis are correct;
- no overflow, clipping or overlap;
- image duration matches narration;
- no black flashes or unintended blank frames;
- audio does not clip;
- final export duration matches the assembled timeline.

## Output contract

Produce a render plan before assembly:

```json
{
  "aspectRatio": "9:16",
  "resolution": "1080x1920",
  "videoTitle": "CANONICAL HEADER",
  "cardTemplate": {
    "headerRegion": "top",
    "artworkRegion": "middle",
    "captionRegion": "bottom"
  },
  "scenes": [
    {
      "sceneId": "S01",
      "artworkPath": "path/to/artwork.png",
      "captionLine1": "SHORT SETUP",
      "captionLine2": "IMPORTANT PHRASE.",
      "redEmphasis": "IMPORTANT PHRASE.",
      "audioStartSeconds": 0,
      "audioEndSeconds": 5.2,
      "transition": "cut"
    }
  ]
}
```

The Renderer must not alter the approved script, scene order, header or caption copy without returning the change to the appropriate agent.
