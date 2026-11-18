import { comprehensionAgent } from "../agents/comprehension.agent.js";
import { researchAgent } from "../agents/research.agent.js";
import { factCheckAgent } from "../agents/fact-check.agent.js";
import { strategyAgent } from "../agents/strategy.agent.js";
import { directorAgent } from "../agents/director.agent.js";
import { scriptwriterAgent } from "../agents/scriptwriter.agent.js";
import { qaAgent } from "../agents/QA.agent.js";
import { artDirectionAgent } from "../agents/artDirectionAgent.agent.js";
import { storyboardAgent } from "../agents/storyboard.agent.js";
import { continuityAgent } from "../agents/continuity.agent.js";
import { visualDirectorAgent } from "../agents/visual-director.agent.js";
import { svgIllustratorAgent } from "../agents/svg-illustrator.agent.js";
import type {
  ProductionState,
  ProductionStateType,
  FactCheckResult,
} from "./workflow.state.js";
import { FactCheckResultSchema } from "../schema/factCheck.schema.js";
import { extractSvgResponse } from "../utils/svgResponseParser.js";
import { removeSvgTextElements, validateSvgArtwork } from "../services/svg-renderer.service.js";
import { finalQAagent } from "../agents/QA.agent.js";

const MAX_SCRIPT_REVISIONS = 2;

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
  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  // Agents occasionally prepend a markdown heading or explanation even when
  // asked for JSON. Extract the first complete JSON object instead of parsing
  // the whole response as if it were JSON.
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

OUTPUT CONTRACT:
- Return exactly one JSON object, with no markdown, headings, commentary, or code fences.
- The object must contain the canonical storyboard fields: videoTitle, oneIdea, videoStyle, aspectRatio ("9:16"), timingMode, cardTemplate, scenes, and upstreamIssues.
- scenes must be a non-empty array. Each scene must preserve the approved script beat order and narration verbatim, and include the complete canonical scene fields from the storyboard contract.
- Do not return the storyboard skill, these instructions, or an explanation of your process.
`);

  try {
    const storyboard = typeof result === "string" ? extractJsonObject(result) : result;
    if (!Array.isArray(storyboard?.scenes) || storyboard.scenes.length === 0) {
      throw new Error("storyboard.scenes must be a non-empty array.");
    }
    return { storyboard: JSON.stringify(storyboard) };
  } catch (error) {
    const responseExcerpt = typeof result === "string"
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

export async function compositionNode(state: ProductionStateType) {
  const result = await artDirectionAgent(`
STORYBOARD:
${state.storyboard}

VISUAL STYLE:
2D Hand-Drawn Stickman Webcomic Card on a full 9:16 canvas (1080x1920).

Create exactly one canonical CompositionPlan per Scene.

Requirements:
- Preserve every sceneId (numeric: 1, 2, 3...) and scene order.
- Use normalized coordinates from 0–100 across a 3-zone 9:16 card layout:
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
  * Warm Cream/Parchment Card Background: #FDFBF7
  * Earthy Browns (dirt, wood, huts, furniture): #DCCBB5, #9A7658
  * Muted Greens (grass and trees): #A8B9A0, #6D8758
  * Soft Daytime Sky / Cool Accents: #A8C2D1
  * Muted Warm Accent: #D9B66F
  * Emphasis Red (caption key phrase and meaningful focal accent): #E63946
  * Primary Ink / Title Text: #1A1A1A
- Typography Layout:
  * Top Header: Bold rounded uppercase comic title centered at y=128 on the 1080x1920 card.
  * Bottom Punchline: One or two bold uppercase lines centered at y=1585 and y=1680, with the canonical redEmphasis colored #E63946.

Do not change approved storyboard or composition decisions.
`);

  return {
    continuity: result,
  };
}

export async function visualDirectorNode(state: ProductionStateType) {
  const result = await visualDirectorAgent(`
STORYBOARD:
${state.storyboard}

COMPOSITION:
${state.composition}

PRODUCTION BIBLE:
${state.continuity}

Create one detailed 2D stickman comic-card visual specification per scene.

