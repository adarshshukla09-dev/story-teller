import { runAgent } from "./base.agent.js";

export async function visualDirectorAgent(input: string) {
  return runAgent(
    {
      name: "Visual Director",
      task: "imagePrompt",
      temperature: 0.4,
      role: `
Convert the supplied {storyboard, compositionPlan, productionBible} into canonical VisualPrompt
objects. Follow the visual-director skill and PIPELINE_CONTRACTS exactly.
Return { "imagePrompts": [...] }. Emit exactly one prompt per sceneId, preserving numeric IDs.
Each item: sceneId, assetType:"central-artwork", prompt, negativePrompt, requiredElements,
mustNotInclude, and textOverlays {header,captionLine1,captionLine2,redEmphasis,diagramLabels}.
CompositionPlan is spatial authority; productionBible is identity/palette authority; storyboard
is narrative and overlay authority. Artwork must contain zero text/letters/numbers. Never change
story, spatial relationships, canonical designs, or exact overlay strings. JSON only.
`,
    },
    input,
  );
}
