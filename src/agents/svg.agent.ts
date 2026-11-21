import { z } from "zod";
import { runStructuredAgent } from "./base.agent.js";
import { STYLE_BIBLE } from "./style.bible.js";
import { REFERENCE_SVG_CODE } from "./reference.stickman.js";

const svgCodeSchema = z.object({ code: z.string().min(100) });
export interface SVGAgentInput {
  sceneId: number;
  prompt: string;
}

export async function createSVGCode(image: SVGAgentInput): Promise<string> {
  const input = `
You are a senior SVG illustrator specializing in
hand-drawn educational comic illustrations.

Your task is to create a COMPLETE, BEAUTIFUL,
STORY-DRIVEN SVG illustration.

REFERENCE STYLE:
Warm, hand-drawn educational comic cards with
rich environments, expressive characters,
organic outlines and earthy colors.

${STYLE_BIBLE}

SCENE ID:
${image.sceneId}

ILLUSTRATION BLUEPRINT:
${image.prompt}

CANVAS:
1024 x 1024.

MANDATORY LAYOUT:

HEADER:
- Centered at the top.
- Bold, playful typography.
- Black text.
- Proper horizontal margins.

ILLUSTRATION:
- Rich, fully illustrated environment.
- Multiple visual depth layers.
- Character interacting with objects.
- Background scenery.
- Ground and foreground details.
- Natural composition.

CAPTION:
- Bold typography.
- Centered.
- Maximum two lines.
- Red emphasis using #D92727.
- Proper text wrapping.
- Never overflow the canvas.

SVG IMPLEMENTATION:

1. Define:
function renderSvg(width = 1024, height = 1024)

2. Return a complete SVG string.

3. Use reusable helper functions:
- stickman()
- drawTree()
- drawBush()
- drawCloud()
- drawHouse()
- drawGrass()
- drawGround()
- drawPath()
- drawObject()

Only implement helpers needed by the scene.

4. Use SVG paths for organic shapes.

5. Use layered groups:
- background
- distantEnvironment
- environment
- props
- character
- foreground
- header
- caption

6. Character must have a coherent pose.
All limbs must connect naturally.

7. Objects must have recognizable silhouettes
and sufficient internal details.

8. Use consistent outlines:
Main: 5-7px.
Details: 2-4px.

9. Use a warm, muted color palette.

10. Add subtle hand-drawn irregularity.
Avoid perfectly geometric illustrations.

11. Use text measurement and wrapping logic.
Never allow captions to overflow.

12. Preserve every required element from
the illustration blueprint.

TECHNICAL RESTRICTIONS:

- No imports or exports.
- No require().
- No eval or new Function.
- No browser or Node APIs.
- No external fonts or images.
- Must execute inside Node vm.Script.
- Return SVG markup as a string.
- No Markdown.

QUALITY REQUIREMENTS:

The final image must look like a finished
illustrated comic card, not a wireframe,
diagram, collection of primitive shapes,
or unfinished storyboard.

The environment should feel complete.

The character should communicate an action.

The illustration must communicate the scene
without relying entirely on text.

Return only JavaScript source code.
`;
  const result = await runStructuredAgent(
    { name: "SVG Agent", task: "Stickman SVG Generation", temperature: 0.2 },
    input,
    svgCodeSchema,
  );
  return result.code.trim();
}
