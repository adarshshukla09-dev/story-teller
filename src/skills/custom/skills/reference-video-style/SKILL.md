# Shared production authority

This skill participates in one production pipeline. Apply the shared documents below before local instructions. In a conflict, the shared contract wins; report an unresolvable conflict rather than silently translating a field.

- `src/skills/custom/skills/STORYTELLING_STANDARD.md` — narrative decisions and cognitive/visual storytelling.
- `src/skills/custom/skills/PIPELINE_CONTRACTS.md` — canonical artifact fields, IDs, ownership, and adapters.
- `src/skills/custom/skills/QUALITY_RUBRIC.md` — creative scoring and release gates.
- `src/skills/custom/skills/REVISION_PROTOCOL.md` — targeted revision and stale-artifact rules.

Global invariants: richly colored hand-drawn comic explainer; square 1:1 (4:4); exact title at top and current-scene narration key phrase at bottom; one clear visual idea per scene; factual claims traceable to sources; no unsupported visual invention. Technical validity and creative quality are separate decisions.

---

---
name: reference-video-style
description: Shared visual style, pacing contract, and visual grammar for richly colored illustrated comic explainer cards.
---

# Reference Video Style & Pacing Contract

## Mission

Reproduce the signature visual language and high-retention pacing of the reference explainer format, regardless of topic. While the script adapts to any subject, the visual system, card architecture, and editorial rhythm must remain unmistakably consistent from frame 1 to the final cut.

This is a **hand-drawn illustrated documentary presented as a sequence of square colorful comic cards**—never live-action, cinematic 3D, a slideshow of stock imagery, or disconnected floating icons. Build a complete 1:1 card in every image: consistent video title at the top, expressive colored scene in the middle, and a short narration phrase at the bottom.

---

## 1. Canvas & Card Layout

- **Aspect Ratio & Resolution:** Square `1:1` (`1080 × 1080`, also described as 4:4).
- **Framing:** A full-frame illustrated 1:1 canvas. Do not add a black letterbox frame. Keep the same canvas and three-band card template in every scene.
- **Internal Card Zones (Strict Separation):**
  1. **Header Band (Top):** Recurring short video title, centered and identically positioned on every card.
  2. **Artwork Zone (Middle):** Dominant central region holding a detailed but uncluttered, fully colored 2D comic illustration with a clear setting and foreground/background depth.
  3. **Caption Band (Bottom):** Bold, high-contrast 1–2 line summary caption with selective red emphasis.

---

## 2. Header Rules

- Repeat the exact same canonical `videoTitle` (2–4 uppercase words) on every card.
- Typography: Bold, rounded, friendly hand-drawn/display sans-serif in dark charcoal/black (`#1A1A1A`).
- Never alter wording, scale, tracking, or vertical position between scenes.

---

## 3. Central Illustration Style

- **Line & Form:** Hand-drawn 2D comic illustration with confident, rounded black outlines (`#1A1A1A`), expressive shapes, and enough environmental detail to make each scene feel like a place—not a sparse icon or stick figure floating on white.
- **Characters:** Simple stick-figure or ultra-simplified human characters with round heads, minimal dot/line facial features, and expressive posture, gestures, and spatial distance. Reuse the exact same character designs and proportions across all scenes.
- **Color Palette:**
  - Card/background: Warm cream (`#FDFBF7`).
  - Fills: Warm, vivid, coordinated colors—earthy paths and buildings, green landscapes, blue skies, warm sunlight, and character/prop colors defined by the Production Bible. Use flat illustrated fills with restrained shading to give the scene depth.
  - Accent: Crimson/editorial red (`#E63946`) reserved strictly for meaningful focal highlights (e.g., a key trend line, warning indicator, or critical object) and caption emphasis.
- **Approved Card Text:** The image generator must render the exact canonical video title in the top band and the exact scene caption in the bottom band. Do not generate any other words, numbers, labels, logos, or pseudo-text except exact diagram labels approved in `programmaticOverlays`.

---

## 4. Visual Storytelling Grammar (One Idea, Clear Relationships)

Every card communicates **one clear visual idea** that advances the argument. Do not decorate empty space with filler objects; every visual element must explain, compare, or prove a point in the narration.

**Allowed Square-Friendly Composition Patterns:**

- **Character + Environment/Prop:** Protagonist interacting with a specific object, screen, or obstacle.
- **Top-and-Bottom Comparison:** Horizontal divider separating two states (e.g., _Expectation vs. Reality_, _1820 vs. Today_)—**never** cramped left/right vertical split-screens.
- **Foreground vs. Background Contrast:** Protagonist in the foreground contrasted against a crowd, city, or system in the background.
- **Integrated Chart / Diagram:** Clean, single-variable trend curve or mechanism diagram integrated directly into the scene alongside the character.
- **Cause → Effect Flow:** Spatial progression using simple directional arrows or a 2-step sequence.

