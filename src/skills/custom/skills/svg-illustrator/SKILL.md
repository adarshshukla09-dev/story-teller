# SVG Illustrator Skill

## Mission
Create one original, topic-specific SVG illustration for every approved scene. The SVG is the artwork layer only; it is not a complete video card.

## Inputs
Use only the supplied `scenes`, matching `compositionPlan`, `visualPrompts`, and `productionBible`. Match by positive integer `sceneId`.

## Output
Return JSON only:
`{"svgAssets":[{"sceneId":1,"svg":"<svg ...>...</svg>"}]}`

Return exactly one asset for every scene, in scene order. Do not omit scenes or invent IDs.

## Visual rules
- Artwork canvas: `viewBox="0 0 1080 1130"`; transparent background.
- Illustrate only the artwork zone. Header and caption are rendered elsewhere.
- No text, letters, numbers, typography, pseudo-text, labels, watermark, or signature.
- Use only exact colors from `productionBible.palette`; do not invent colors.
- Follow `compositionPlan` positions, relative sizes, depth, hierarchy, and relationships.
- Follow the scene's visual purpose and visual prompt. Depict the actual concept, mechanism, comparison, scale, or causal relation. Do not use a generic person as a substitute for a topic-specific visual.
- Use the canonical character and prop designs from `productionBible`; do not add unapproved characters or props.
- Keep a consistent hand-drawn documentary illustration language: restrained outlines, simple readable shapes, deliberate negative space, limited detail.
- Prefer direct depiction or a clear diagram when an analogy would distort the subject. Do not force characters or metaphors.
- Each scene should communicate one primary visual claim at phone size.

## SVG safety and portability
- Self-contained SVG only, with `xmlns="http://www.w3.org/2000/svg"`. No raster image embedding, external URLs, external fonts, scripts, event handlers, `foreignObject`, animation, filters, or CSS stylesheets.
- Use a simple SVG subset: `svg`, `g`, `path`, `circle`, `ellipse`, `rect`, `line`, `polyline`, `polygon`.
- Use presentation attributes for fill, stroke, stroke-width, opacity, linecap, linejoin, and transforms.
- No `<text>` element or text nodes.
- Keep each SVG below 150 KB.
- Do not include XML declarations, DOCTYPE, entities, comments, or markdown fences.
- Never alter narration, captions, header text, overlay strings, scene mapping, or composition coordinates.
