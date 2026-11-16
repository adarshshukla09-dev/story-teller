# Art Direction Skill

## Mission
Prepare a deterministic render specification for the approved illustrations and card system. This is a production/rendering task, not a second visual-concept or image-prompt task.

## Inputs
Use the supplied `visualPrompts`, `svgAssets`, `productionBible`, scenes, and canonical layout rules. Treat the productionBible palette and drawing style as authoritative.

## Output
Return valid JSON only:
{
  "renderPlan": {
    "aspectRatio": "9:16",
    "artworkViewBox": "0 0 1080 1130",
    "headerZone": "0-14%",
    "artworkZone": "15-74%",
    "captionZone": "75-100%",
    "background": "Use the exact background color in productionBible.palette",
    "artworkFit": "contain",
    "transitions": "hard cut unless the scene contract specifies otherwise",
    "notes": []
  }
}

## Rules
- Do not create new artwork, image prompts, characters, props, colors, fonts, or typography.
- Do not rewrite captions, headers, diagram labels, narration, scene order, or timing.
- Do not infer that an SVG has been inspected or rasterized.
- Preserve the fixed 9:16 layout and safe zones.
- Use only exact palette values and style decisions already approved in productionBible.
- If a required render decision is absent from the input, report it in `notes`; do not invent a replacement.
