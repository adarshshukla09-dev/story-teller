---
name: reference-video-style
description: Shared visual style and visual grammar for the user's minimalist illustrated documentary explainer videos.
---

# Reference Video Style Contract

## Mission

Reproduce the visual language of the supplied reference video, regardless of topic or script. The script may change completely; the visual system must remain recognizably consistent.

This is a **minimalist illustrated explainer presented as a sequence of designed visual cards**. It is not live-action, not a cinematic storyboard, not a slideshow of unrelated stock images and not a sequence of isolated icons.

## 1. Canvas and card layout

- Final video format: vertical 9:16, normally 1080 × 1920.
- Each scene is a designed illustration card with a stable layout.
- Keep the card's internal composition consistent from scene to scene:
  - **Top band:** recurring short video title/header, centered or consistently aligned.
  - **Middle area:** the main illustration; this receives the largest share of visual space.
  - **Bottom band:** bold caption, usually one or two lines.
- Preserve clear margins and safe areas. Keep all important text away from the crop edges.
- The reference uses a light/cream card against a dark/black surrounding field in some shots. The Renderer may reproduce that framing: a centered light card with black top/bottom letterbox space. Do not stretch the artwork to fill the entire canvas if doing so changes the reference's visual balance.
- Choose one card template for the whole video and do not casually change its proportions.

## 2. Header

- Repeat the same short video title on every card.
- Header text is uppercase or visually equivalent, bold, hand-drawn/rounded display lettering.
- Keep the wording, position, scale and typography consistent.
- Do not invent a new header for every scene.
- The Director supplies the canonical `videoTitle`; the Renderer repeats it.

## 3. Central illustration

- Minimalist hand-drawn 2D illustration.
- Simple stick-figure or very simplified human characters.
- Round heads, uncomplicated facial features, thin-to-medium black outlines.
- Express emotion through posture, gestures, facial expression and spacing.
- Flat fills, restrained soft shadows only when useful.
- Light cream, warm off-white or pale neutral backgrounds.
- Muted earthy colors, gentle greens, pale blues, warm browns and occasional soft orange/yellow.
- Red is a selective emphasis color, not a general decoration color.
- Drawings should feel friendly, clear, slightly imperfect and hand-illustrated.
- Avoid photorealism, 3D rendering, glossy gradients, cinematic CGI, complex textures, detailed anatomy, dramatic lens effects and realistic film stills.

## 4. Composition grammar: one idea, multiple elements

Each card communicates one central idea. It may use several related elements in a single unified composition.

Allowed composition patterns:

- One character interacting with an object or situation.
- Two or more characters demonstrating a relationship or disagreement.
- Side-by-side comparison with a visible dividing line or clear spatial separation.
- Before/after comparison.
- A simple chart or diagram integrated into the scene.
- A central metaphor surrounded by a few supporting symbols.
- A small group or community contrasted with a large network or system.
- Cause → effect shown through spatial arrangement, arrows or connected objects.

The composition must have a clear visual hierarchy:

1. Main subject or metaphor.
2. Supporting evidence/characters/objects.
3. Small labels or symbols only if needed.

Do not turn every sentence into a separate picture. Combine adjacent narration lines when they explain the same idea. Conversely, split a long narration beat when the visual idea changes.

Do not add unrelated decorative objects merely to fill space. Every element must explain, compare, identify or reinforce something in the narration.

## 5. Bottom caption grammar

This is a signature feature and must be deliberately planned.

- Every card has a concise bottom caption unless the Director explicitly marks a deliberate exception.
- Usually one or two lines, large, bold, highly readable.
- Use black/dark text for the setup or ordinary phrase.
- Highlight the key phrase in red. Often this is the final phrase, contrast, punchline, consequence or emotional turn.
- The red phrase must carry meaning; do not highlight random words.
- The caption should summarize the card's central point, not transcribe the full narration.
- Prefer concise phrasing. Do not cram a whole sentence or paragraph into the bottom band.
- The Storyboard must specify exact caption text and which words are red.
- The Renderer must implement mixed-color text as separate styled spans or text runs. Do not rely on the image model to spell the caption correctly.

