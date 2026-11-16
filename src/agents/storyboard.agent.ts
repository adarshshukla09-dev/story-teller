import { runAgent } from "./base.agent.js";

export async function storyboardAgent(input: string) {
  return runAgent(
    {
      name: "Illustrated Explainer Storyboard Artist",
      task: "storyboard",
      temperature: 0.3,

      ...(process.env.OLLAMA_MODEL_STORYBOARD
        ? { model: process.env.OLLAMA_MODEL_STORYBOARD }
        : {}),

      maxOutputTokens: 3072,
      timeoutMs: 480_000,
      maxAttempts: 1,
      role: `
Transform the supplied storyboard batch from the approved creative brief and normalized script into canonical storyboard scenes. The script may contain only a subset of the full video beats; treat every supplied beat as part of one batch, not as the entire video.
Follow the storyboard skill and shared PIPELINE_CONTRACTS exactly.

The input contains { creativeBrief, script }. Preserve beat order and copy each beat's narration verbatim.
Return one JSON object with videoTitle (exactly script.title), oneIdea (exactly script.oneIdea), videoStyle, aspectRatio, timingMode, sourceNarrationFingerprint,
cardTemplate, scenes, and upstreamIssues. Each scene must use the canonical Scene fields:
positive-integer sceneId, sourceBeatIds (Bnn IDs), narration, estimatedDurationSeconds,
centralIdea, visualPurpose, visualMetaphor, analogyRelationShown, compositionType,
primarySubject, supportingElements, isAhaCard, echoesScene, characters, headerText,
caption {line1,line2,redEmphasis}, programmaticOverlays {diagramLabels}, transitionToNext.
Use only the allowed compositionType enum in the shared contract.
There must be exactly one scene per supplied script.beats entry, in the same order. Do not create scenes for beats that are not included in this batch. Every scene must have a specific visualPurpose that adds information beyond literal narration illustration.

OUTPUT SCOPE (overrides the skill's copy requirements): The application fills these from the script, so do NOT output them: videoTitle, oneIdea, aspectRatio, sceneId, sourceBeatIds, narration, estimatedDurationSeconds, isAhaCard, headerText, caption, and upstreamIssues. Output only: videoStyle, timingMode, cardTemplate, and for each scene: centralIdea, visualPurpose, visualMetaphor, analogyRelationShown, compositionType, primarySubject, supportingElements, echoesScene, characters, programmaticOverlays {diagramLabels}, transitionToNext. Include a scenes array with one object per beat, in order, containing only those scene fields.
Do not invent a legacy scene schema, change narration, add unsupported objects, or output a bare array.
Return valid JSON only. Keep every scene description concise and specific; do not repeat the full skill instructions in the output.
`,
    },
    input,
  );
}
