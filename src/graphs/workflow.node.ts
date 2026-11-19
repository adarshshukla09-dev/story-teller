import { comprehensionAgent } from "../agents/comprehension.agent.js";
import { researchAgent } from "../agents/research.agent.js";
import { factCheckAgent } from "../agents/fact-check.agent.js";
import { strategyAgent } from "../agents/strategy.agent.js";
import { directorAgent } from "../agents/director.agent.js";
import { scriptwriterAgent } from "../agents/scriptwriter.agent.js";
import { qaAgent, normalizeScript } from "../agents/QA.agent.js";
import { artDirectionAgent } from "../agents/artDirectionAgent.agent.js";
import { storyboardAgent } from "../agents/storyboard.agent.js";
import { continuityAgent } from "../agents/continuity.agent.js";
import { visualDirectorAgent } from "../agents/visual-director.agent.js";
import type {
  ProductionState,
  ProductionStateType,
  FactCheckResult,
  GeneratedSceneImage,
} from "./workflow.state.js";
import { finalQAagent } from "../agents/QA.agent.js";
import { FactCheckResultSchema } from "../schema/fact.schema.js";

const MAX_SCRIPT_REVISIONS = 2;

interface NormalizedScenePrompt {
  sceneId: number;
  prompt: string;
  negativePrompt?: string;
}

function parseFactCheckResult(result: unknown): FactCheckResult {
  try {
    const parsed = typeof result === "string" ? JSON.parse(result) : result;
    return FactCheckResultSchema.parse(parsed);
  } catch (error) {
    console.error("Fact-check validation failed:", error);
    throw new Error(
      "Fact-check agent returned an invalid result matching neither the expected JSON nor FactCheckResult schema.",
      { cause: error },
    );
  }
}

function extractJsonObject(raw: string): any {
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  const start = cleaned.indexOf("{");
  if (start < 0) throw new Error("No JSON object found in agent response.");

  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < cleaned.length; i++) {
    const char = cleaned[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') inString = true;
    else if (char === "{") depth++;
    else if (char === "}" && --depth === 0) {
      return JSON.parse(cleaned.slice(start, i + 1));
    }
  }
  throw new Error("Agent response contains an incomplete JSON object.");
}