Examples of the pattern (illustrative wording, not mandatory copy):

- `EVERYTHING AT HIS` / `FINGERTIPS.` (red emphasis)
- `A VILLAGE VERSUS` / `THE WHOLE WORLD.` (red emphasis)
- `BETTER ON PAPER.` / `NOT IN FEELING.` (red emphasis)
- `WHAT MATTERS WAS` / `NEVER MEASURED.` (red emphasis)

The most important phrase often appears on the second line and is red. This is a visual rhythm, not an absolute rule: choose the emphasis based on meaning.

## 6. Image count and pacing (High-Retention Short-Form Rhythm)

- Viewer attention spans are short: maintain steady visual momentum with **14–16 distinct visual cards** for a 60–70 second explainer (roughly **1 card every 3.5 to 5.0 seconds**).
- Never leave a single static illustration on screen for longer than **5.5 seconds**.
- When a narration line has a setup and a twist, contrast, or consequence, split it across **two consecutive cards** (e.g., Card A shows the setup for 3.5s; Card B cuts to the twist/punchline for 3.5s).
- Every card change must still introduce a meaningful visual shift—a new action, a zoom/reaction, a comparison, a chart step, or a payoff—never random filler.
- Do not enforce one image per sentence.
- Plan one card for each distinct visual idea or meaningful change in the argument.
- A card commonly stays on screen for several seconds while the narration develops.
- As a starting estimate, use roughly 4–7 seconds per card for a short explainer; adjust to narration complexity and actual voiceover timing.
- A 60–70 second video may naturally need around 10–16 cards, but this is only a planning range, not a quota.
- Use fewer cards when one composition can clearly carry a complete thought. Use more when the visual argument genuinely changes.
- Avoid rapid-fire image changes that prevent the viewer from reading the caption and understanding the illustration.
- Do not duplicate a card just to fill time. If the narration continues, hold the card, apply a very subtle push-in, or reveal a small element only if the Renderer supports it.

## 7. Scene-to-scene alignment

The images must feel like a visual argument unfolding in order.

- Each card must connect to the preceding and following card logically.
- Reuse characters, objects, colors or visual motifs when the narrative returns to the same concept.
- A comparison introduced in one card may be expanded in the next.
- A chart or metaphor introduced earlier should not change meaning without explanation.
- Keep the header, card template, caption position, line weight and character design consistent.
- Use simple cuts or restrained transitions. Avoid flashy transitions, random motion and unrelated B-roll.
- A scene change should occur when the narration introduces a new visual idea, contrast, example, consequence or conclusion—not merely at every punctuation mark.

## 8. Text and image separation

Recommended reliable production approach:

- Generate only the central illustration artwork.
- Add title and caption in the Renderer using SVG, HTML canvas or another deterministic text renderer.
- Keep an explicit layout contract: `header`, `artwork`, `caption`.
- Preserve the caption's exact text and red-emphasis spans from the storyboard.
- If labels are essential inside a diagram, add them programmatically too.
- Never let generated image text replace the canonical caption.

## 9. Negative style constraints

Reject:

- Photorealistic people or environments.
- 3D characters, Pixar-like rendering, glossy CGI.
- Anime, manga or highly detailed comic-book rendering.
- Complex cinematic lighting, depth-of-field, lens blur or film-grain styling.
- A different art style in every scene.
- Dense infographic dashboards with tiny text.
- A single isolated object when narration requires a comparison or relationship.
- A collage of disconnected mini-images with no visual hierarchy.
- Captions embedded in random places or placed over the main illustration.
- Changing header text, caption location or character proportions from card to card.

## 10. Acceptance test

A card matches the reference style only if:

- It has the consistent top title/header.
- Its central illustration explains the narration, not merely decorates it.
- It uses a coherent composition with all necessary related elements.
- Its bottom caption is short and readable.
- The key phrase is intentionally emphasized, commonly in red.
- Its drawing style and palette match the other cards.
- It can remain on screen for several seconds without feeling visually empty or overcrowded.
