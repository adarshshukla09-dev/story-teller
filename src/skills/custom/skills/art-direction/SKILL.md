YAML

name: art-direction
description: Prepare a deterministic render specification for approved explainer artwork and card layouts. Use when visualPrompts, SVG assets, scenes, and a productionBible must be rendered into a consistent square 1:1 comic card system without creating artwork, prompts, or new visual decisions.
license: Complete terms in LICENSE.txt

Art Direction Skill: Hand-Drawn Explainer Card Rendering
Mission
Prepare a deterministic render specification for approved illustrations and the card system. This is a rendering task—not a second visual-concept, image-prompt, or artwork-creation task. Preserve the approved story, scene content, artwork, and design decisions exactly.
The target look is a warm, hand-drawn illustrated explainer card, in the spirit of the supplied reference: simple stick-figure storytelling, expressive but minimal character features, organic ink-like outlines, a softly illustrated environment, and a restrained, approachable webcomic feel. Treat these as qualitative style cues only. The Production Bible remains the authority for the exact palette, drawing style, type, and approved production assets. If it does not define a required choice, report the gap rather than inventing a value.
Inputs and source authority
Use the supplied visualPrompts, svgAssets, productionBible, scenes, and canonical layout rules.

    Treat productionBible.palette and the approved drawing style as authoritative.
    Use the supplied visual prompts and SVG assets as approved content; do not rewrite, replace, expand, or reinterpret them.
    Use scene and card contracts for title, caption, overlay, and transition behavior.
    Treat a reference image as a qualitative appearance reference, not a source for exact color codes, fonts, new props, characters, settings, or story content.

Never infer that an SVG has been inspected, validated, or rasterized unless that operation actually occurred. Do not claim that an artwork asset visually matches a reference merely because a render plan was created.
Output contract
Return valid JSON only, with exactly the renderPlan root object and its required fields. Do not add fields.
{
"renderPlan": {
"aspectRatio": "1:1",
"artworkViewBox": "0 0 1080 637",
"headerZone": "0-14%",
"artworkZone": "15-74%",
"captionZone": "75-100%",
"background": "",
"artworkFit": "contain",
"transitions": "hard cut unless the scene contract specifies otherwise",
"notes": []
}
}
Populate background with the exact approved background value from productionBible.palette. If it is absent, leave it empty only if the consuming contract permits that representation, and explain the missing value in notes; otherwise use the contract's explicit missing-value convention. Never guess a replacement. Keep notes an array of concise approved rendering notes or unresolved input-dependent decisions.
Deterministic rendering rules

    Preserve the fixed square 1:1 card layout.
    Use artworkViewBox: "0 0 1080 637" for the central illustration area of a 1080×1080 card (the 15–74% band).
    Keep the header, artwork, and caption zones exactly as specified in the output contract.
    Use artworkFit: "contain" so approved artwork keeps its proportions and is not cropped or stretched.
    Use hard cuts by default; use another transition only when explicitly specified by the scene contract.
    Render only approved SVG assets, overlays, and text. Do not generate, redraw, or supplement artwork.
    Preserve the exact header, caption, diagram-label, narration, scene order, and timing content supplied by upstream stages.
    Use only exact palette values, type choices, line treatments, and style decisions already approved in the Production Bible.
    Do not infer that an SVG has been inspected or rasterized.

Reference look: what to preserve
When the Production Bible confirms the reference aesthetic, keep the render treatment consistent with its warm illustrated-webcomic qualities:

    Warm paper-like background, using only the exact approved palette value.
    Organic, hand-drawn 2D linework with the approved outline color and line treatment.
    Simple stick-figure characters with minimal expressive features, only when present in the approved scene assets.
    Soft, restrained environment colors and flat illustrated fills, only as defined by the approved palette and assets.
    Clear separation between the illustration and the title/caption bands.
    Friendly editorial storytelling tone without visual clutter.

Do not copy the reference image's particular story contents—such as its house, path, school sign, candle, landscape, character, or text—unless those exact elements are independently present in the approved storyboard and assets. The reference informs style, not scene content.
Do not introduce paper grain, texture overlays, shadows, outlines, colors, typography, or effects unless they already exist in approved assets or the Production Bible. If the Production Bible specifies a different style from the reference, follow the Production Bible and report any requested style mismatch in notes when relevant.
Typography and safe zones
Use only the approved type and overlay choices. Do not create or alter fonts, typography, wording, or visual emphasis.

    Keep the title in the 0–14% header zone.
    Keep artwork within the 15–74% illustration zone.
    Keep captions within the 75–100% caption zone.
    Preserve text exactly as supplied by the upstream scene contract; do not rewrite, uppercase, shorten, split, or emphasize text unless those treatments are already approved.
    Maintain clear separation so artwork does not collide with title or caption overlays.

If a required header, caption, label, font, or placement rule is missing, record the omission in notes; do not improvise.
Asset handling

    Render only the supplied, approved svgAssets and authorized overlay assets.
    Preserve the asset's geometry, viewBox, color values, linework, and internal arrangement unless the canonical render pipeline explicitly authorizes a deterministic transformation.
    Do not crop, stretch, recolor, redraw, simplify, trace, or composite new elements.
    When an asset's aspect ratio differs from the artwork region, use contain; preserve proportions and accept unused space rather than distorting the image.
    Do not claim to have checked file integrity, text safety, visual fidelity, or rasterization unless the corresponding check was actually performed.

Missing or conflicting decisions
If a required rendering decision is absent from the inputs, report it in renderPlan.notes without substituting a guess. Examples include a missing Production Bible background color, unspecified approved font/overlay style, unavailable SVG asset, conflicting scene layout, or transition not defined where the scene contract requires one.
If the Production Bible, scene contract, and visual reference disagree, follow the canonical production authority. Use notes to identify the unresolved conflict. Do not “resolve” it by choosing a new color, font, character, prop, style effect, or scene interpretation.
Final checks
Before returning, verify:

    The response is parseable JSON with only a top-level renderPlan object.
    Every renderPlan field is present with the required value or a contract-compliant unresolved value.
    Aspect ratio, artwork viewBox, and the three zone ranges are unchanged.
    The background is the exact Production Bible palette value or is explicitly noted as missing.
    Artwork uses contain with no crop, stretch, redraw, or invented treatment.
    The specified warm hand-drawn webcomic look is applied only to the extent approved by the Production Bible and supplied assets.
    No new artwork, prompt, character, prop, color, font, typography, caption, title, narration, timing, scene order, or transition has been introduced.
    Any missing decision is recorded in notes, not silently replaced.
    No inspection or rasterization is claimed unless it actually happened.