function extractScenePrompts(
  visualPrompts: unknown,
  scenes: any[],
): NormalizedScenePrompt[] {
  let parsed: any = visualPrompts;
  if (typeof visualPrompts === "string") {
    try {
      parsed = extractJsonObject(visualPrompts);
    } catch {
      parsed = null;
    }
  }

  if (Array.isArray(parsed?.imagePrompts) && parsed.imagePrompts.length > 0) {
    return parsed.imagePrompts.map((item: any, idx: number) => ({
      sceneId: Number(item.sceneId ?? scenes[idx]?.sceneId ?? idx + 1),
      prompt: String(item.prompt ?? ""),
      negativePrompt: item.negativePrompt
        ? String(item.negativePrompt)
        : undefined,
    }));
  }

  const specs = Array.isArray(parsed?.visualSpecifications)
    ? parsed.visualSpecifications
    : Array.isArray(parsed?.scenes)
      ? parsed.scenes
      : [];

  if (specs.length > 0) {
    return specs.map((spec: any, idx: number) => ({
      sceneId: Number(
        spec.sceneId ?? spec.scene ?? scenes[idx]?.sceneId ?? idx + 1,
      ),
      prompt: String(spec.sceneDescription ?? spec.prompt ?? ""),
      negativePrompt:
        "text, captions, labels, watermarks, letters, numbers, blurry, distorted",
    }));
  }

  return scenes.map((scene: any, idx: number) => ({
    sceneId: Number(scene.sceneId ?? idx + 1),
    prompt: String(scene.visualAction ?? scene.narration ?? ""),
    negativePrompt:
      "text, captions, labels, watermarks, letters, numbers, blurry, distorted",
  }));
}
interface ImageApiResponse {
  imageUrl?: string;
  url?: string;
  base64?: string;
  mimeType?: string;
  data?: Array<{
    url?: string;
    b64_json?: string;
  }>;
}
export async function generateSceneImage(
  scenePrompt: NormalizedScenePrompt,
): Promise<GeneratedSceneImage> {
  const apiKey = process.env.IMAGE_API_KEY;
  const endpoint = process.env.IMAGE_API_URL;

  if (!apiKey || !endpoint) {
    throw new Error(
      "IMAGE_API_KEY or IMAGE_API_URL environment variable is not configured.",
    );
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      prompt: scenePrompt.prompt,
      negative_prompt: scenePrompt.negativePrompt,
      aspect_ratio: "1:1",
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errorText}`);
  }

  const raw: unknown = await response.json();
  const data = raw && typeof raw === "object" ? (raw as ImageApiResponse) : {};
  const imageUrl = data.imageUrl ?? data.url ?? data.data?.[0]?.url;
  const base64 = data.base64 ?? data.data?.[0]?.b64_json;

  return {
    sceneId: scenePrompt.sceneId,
    ...(imageUrl !== undefined ? { imageUrl } : {}),
    ...(base64 !== undefined ? { base64 } : {}),
    mimeType: typeof data.mimeType === "string" ? data.mimeType : "image/png",
  };
}
export async function storyboardNode(state: ProductionStateType) {
  const result = await storyboardAgent(`
DIRECTOR BRIEF:
${state.directorOutput}

APPROVED SCRIPT:
${state.script}

Create the canonical storyboard for a 2D hand-drawn stickman comic video.
Preserve beat order and narration verbatim.
Use the Director's approved analogy map and claim ledger.
For each scene, specify:
- sceneId (1, 2, 3...)
- Top Header Title (short uppercase topic title, e.g., "${state.topic.toUpperCase()}")
- Central Stickman Visual Action & Environment
- Bottom Key Phrase (1–2 short uppercase lines derived from the most important idea or phrase in that scene's narration; mark key words for red emphasis)
- Make each scene a distinct story beat with a specific narrative purpose, visible action or change, emotional tone when supported, and a clear link to the preceding beat. Preserve the throughline; do not split scenes into concept-definition cards.
- For a fictional story, depict it as an illustrative scenario and do not add factual-looking details that imply it happened. Prefer human action, interaction, and environmental clues when these clarify the narration.

OUTPUT CONTRACT:
- Return exactly one JSON object, with no markdown, headings, commentary, or code fences.
- The object must contain the canonical storyboard fields: videoTitle, oneIdea, videoStyle, aspectRatio ("1:1"), timingMode, cardTemplate, scenes, and upstreamIssues.
- scenes must be a non-empty array. Each scene must preserve the approved script beat order and narration verbatim, and include the complete canonical scene fields from the storyboard contract.
- Do not return the storyboard skill, these instructions, or an explanation of your process.
`);

  try {
    const storyboard =
      typeof result === "string" ? extractJsonObject(result) : result;
    if (!Array.isArray(storyboard?.scenes) || storyboard.scenes.length === 0) {
      throw new Error("storyboard.scenes must be a non-empty array.");
    }
    return { storyboard: JSON.stringify(storyboard) };
  } catch (error) {
    const responseExcerpt =
      typeof result === "string"
        ? result.replace(/\s+/g, " ").slice(0, 240)
        : "<non-string response>";
    throw new Error(
      `Storyboard agent did not return a usable canonical JSON storyboard: ${error}. Response began: ${JSON.stringify(responseExcerpt)}`,
      { cause: error },
    );
  }
}
export function qaRouter(state: typeof ProductionState.State) {
  if (state.qaStatus === "approved") {
    return "storyboardAgent";
  }

  if (state.revisionCount < MAX_SCRIPT_REVISIONS) {
    return "scriptwriterAgent";
  }

  throw new Error(
    `Script QA failed after ${MAX_SCRIPT_REVISIONS} revisions. ` +
      `Production stopped. QA feedback: ${state.qaFeedback}`,
  );
}
export async function prepareSceneImagesNode(state: ProductionStateType) {
  const parsedStoryboard =
    typeof state.storyboard === "string"
      ? extractJsonObject(state.storyboard)
      : state.storyboard;

  const scenes = Array.isArray(parsedStoryboard?.scenes)
    ? parsedStoryboard.scenes
    : [];

  if (scenes.length === 0) {
    throw new Error("No storyboard scenes found.");
  }

  const prompts = extractScenePrompts(state.visualPrompts, scenes);

  const promptBySceneId = new Map(prompts.map((item) => [item.sceneId, item]));

  const sceneImageQueue = scenes.map((scene: any, index: number) => {
    const sceneId = Number(scene.sceneId ?? index + 1);
    const prompt = promptBySceneId.get(sceneId);

    return {
      sceneId,
      prompt: prompt?.prompt ?? "",
      ...(prompt?.negativePrompt
        ? { negativePrompt: prompt.negativePrompt }
        : {}),
    };
  });

  return {
    sceneImageQueue,
    sceneImageIndex: 0,
    generatedImages: [],
    failedSceneIds: [],
    imageValidationIssues: [],
  };
}
export async function compositionNode(state: ProductionStateType) {
  const result = await artDirectionAgent(`
STORYBOARD:
${state.storyboard}

VISUAL STYLE:
Square 2D Hand-Drawn Stickman Webcomic Card on a full 1:1 canvas (1080x1080).

Create exactly one canonical CompositionPlan per Scene.

Requirements:
- Preserve every sceneId (numeric: 1, 2, 3...) and scene order.
- Use normalized coordinates from 0–100 across a 3-zone square 1:1 card layout:
  1. Top Title Zone: y = 0–14% (bold uppercase topic header)
  2. Central Illustration Zone: y = 15–74% (stickman character, props, and environment)
  3. Bottom Caption Zone: y = 75–100% (1–2 line key phrase)
- Use only approved characters, props, and visual relationships.
- Do not change the narrative or introduce new story elements.

Return valid JSON only with a top-level "compositionPlan" array keyed by "sceneId".
`);

  return {
    composition: result,
  };
}

export async function continuityNode(state: ProductionStateType) {
  const result = await continuityAgent(`
DIRECTOR BRIEF:
${state.directorOutput}

STORYBOARD:
${state.storyboard}

COMPOSITION:
${state.composition}

Create the canonical production bible for a 2D hand-drawn stickman comic series.

Enforce these exact visual standards:
- Character Design: Simple white circular heads (#FFFFFF), small black dot eyes, expressive curved eyebrows and mouths, bold ink stick limbs (#1A1A1A, stroke-width 6–7), and simple flat-colored clothing or props when needed.
- Linework: Bold ink outlines (#1A1A1A, stroke-width 5–7, stroke-linecap="round", stroke-linejoin="round") across characters, props, and backgrounds.
- Exact Color Palette:
  - Warm Cream/Parchment Card Background: #FDFBF7
  - Earthy Browns (dirt, wood, huts, furniture): #DCCBB5, #9A7658
  - Muted Greens (grass and trees): #A8B9A0, #6D8758
  - Soft Daytime Sky / Cool Accents: #A8C2D1
  - Muted Warm Accent: #D9B66F
  - Emphasis Red (caption key phrase and meaningful focal accent): #E63946
  - Primary Ink / Title Text: #1A1A1A
- Typography Layout:
  - Top Header: Bold rounded uppercase comic title centered near y=76 on the 1080x1080 card.
  - Bottom Punchline: One or two bold uppercase lines centered near y=900 and y=990, with the canonical redEmphasis colored #E63946.

Do not change approved storyboard or composition decisions.
`);

  return {
    continuity: result,
  };
}
export function imageGenerationRouter(state: ProductionStateType) {
  if (state.sceneImageIndex < state.sceneImageQueue.length) {
    return "generateSceneImage";
  }

  return "finalQaAgent";
}
export async function visualDirectorNode(state: ProductionStateType) {
  const result = await visualDirectorAgent(`
STORYBOARD:
${state.storyboard}

COMPOSITION:
${state.composition}

PRODUCTION BIBLE:
${state.continuity}

Create one full-card image-generation prompt per scene. Each prompt must describe the complete vertical comic card: exact video title at top, richly colored illustrated scene in the middle, and exact narration key phrase at bottom. Preserve exact programmatic overlay metadata too.

For each sceneId, specify:
1. "assetType": "central-artwork"
2. "prompt": Detailed, self-contained instruction for a complete square 1:1 card. Describe a fully colored 2D hand-drawn comic scene with a clear setting, foreground/midground/background, character pose and expression, action, props, lighting, and approved palette hex codes. Include the exact storyboard headerText, centered at the top, and exact caption.line1/line2 at the bottom; describe the approved redEmphasis substring in red. Do not shorten or paraphrase these strings. Keep the central illustration free of all text, labels, pseudo-writing, speech bubbles, or ghosted/faded lettering. Do not default to sparse minimalist symbols or a blank white background.
Make the central image show the actual scene action or state change described by the storyboard, including meaningful human interactions and recurring objects where approved. Use a concrete visual metaphor only when it clarifies the story beat; avoid generic topic illustrations.
3. "negativePrompt": Prohibit any text or pseudo-text in the middle illustration, misspelled or extra title/caption text, unapproved labels, watermarks, distorted anatomy, unapproved elements, cropped title/caption, and title/caption collisions. Do not prohibit the approved top title or bottom caption.
4. "requiredElements": Array of required scene elements.
5. "mustNotInclude": Array of forbidden artifacts.
6. "textOverlays": { "header": string, "captionLine1": string, "captionLine2": string | null, "redEmphasis": string | null, "diagramLabels": string[] }

Preserve exact sceneId order, canonical characters, and exact palette hex codes.
Return valid JSON only with top-level key "imagePrompts".
`);

  return {
    visualPrompts: result,
  };
}
// export async function imageNode(state: ProductionStateType) {
//   const index = state.sceneImageIndex;

//   const scenePrompt = state.sceneImageQueue[index];

//   if (!scenePrompt) {
//     throw new Error(`No scene image task found at index ${index}.`);
//   }

//   // Handle missing prompts without stopping the workflow.
//   if (!scenePrompt.prompt.trim()) {
//     const message = `Missing image prompt for sceneId ${scenePrompt.sceneId}.`;

//     return {
//       sceneImageIndex: index + 1,

//       failedSceneIds: [...state.failedSceneIds, scenePrompt.sceneId],

//       imageValidationIssues: [...state.imageValidationIssues, message],

//       errors: [message],
//     };
//   }

//   try {
//     // Generate ONLY the current scene image.
//     const image = await generateSceneImage(scenePrompt);

//     if (!image.imageUrl && !image.base64) {
//       throw new Error("Image API returned neither imageUrl nor base64.");
//     }

//     return {
//       sceneImageIndex: index + 1,

//       generatedImages: [...state.generatedImages, image],
//     };
//   } catch (error) {
//     const message = `Scene ${scenePrompt.sceneId} image generation failed: ${
//       (error as Error).message
//     }`;

//     return {
//       sceneImageIndex: index + 1,

//       failedSceneIds: [...state.failedSceneIds, scenePrompt.sceneId],

//       imageValidationIssues: [...state.imageValidationIssues, message],

//       errors: [message],
//     };
//   }
// }
export async function imageNode(state: ProductionStateType) {
  const index = state.sceneImageIndex;
  const scenePrompt = state.sceneImageQueue[index];

  if (!scenePrompt) {
    throw new Error(`No scene image task found at index ${index}.`);
  }

  if (!scenePrompt.prompt.trim()) {
    const message = `Missing image prompt for sceneId ${scenePrompt.sceneId}.`;

    return {
      sceneImageIndex: index + 1,
      failedSceneIds: [...state.failedSceneIds, scenePrompt.sceneId],
      imageValidationIssues: [...state.imageValidationIssues, message],
      errors: [message],
    };
  }

  // Testing mode: save the prompt without calling the image API.
  console.log(`Image prompt for scene ${scenePrompt.sceneId}:`);
  console.log(scenePrompt.prompt);

  return {
    sceneImageIndex: index + 1,
    generatedImagePrompts: [...state.generatedImagePrompts, scenePrompt],
  };
}
export async function comprehensionNode(state: ProductionStateType) {
  const result = await comprehensionAgent(state.topic);
  return {
    comprehension: result,
  };
}
export async function researchNode(state: ProductionStateType) {
  const result = await researchAgent(`
TOPIC:
${state.topic}

COMPREHENSION:
${state.comprehension}

Research the topic and create a detailed evidence-based research dossier.
`);

  return {
    researchDossier: result,
  };
}
export async function factCheckNode(state: ProductionStateType) {
  const result = await factCheckAgent(`
TOPIC:
${state.topic}

RESEARCH DOSSIER:
${state.researchDossier}

TASK:

Perform an independent factuality audit of the research dossier.

Follow the Independent Fact-Checking Skill strictly.

Requirements:

1. Return valid JSON only.
2. Follow the complete FactCheckResult output contract.
3. Audit individual claims, causal relationships, analogies,
   and domain-specific safety concerns.
4. Identify all blocking, major, and minor issues.
5. Do not invent sources or evidence.
6. Do not mark claims verified without traceable supporting evidence.
7. Distinguish unsupported claims from false claims.
8. Set status to "revise" whenever blocking issues remain.
9. Set status to "pass" only when no blocking issues remain.
10. Explicitly report verification limitations.

Do not return Markdown or explanatory text outside JSON.
`);

  const validatedResult = parseFactCheckResult(result);

  const approved =
    validatedResult.status === "pass" &&
    validatedResult.blockingIssues.length === 0;

  return {
    factCheck: validatedResult,
    factCheckStatus: approved
      ? ("approved" as const)
      : ("revision_required" as const),
  };
}
export function factCheckRouter(state: ProductionStateType) {
  if (
    state.factCheckStatus === "approved" &&
    state.factCheck?.status === "pass" &&
    state.factCheck.blockingIssues.length === 0
  ) {
    return "strategy";
  }

  throw new Error(
    `Fact-check failed. Status: ${state.factCheckStatus}. Blocking issues: ${
      state.factCheck?.blockingIssues.join(", ") ??
      "No fact-check result available"
    }`,
  );
}
export async function strategyNode(state: ProductionStateType) {
  const result = await strategyAgent(`
TOPIC:
${state.topic}

COMPREHENSION:
${state.comprehension}

RESEARCH:
${state.researchDossier}

FACT CHECK:
${JSON.stringify(state.factCheck, null, 2)}

Design a storytelling strategy for a 2D hand-drawn stickman comic explainer video.
Focus on relatable everyday situations, clear visual contrasts, simple charts, and punchy 2-line comic captions.
Choose the story engine that best fits the topic. When a person-centered story fits, follow one character's desire or expectation, obstacle, consequence, and earned realization across the arc. Introduce concepts only as they explain events in this journey; prefer a few connected ideas over a list. End by revealing what the character's experience means, grounded in evidence. A clearly labeled illustrative fictional scenario is allowed, but never present it as a true anecdote or evidence. For topics where a protagonist would be artificial, use a coherent system, historical, or thought-experiment arc instead.
`);

  return {
    explanationStrategy: result,
  };
}
export async function directorNode(state: ProductionStateType) {
  const factCheckText = JSON.stringify(state.factCheck ?? {}, null, 2);

  const result = await directorAgent({
    topic: state.topic,
    referenceScript: state.referenceScript,
    researchDossier: {
      research: state.researchDossier,
      factCheck: factCheckText,
    },
    factCheckReport: factCheckText,
    explanationStrategy: state.explanationStrategy,
  });

  return {
    directorOutput: result,
  };
}
export async function scriptwriterNode(state: ProductionStateType) {
  const isRevision = state.qaStatus === "revision_required";

  const result = await scriptwriterAgent(`
TOPIC:
${state.topic}

REFERENCE NARRATION:
${state.referenceScript}

STORY ARCHITECTURE:
${state.directorOutput}

RESEARCH:
${state.researchDossier}

FACT CHECK:
${JSON.stringify(state.factCheck, null, 2)}

EXPLANATION STRATEGY:
${state.explanationStrategy}

PREVIOUS SCRIPT:
${isRevision ? state.script : "No previous script."}

QA REVISION FEEDBACK:
${isRevision ? state.qaFeedback : "No revision feedback."}

SCENE AND NARRATION REQUIREMENTS:
- Return a single JSON object whose top-level "beats" field is a non-empty array. Do not nest the script under "script" or "output", and do not return a bare array.
- Produce exactly one script beat for each Director beatMap entry.
- Do not split, merge, or reorder Director beats.
- Target 50–52 seconds total across 14–16 beats; each beat must be 3–4 seconds.
- Include estimatedDurationSeconds as a positive JSON number on every beat, normally 3–4; never omit it, use a string, or set it to null. Choose durations whose actual sum is 50–52 seconds; do not assign 3.5 seconds to every beat by default (15 beats at 3.5 seconds is 52.5 seconds; 3.4 seconds each is 51 seconds).
- Keep narration concise, natural, accurate, and understandable when heard independently.
- Tell the approved story through the explanation: for a character-led arc, establish what the character wants or expects, show the obstacle and consequence, weave concepts in as explanations for those events, and earn the realization through evidence and mechanism. The ending should reveal the meaning through the story itself. For other story engines, preserve the same connected progression from concrete opening through discovery to payoff. Avoid a concept-by-concept lecture or study list. Use human detail only when supported, or label an invented scenario as illustrative; never invent factual events, quotations, statistics, or researcher claims.
- Keep the Script artifact canonical: narration, timing, suggested caption, and beat-to-claim references only. Do not add scene IDs, imageDetails, or visual prompts to script beats.
- Preserve all canonical beat fields, identifiers, Director stage/connector values, isAhaCard values, and claimIds.

REFERENCE FIDELITY REQUIREMENTS:
- Preserve the reference's central idea and essential explanatory progression.
- Do not replace its story with a different story or introduce unrelated concepts from research.
- Adapt and tighten the narration to the requested 50–52 second runtime; do not preserve the reference clip's length by default.
- Improve clarity and spoken flow without changing the intended message.
- If a change is necessary for factual accuracy, identify it explicitly.

Return valid JSON only, following the Scriptwriter output contract and skill.
`);

  return {
    script: result,
    revisionCount: isRevision ? state.revisionCount + 1 : state.revisionCount,
    qaStatus: "pending" as const,
  };
}
export async function qaNode(state: ProductionStateType) {
  // Enforce the canonical script contract before asking a model for creative QA.
  // This prevents an otherwise polished but incomplete script from being approved
  // and propagated into storyboard and production assembly.
  try {
    const scriptValue = typeof state.script === "string"
      ? extractJsonObject(state.script)
      : state.script;
    normalizeScript(scriptValue as any);
  } catch (error) {
    const validationMessage = error instanceof Error ? error.message : String(error);
    const durationFailure = validationMessage.match(/Script beat (B\d+) must have a positive estimatedDurationSeconds\./);
    const durationRangeFailure = validationMessage.match(/Script beat (B\d+) estimatedDurationSeconds must be 3–4 seconds \(received ([\d.]+)\)\./);
    const runtimeFailure = validationMessage.match(/Script estimated runtime must total 50–52 seconds \(received ([\d.]+)s\)\./);
    const repairInstruction = durationFailure
      ? `Beat ${durationFailure[1]} is missing a valid numeric estimatedDurationSeconds. Set it to a number from 3 to 4 seconds and ensure all beat durations sum to 50–52 seconds. Preserve its narration and all approved beat fields.`
      : durationRangeFailure
        ? `Beat ${durationRangeFailure[1]} is ${durationRangeFailure[2]} seconds, outside the allowed 3–4 second range. Set this beat to at least 3 and at most 4 seconds, then adjust other duration values as needed so the total remains 50–52 seconds. Preserve all narration and approved beat fields.`
      : runtimeFailure
        ? `Beat durations currently total ${runtimeFailure[1]} seconds. Adjust only estimatedDurationSeconds values so the sum is 50–52 seconds, keeping each beat between 3 and 4 seconds. For 15 beats, 3.4 seconds each totals 51 seconds. Preserve all narration and approved beat fields.`
      : validationMessage.includes("Script must contain a non-empty beats array")
        ? `The Script output is missing its required non-empty top-level beats array. Return one JSON object with a top-level "beats" array containing exactly one complete beat for each Director beat. Do not wrap the object in a "script" or "output" property and do not return a bare array.`
      : `Correct the canonical Script validation error while preserving approved beat order, IDs, and content: ${validationMessage}`;
    return {
      qaFeedback: `REVISION_REQUIRED: ${repairInstruction} Return exactly one complete beat for every Director beat, with non-empty narration and a positive numeric estimatedDurationSeconds.`,
      qaStatus: "revision_required" as const,
    };
  }

  const result: string = await qaAgent(`
TOPIC:
${state.topic}

ORIGINAL RESEARCH:
${state.researchDossier}

FACT CHECK:
${JSON.stringify(state.factCheck, null, 2)}

SCRIPT:
${state.script}

Evaluate:

1. Contract completeness: every beat exists and has non-empty narration and a positive duration. Missing or blank narration is always REVISION_REQUIRED, even if the remaining script is strong.
2. Factual accuracy.
3. Opening hook.
4. Storytelling quality.
5. Emotional engagement.
6. Logical progression.
7. Simplicity and comprehension.
8. Pacing and narration.
9. Strength of conclusion.

Return a clear decision:
APPROVED or REVISION_REQUIRED.

If revision is required, explain the exact corrections.
`);

  const approved =
    /\bAPPROVED\b/i.test(result) && !/\bREVISION_REQUIRED\b/i.test(result);

  return {
    qaFeedback: result,
    qaStatus: approved ? ("approved" as const) : ("revision_required" as const),
  };
}
export async function artDirectionNode(state: ProductionStateType) {
  const result = await artDirectionAgent(`
SCRIPT:
${state.script}

STORYBOARD:
${state.storyboard}
`);

  return {
    artDirection: result,
  };
}
export async function finalQaNode(state: ProductionStateType) {
  let visualPromptData: any;
  try {
    visualPromptData = typeof state.visualPrompts === "string"
      ? extractJsonObject(state.visualPrompts)
      : state.visualPrompts;
  } catch {
    visualPromptData = undefined;
  }

  const expectedSceneIds = state.sceneImageQueue.map((scene) => scene.sceneId);

  const generatedPromptIds = new Set(
    state.generatedImagePrompts.map((scene) => scene.sceneId),
  );

  const missingPrompts = expectedSceneIds.filter(
    (id) => !generatedPromptIds.has(id),
  );

  if (missingPrompts.length > 0) {
    throw new Error(
      `Final QA blocked. Missing prompts for scenes: ${missingPrompts.join(", ")}`,
    );
  }
  // const storyboard =
  //   typeof state.storyboard === "string"
  //     ? extractJsonObject(state.storyboard)
  //     : state.storyboard;

  // const expectedIds = storyboard.scenes.map((scene: any, index: number) =>
  //   Number(scene.sceneId ?? index + 1),
  // );

  // const generatedIds = new Set(
  //   state.generatedImages
  //     .filter((image) => image.imageUrl || image.base64)
  //     .map((image) => image.sceneId),
  // );

  // const missingImages = expectedIds.filter(
  //   (id: number) => !generatedIds.has(id),
  // );

  // if (missingImages.length > 0) {
  //   throw new Error(
  //     `Final QA blocked. Missing images for scenes: ${missingImages.join(", ")}`,
  //   );
  // }
  const result = await finalQAagent(`
TOPIC:
${state.topic}

DIRECTOR BRIEF:
${state.directorOutput}

SCRIPT:
${state.script}

STORYBOARD:
${state.storyboard}

COMPOSITION:
${state.composition}

PRODUCTION BIBLE:
${state.continuity}

VISUAL PROMPTS:
${state.visualPrompts}

GENERATED IMAGES:
${JSON.stringify(state.generatedImages, null, 2)}

IMAGE VALIDATION ISSUES:
${JSON.stringify(state.imageValidationIssues, null, 2)}

Perform final production QA for a richly colored 2D comic explainer card series.

Check:
1. Factual accuracy and claim traceability.
2. Storytelling and comprehension.
3. Beat-to-scene coverage (every beat has a matching sceneId generated image).
4. Narration preservation.
5. Storyboard title, bottom key phrase, and diagram labels are present in their matching textOverlays fields and the exact title/caption strings are requested visibly in the matching image prompt.
6. Character and prop continuity (stickman style, bold dark outlines, consistent colors).
7. Image prompts allow only the exact approved title and scene caption (and approved diagram labels); prohibit other readable text. This run is prompt-only, so generatedImages is expected to be empty; check generatedImagePrompts coverage and unresolved prompt errors instead of requiring imageUrl/base64 payloads.
8. Approve only when every required check passes. Otherwise require revision and report concrete, minimal corrections.

TEXT RULE: The full-card image prompt must explicitly request the exact approved title at the top and scene caption at the bottom. textOverlays remains the canonical copy for QA and renderer handoff. Do not add those strings a second time if they are already rendered into the image.

Return exactly the final QA skill JSON contract: {"status":"approved"|"revision_required","issues":[...]}. Each issue must include sceneId when applicable, artifact, severity, category, description, and correction. Do not add markdown or text outside the JSON.
`);

  let review: any;
  try {
    review = extractJsonObject(result);
  } catch {
    throw new Error(
      `Final QA must return the required JSON status/issues object. Response began: ${result.slice(0, 240)}`,
    );
  }
  const dimensions = [
    "hookAndCuriosity",
    "narrativeStructure",
    "centralIdeaClarity",
    "causeAndEffectProgression",
    "emotionalEngagement",
    "analogyQualityAndFidelity",
    "visualStorytelling",
    "ahaMomentAndPayoff",
    "factualAccuracy",
    "endingAndMemorability",
  ];
  const issues = Array.isArray(review.issues)
    ? review.issues
    : Array.isArray(review.blockingIssues)
      ? review.blockingIssues
      : null;
  if (!issues) {
    throw new Error("Final QA response is missing its required issues array.");
  }
  const imagePrompts: any[] = Array.isArray(visualPromptData?.imagePrompts)
    ? visualPromptData.imagePrompts
    : Array.isArray(visualPromptData?.scenes)
      ? visualPromptData.scenes
      : [];
  const overlaySatisfiedIssues: any[] = [];
  const actionableIssues = issues.filter((issue: any) => {
    const artifact = String(issue?.artifact ?? "").toLowerCase();
    const issueText = `${issue?.description ?? ""} ${issue?.correction ?? ""}`;
    if (!/visual\s*prompt|image\s*prompt/.test(artifact) || !/(text|label|caption|header|lettering)/i.test(issueText)) return true;

    const sceneId = Number(issue?.sceneId);
    const prompt = imagePrompts.find((item) => Number(item.sceneId ?? item.scene) === sceneId);
    const exclusions = `${prompt?.negativePrompt ?? ""} ${(prompt?.mustNotInclude ?? []).join(" ")}`;
    if (!prompt?.textOverlays || !/(text|label)/i.test(exclusions)) return true;

    const quotedPhrase = issueText.match(/["'“]([^"'”]{2,})["'”]/)?.[1];
    if (!quotedPhrase) return true;
    const overlayText = JSON.stringify(prompt.textOverlays).replace(/[^a-z0-9]+/gi, " ").toLowerCase();
    const normalizedPhrase = quotedPhrase.replace(/[^a-z0-9]+/gi, " ").trim().toLowerCase();
    if (!overlayText.includes(normalizedPhrase)) return true;

    overlaySatisfiedIssues.push(issue);
    return false;
  });
  const status = String(review.status ?? review.decision ?? "").toLowerCase();

  const scoresObject = review.creativeScores;
  const scoresPresent = scoresObject && typeof scoresObject === "object";
  let normalizedScores: Record<string, unknown> | undefined;
  if (scoresPresent) {
    const rawScores = dimensions.map((key) => {
      const value = scoresObject[key];
      return typeof value === "object" && value !== null
        ? Number((value as any).score)
        : Number(value);
    });
    if (
      rawScores.every(
        (score) => Number.isFinite(score) && score >= 1 && score <= 10,
      )
    ) {
      const average =
        rawScores.reduce((sum, score) => sum + score, 0) / rawScores.length;
      normalizedScores = {
        ...scoresObject,
        average: Math.floor(average * 10) / 10,
      };
    }
  }
  const scoreGatePassed =
    !normalizedScores || Number(normalizedScores.average) >= 9;
  const onlyOverlayConflicts =
    issues.length > 0 &&
    actionableIssues.length === 0 &&
    overlaySatisfiedIssues.length === issues.length;
  const approved =
    (status === "approved" || status === "pass" || onlyOverlayConflicts) &&
    actionableIssues.length === 0 &&
    scoreGatePassed;

  return {
    finalQaFeedback: JSON.stringify(
      {
        ...review,
        status: approved ? "approved" : "revision_required",
        issues: actionableIssues,
        ...(overlaySatisfiedIssues.length ? { overlaySatisfiedIssues } : {}),
        ...(normalizedScores ? { creativeScores: normalizedScores } : {}),
      },
      null,
      2,
    ),
    finalQaStatus: approved
      ? ("approved" as const)
      : ("revision_required" as const),
  };
}
export async function finalOutputNode(state: ProductionStateType) {
  if (state.finalQaStatus !== "approved") {
    throw new Error(
      "Cannot generate final output: production has not passed final QA.",
    );
  }

  return {
    finalOutput: JSON.stringify(
      {
        topic: state.topic,
        referenceScript: state.referenceScript,
        script: state.script,
        storyboard: state.storyboard,
        composition: state.composition,
        continuity: state.continuity,
        visualPrompts: state.visualPrompts,
        generatedImagePrompts: state.generatedImagePrompts,
        generatedImages: state.generatedImages,
        qualityAssurance: {
          script: state.qaFeedback,
          finalProductionStatus: state.finalQaStatus,
          finalProduction: state.finalQaFeedback,
        },
      },
      null,
      2,
    ),
  };
}
