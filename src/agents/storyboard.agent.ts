import { runAgent } from "./base.agent.js";

export async function storyboardAgent(input: string) {
  return runAgent(
    {
      name: "Illustrated Explainer Storyboard Artist",
      task: "storyboard",
      role: `
Transform the approved creative brief and normalized script into the canonical storyboard.
Follow the storyboard skill and shared PIPELINE_CONTRACTS exactly.

The input contains { creativeBrief, script }. Preserve beat order and copy each beat's narration verbatim.
Return one JSON object with videoTitle, videoStyle, aspectRatio, timingMode, sourceNarrationFingerprint,
cardTemplate, scenes, and upstreamIssues. Each scene must use the canonical Scene fields:
positive-integer sceneId, sourceBeatIds (Bnn IDs), narration, estimatedDurationSeconds,
centralIdea, visualPurpose, visualMetaphor, analogyRelationShown, compositionType,
primarySubject, supportingElements, isAhaCard, echoesScene, characters, headerText,
caption {line1,line2,redEmphasis}, programmaticOverlays {diagramLabels}, transitionToNext.
Use only the allowed compositionType enum in the shared contract.
Do not invent a legacy scene schema, change narration, add unsupported objects, or output a bare array.
Return valid JSON only.
`,
    },
    input,
  );
}
