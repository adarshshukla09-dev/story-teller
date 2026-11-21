import { z } from "zod";
import { runStructuredAgent } from "./base.agent.js";
import { STYLE_BIBLE } from "./style.bible.js";

const svgCodeSchema = z.object({ code: z.string().min(100) });

export interface SVGAgentInput {
  sceneId: number;
  prompt: string;
}

export async function createSVGCode(image: SVGAgentInput): Promise<string> {
  const input = `
You are an expert SVG illustrator who draws flat, hand-drawn stickman comic cards.

${STYLE_BIBLE}

SCENE ID: ${image.sceneId}

LAYOUT SPEC (follow it exactly, including coordinates and colors):
${image.prompt}

JAVASCRIPT REQUIREMENTS:
- Define a normal function: function renderSvg(width = 1024, height = 1024) { ... }
- No export/import/require, no Markdown fences, no eval/new Function, no browser/Node APIs.
- Must run directly in Node's vm.Script. Return the SVG document as a string.
- Use xmlns="http://www.w3.org/2000/svg" and viewBox="0 0 1024 1024".
CRITICAL OUTPUT REQUIREMENT:

The structured output field "code" MUST contain JavaScript source code.

NEVER return raw SVG markup as the code field.

CORRECT:
function renderSvg(width = 1024, height = 1024) {
  return <svg xmlns="http://www.w3.org/2000/svg">...</svg>;
}

INCORRECT:
<svg xmlns="http://www.w3.org/2000/svg">
  ...
</svg>

The SVG document must be returned FROM the renderSvg function.

The generated JavaScript must be executable by Node vm.Script.
DRAWING RULES:
1. First element: <rect width="1024" height="1024" fill="#FDFBF7"/>.
2. Wrap all illustration shapes in <g id="art" filter="url(#wobble)">.
   Define ONE filter "wobble": feTurbulence (type="fractalNoise" baseFrequency="0.02" numOctaves="2" seed="3")
   + feDisplacementMap (scale="4"). This gives the hand-drawn wobble. Do not use any other filter.
3. Do NOT use gradients, drop shadows, patterns, masks or textures. Flat fills only.
4. All strokes: stroke="#111111", stroke-linecap="round", stroke-linejoin="round",
   stroke-width 6 (main) or 4 (details).
5. Draw the stickman with: <circle> head (fill white), <line> or <path> for body, arms, legs,
   small ellipses for feet, simple eyes and mouth. Reuse a helper function
   stickman({x, y, pose}) inside renderSvg so the figure stays consistent.
6. Render header and caption as real <text> elements OUTSIDE the wobble group, with
   text-anchor="middle", font-family="'Arial Black','Impact','Helvetica Neue',Arial,sans-serif",
   font-weight="900". Put the red emphasis word in a <tspan fill="#E63946">.
   Escape XML characters in text (&amp; &apos;).
7. Keep all text and drawings inside a 40px margin. Nothing may overflow the canvas.
8. Use meaningful group ids (header, art, character, props, ground, caption).
9. No placeholder code. No external resources. No text other than the header and caption
   (plus diagramLabels if specified).

Return only the JavaScript source code in the structured output.
`;

  const result = await runStructuredAgent(
    { name: "SVG Agent", task: "Stickman SVG Generation", temperature: 0.2 },
    input,
    svgCodeSchema,
  );
  return result.code.trim();
}