For each sceneId, explicitly specify:
1. "topTitle": Exact uppercase title text for the top of the card (e.g., "${state.topic.toUpperCase()}").
2. "sceneDescription": Detailed visual breakdown of the stickman's pose, facial expression, action, specific props, background environment (indoor room, outdoor landscape, chart, or split comparison), and any in-scene signs/labels (e.g., clock time, signpost, chart labels).
3. "bottomLine1": First line of the bottom punchline (black text, or white on dark night scenes).
4. "bottomLine2": Second line of the bottom punchline (highlight key emphasis words in crimson red #E63946).

Preserve exact sceneId order, canonical characters, and exact palette hex codes.
Return valid JSON only.
`);

  return {
    visualPrompts: result,
  };
}

export async function svgIllustratorNode(state: ProductionStateType) {
  let scenes: any[] = [];
  try {
    const parsedStoryboard =
      typeof state.storyboard === "string"
        ? extractJsonObject(state.storyboard)
        : state.storyboard;
    scenes = Array.isArray(parsedStoryboard?.scenes)
      ? parsedStoryboard.scenes
      : [];
  } catch (err) {
    throw new Error(
      `Failed to parse state.storyboard in svgIllustratorNode: ${err}`,
    );
  }
  if (scenes.length === 0) {
    throw new Error("SVG illustration requires the canonical storyboard scenes array.");
  }
  const storyboardIds = scenes.map((scene: any, index: number) => Number(scene.sceneId ?? index + 1));
  if (storyboardIds.some((id: number) => !Number.isInteger(id) || id < 1) || new Set(storyboardIds).size !== storyboardIds.length) {
    throw new Error("SVG illustration requires unique positive integer storyboard sceneIds.");
  }

  let visualPromptsData: any = state.visualPrompts;
  try {
    if (typeof state.visualPrompts === "string") {
      visualPromptsData = extractJsonObject(state.visualPrompts);
    }
  } catch {}

  const svgAssets: Array<{ sceneId: number; svgCode: string }> = [];

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    const sceneId = Number(scene.sceneId ?? i + 1);
    if (!Number.isInteger(sceneId) || sceneId < 1) {
      throw new Error(`Storyboard scene at index ${i} has an invalid sceneId.`);
    }

    const sceneVisualSpec = Array.isArray(visualPromptsData?.scenes)
      ? visualPromptsData.scenes.find(
          (s: any) => Number(s.sceneId ?? s.scene) === sceneId,
        )
      : visualPromptsData;

    const sceneInput = `
${svgRequirements}

==================================================
SCENE INFORMATION
==================================================

Scene ID: ${sceneId}

STORYBOARD SCENE:
${JSON.stringify(scene, null, 2)}

VISUAL SPECIFICATION:
${
  typeof sceneVisualSpec === "string"
    ? sceneVisualSpec
    : JSON.stringify(sceneVisualSpec, null, 2)
}

==================================================
TASK
==================================================

Generate only the central artwork for Scene ${sceneId}. Keep the header and caption areas clear; exact title and caption text are composed programmatically after artwork validation.
Return only valid SVG/XML starting with <svg and ending with </svg>.
Do not include Markdown code fences, JSON wrappers, or explanations.
`.trim();

    let svgCode: string | undefined;
    let lastError: unknown;
    let correction = "";
    // One correction pass handles common model violations without letting an
    // invalid asset silently pass or creating an unbounded graph retry loop.
    for (let attempt = 1; attempt <= 2 && !svgCode; attempt++) {
      try {
        const singleSceneResult = await svgIllustratorAgent(`${sceneInput}${correction}`);
        const trimmed = singleSceneResult.trim();
        let candidate: string;

        if (trimmed.startsWith("{") || trimmed.startsWith("```json")) {
          const parsedAsset = extractJsonObject(trimmed);
          const resolvedSceneId = Number(parsedAsset.sceneId ?? sceneId);
          if (resolvedSceneId !== sceneId) {
            throw new Error(`Response sceneId ${resolvedSceneId} does not match requested scene ${sceneId}.`);
          }
          if (typeof parsedAsset.svgCode !== "string") {
            throw new Error(`Missing svgCode in JSON response for scene ${sceneId}.`);
          }
          candidate = extractSvgResponse(parsedAsset.svgCode);
        } else {
          candidate = extractSvgResponse(trimmed);
        }

        // Gemini may include labels despite the prompt. Strip generated text;
        // the renderer adds the canonical title and caption after validation.
        svgCode = validateSvgArtwork(removeSvgTextElements(candidate), sceneId);
      } catch (error) {
        lastError = error;
        if (attempt < 2) {
          correction = `\n\nCORRECTION REQUIRED: Your previous SVG failed validation: ${String(error)}. Regenerate the complete scene SVG from scratch. Follow every SVG restriction exactly; return only one SVG root.`;
        }
      }
    }
    if (!svgCode) {
      throw new Error(`Scene ${sceneId} failed SVG validation after one correction attempt: ${String(lastError)}`, { cause: lastError });
    }

    svgAssets.push({
      sceneId,
      svgCode,
    });
  }

  return {
    svgIllustrations: JSON.stringify({ svgAssets }, null, 2),
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
- Keep the top-level canonical "beats" array.
- Produce exactly one script beat for each Director beatMap entry.
- Do not split, merge, or reorder Director beats.
- Target 50–52 seconds total across 14–16 beats; each beat must be 3–4 seconds.
- Keep narration concise, natural, accurate, and understandable when heard independently.
- Keep the Script artifact canonical: narration, timing, suggested caption, and beat-to-claim references only. Do not add scene IDs, imageDetails, visual prompts, or SVG instructions to script beats.
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

1. Factual accuracy.
2. Opening hook.
3. Storytelling quality.
4. Emotional engagement.
5. Logical progression.
6. Simplicity and comprehension.
7. Pacing and narration.
8. Strength of conclusion.

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

SVG ILLUSTRATIONS:
${state.svgIllustrations}

Perform final production QA for a 2D stickman comic explainer series.

Check:
1. Factual accuracy and claim traceability.
2. Storytelling and comprehension.
3. Beat-to-scene coverage (every beat has a matching sceneId SVG).
4. Narration preservation.
5. Storyboard title and bottom key phrase are present for every scene and remain in their canonical overlay fields.
6. Character and prop continuity (stickman style, bold dark outlines, consistent colors).
7. SVG artwork validity (valid XML, viewBox="0 0 1080 1130", no embedded text, rich scene details rather than bare placeholders). The export renderer places artwork in the central band and adds the exact title/caption as SVG text.
8. Approve only when every required check passes. Otherwise require revision and report concrete, minimal corrections.

Return exactly the final QA skill JSON contract: {"status":"approved"|"revision_required","issues":[...]}. Each issue must include sceneId when applicable, artifact, severity, category, description, and correction. Do not add markdown or text outside the JSON.
`);

  let review: any;
  try {
    review = extractJsonObject(result);
  } catch {
    throw new Error(`Final QA must return the required JSON status/issues object. Response began: ${result.slice(0, 240)}`);
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
  const status = String(review.status ?? review.decision ?? "").toLowerCase();

  // Keep optional numeric scorecards when present, but do not reject the
  // canonical finalQA skill response, which is intentionally status/issues.
  const scoresObject = review.creativeScores;
  const scoresPresent = scoresObject && typeof scoresObject === "object";
  let normalizedScores: Record<string, unknown> | undefined;
  if (scoresPresent) {
    const rawScores = dimensions.map((key) => {
      const value = scoresObject[key];
      return typeof value === "object" && value !== null ? Number((value as any).score) : Number(value);
    });
    if (rawScores.every((score) => Number.isFinite(score) && score >= 1 && score <= 10)) {
      const average = rawScores.reduce((sum, score) => sum + score, 0) / rawScores.length;
      normalizedScores = {
        ...scoresObject,
        average: Math.floor(average * 10) / 10,
      };
    }
  }
  const scoreGatePassed = !normalizedScores || Number(normalizedScores.average) >= 9;
  const approved =
    (status === "approved" || status === "pass") &&
    issues.length === 0 &&
    scoreGatePassed;

  return {
    finalQaFeedback: JSON.stringify(
      {
        ...review,
        status: approved ? "approved" : "revision_required",
        issues,
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
        svgIllustrations: state.svgIllustrations,
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

const svgRequirements = `
VISUAL STYLE:
Create a hand-drawn 2D cartoon explainer illustration.

REFERENCE STYLE:
- Warm storybook appearance.
- Organic cartoon shapes.
- Thick black outlines.
- Muted earthy colors.
- Detailed illustrated environments.
- Expressive stickman characters.
- Natural interaction between characters and props.

CHARACTER RULES:
- Head radius: exactly 58px.
- Head fill: #FFFFFF.
- Head stroke: #1A1A1A.
- Head stroke width: 6px.
- Character body and limb strokes: 6px.
- Eyebrow strokes: 4px.
- Prop strokes: 5px or 6px.

COMPOSITION:
- Artwork-only viewBox: 0 0 1080 1130.
- Compose to fit the central artwork zone on the final 1080x1920 card.
- Do not include title, captions, labels, lettering, or typography; those are added programmatically.

SVG STRUCTURE:
1. background
2. midground
3. characters and props

TECHNICAL RESTRICTIONS:
- No filters.
- No gradients.
- No scripts.
- No external URLs.
- No image elements.
- No style elements.
- No style attributes.
- Valid XML.
- Maximum 150 KB.

PRESERVE:
- Approved storyboard.
- Character identity.
- Scene meaning.
- Visual continuity.
`;
