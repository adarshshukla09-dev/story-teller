import { z } from "zod";
import { runStructuredAgent } from "./base.agent.js";
import { STYLE_BIBLE } from "./style.bible.js";

const promptSchema = z.object({
  prompt: z
    .string()
    .min(200)
    .describe("Structured scene layout spec for the SVG agent."),
});

export interface PromptAgentInput {
  sceneId: number;
  rawImagePrompt: string;
  negativePrompt: string;
  requiredElements: string[];
  mustNotInclude: string[];
  textOverlays: {
    header: string;
    captionLine1: string;
    captionLine2: string | null;
    redEmphasis: string | null;
    diagramLabels: string[];
  };
  compositionPlan: unknown;
}
export async function createImagePrompt(
  image: PromptAgentInput,
): Promise<string> {
  const input = `
You are a professional storyboard artist and visual director.

Your job is to transform the supplied narration and scene
requirements into a detailed illustration blueprint.

The blueprint will be used by another AI agent to create
a complete hand-drawn SVG illustration.

${STYLE_BIBLE}

SCENE ID:
${image.sceneId}

NARRATION:
${image.rawImagePrompt}

REQUIRED ELEMENTS:
${JSON.stringify(image.requiredElements)}

FORBIDDEN ELEMENTS:
${JSON.stringify(image.mustNotInclude)}

NEGATIVE PROMPT:
${image.negativePrompt}

EXACT TEXT:
${JSON.stringify(image.textOverlays)}

COMPOSITION HINT:
${JSON.stringify(image.compositionPlan)}

YOUR RESPONSIBILITIES:

1. UNDERSTAND THE STORY

Understand what is happening in this scene.

Identify:
- Main action.
- Character emotion.
- Environmental context.
- Important objects.
- Visual storytelling opportunity.

2. DESIGN THE ENVIRONMENT

Describe three layers:

BACKGROUND:
Sky, landscape, distant buildings and scenery.

MIDDLE GROUND:
Main environment, structures and important objects.

FOREGROUND:
Character, props, ground and decorative details.

3. CHARACTER POSITIONING

Give exact pixel coordinates for:
- Head.
- Body.
- Left arm.
- Right arm.
- Left leg.
- Right leg.

Describe the pose and facial expression.

The character must physically interact with
the relevant objects.

4. OBJECT DESIGN

For every important object specify:
- Position.
- Dimensions.
- Shape.
- Fill color.
- Outline color.
- Outline thickness.
- Internal details.

5. COMPOSITION

Canvas: 1024 x 1024.

Header region: y=35 to 125.
Illustration region: y=145 to 825.
Caption region: y=845 to 990.

Keep all important elements inside these regions.

6. VISUAL STORYTELLING

The illustration must communicate the narration
even without reading the caption.

Use environmental storytelling rather than
simply placing objects next to the character.

7. TEXT

Copy all supplied text exactly.

Never invent additional text.

8. IMPORTANT

Do not simplify a complex environment into
one rectangle and two circles.

Do not remove required elements.

Do not sacrifice storytelling for minimalism.

Return a detailed, coordinate-based illustration blueprint.
`;
  const result = await runStructuredAgent(
    { name: "Prompt Engineer", task: "Stickman Layout Spec", temperature: 0.3 },
    input,
    promptSchema,
  );
  return result.prompt;
}