**Visual Hierarchy:**

1. Primary subject or core visual metaphor (largest, central).
2. Relational context (what they are reacting to, comparing against, or trapped inside).
3. Supporting evidence prop or chart curve.

---

## 5. Bottom Caption Grammar

The bottom caption is the rhythmic punchline of each card—not a subtitle transcript of the voiceover.

- **Structure:** 1 or 2 short lines, uppercase, bold rounded display typography.
- **Color Split:**
  - `line1` (Setup / Context): Dark ink (`#1A1A1A`).
  - `line2` (Turn / Punchline / Consequence): Highlighted in editorial red (`#E63946`) via `redEmphasis` (either the entire second line or its decisive final phrase).
- **Precision:** Keep total caption length under ~7–9 words so it reads effortlessly at phone size in under 1.5 seconds.
- **Schema:** Always output plain uppercase strings (`line1`, `line2`, `redEmphasis`)—never raw HTML tags.

**Examples of Effective Caption Rhythm:**

- `EVERYTHING AT HIS` / `FINGERTIPS.` _(red)_
- `A VILLAGE VERSUS` / `THE WHOLE WORLD.` _(red)_
- `BETTER ON PAPER.` / `NOT IN FEELING.` _(red)_
- `THE GOALPOSTS KEEP` / `MOVING FORWARD.` _(red)_

---

## 6. Unified Pacing & Visual Momentum Contract

- **Target Runtime & Card Count:** Aim for the duration specified by the brief, defaulting to about **60 seconds** within a **45–75 second** format. Use the number of visual cards required by the story; code derives durations from narration at about 2.7 words per second and adds a short transition pause.
- **Maximum Hold Rule:** Never hold one static illustration for longer than **4 seconds**.
- **Setup-and-Payoff Splitting:** When a narration sentence contains a setup and an ironic twist, contrast, or reveal, split it across consecutive cards only when each card still communicates a complete, useful visual beat.
- **Runtime Integrity:** The sum of estimated scene durations must reach at least 50 seconds and stay near the 50-second target. Do not pad with repeated narration or split a thought into empty cards to reach the count; narrow the topic or report that the scope cannot fit honestly.
- **Earned Cuts Only:** Every card cut must introduce a meaningful visual shift (a new action, camera zoom/crop on a reaction, a chart step, or a counter-example). Never duplicate cards or cut randomly mid-thought.

---

## 7. Scene-to-Scene Continuity & Negative Constraints

- **Continuity:** Maintain identical header placement, card borders, line weight, character proportions, and color palette from Card 1 to the final card.
- **Transitions:** Hard cuts or subtle 0.15s cross-dissolves only. Subtle slow push-in (100% → 104% scale) permitted on longer holds.
- **Strictly Forbidden:**
  - Photorealism, 3D/Pixar rendering, glossy gradients, cinematic lighting, depth-of-field blur, or film grain.
  - Anime, manga, or detailed comic-book crosshatching.
  - Narrow vertical left/right split-screens that squish characters on mobile.
  - AI-generated gibberish text inside artwork.
  - Flashy wipes, spins, bounce animations, or kinetic typography clutter.

## 8. Full-card prompt text

- Request a complete full-frame card with three explicit bands: title at top, rich comic illustration in the middle, narration key phrase at bottom.
- Quote the exact video title and exact approved caption text in the prompt. Preserve capitalization and punctuation; never paraphrase or shorten them.
- Keep title and caption readable and separated from the illustration. Use bold rounded black lettering for the title and caption, with only the approved `redEmphasis` phrase in red.
- Keep the exact title and caption in overlay metadata for validation. If a downstream renderer receives a card image with text already rendered, it must not draw the title or caption again.
- For diagrams, use only exact approved diagram labels; never invent incidental sign or screen text.

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


## Canonical palette authority
The productionBible palette is the source of truth. The default palette is warm cream `#FDFBF7`,
near-black ink `#1A1A1A`, warm beige `#DCCBB5`, soft sage `#A8B9A0`, dusty blue `#A8C2D1`,
muted ochre `#D9B66F`, muted brown `#9A7658`, and selective crimson `#E63946`.
If a project productionBible explicitly defines a different approved palette, that project palette
wins consistently across every visual stage. Never mix palette variants within one film.


## Canonical 1:1 safe-zone geometry
Use the full 1080×1080 canvas: header Y 0–14%, artwork Y 15–74%, caption Y 75–100%.
The approved warm background continues through all three bands. The title and caption are requested in the full-card image prompt; keep the central illustration in the middle band. Do not introduce black letterbox bands.
