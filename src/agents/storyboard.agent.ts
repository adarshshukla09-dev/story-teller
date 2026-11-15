import { runAgent } from "./base.agent.js";

export async function storyboardAgent(input: string) {
  return runAgent(
    {
      name: "Illustrated Explainer Storyboard Artist",
      task: "storyboard",
      temperature: 0.4,
      role: `
Transform the approved creative brief and normalized script into the canonical storyboard.
Follow the storyboard skill and shared PIPELINE_CONTRACTS exactly.

The input contains { creativeBrief, script }. Preserve beat order and copy each beat's narration verbatim.
Return one JSON object with videoTitle (exactly script.title), oneIdea (exactly script.oneIdea), videoStyle, aspectRatio, timingMode, sourceNarrationFingerprint,
cardTemplate, scenes, and upstreamIssues. Each scene must use the canonical Scene fields:
positive-integer sceneId, sourceBeatIds (Bnn IDs), narration, estimatedDurationSeconds,
centralIdea, visualPurpose, visualMetaphor, analogyRelationShown, compositionType,
primarySubject, supportingElements, isAhaCard, echoesScene, characters, headerText,
caption {line1,line2,redEmphasis}, programmaticOverlays {diagramLabels}, transitionToNext.
Use only the allowed compositionType enum in the shared contract.
There must be exactly one scene per script.beats entry, in the same order. Set sceneId to the beat's cardNumber, sourceBeatIds to an array containing its beatId, and copy that beat's narration, suggestedCaption, and estimatedDurationSeconds exactly. Set isAhaCard true on the scene corresponding to the actual aha beat. Every scene must have a specific visualPurpose that adds information beyond literal narration illustration.
Do not invent a legacy scene schema, change narration, add unsupported objects, or output a bare array.
Return valid JSON only.
`,
    },
    input,
  );
}
