import { FilmState } from "./workflow.state.js";
import {
  groundResearchDossier,
  normalizeSourceMaterials,
} from "../lib/source-grounding.js";

import { directorAgent } from "../agents/director.agent.js";
import { researchAgent } from "../agents/research.agent.js";
import { strategyAgent } from "../agents/strategy.agent.js";
import { factCheckAgent } from "../agents/fact-check.agent.js";
import { comprehensionAgent } from "../agents/comprehension.agent.js";
import { scriptwriterAgent } from "../agents/scriptwriter.agent.js";
import { storyboardAgent } from "../agents/storyboard.agent.js";
import { visualDirectorAgent } from "../agents/visual-director.agent.js";
import { continuityAgent } from "../agents/continuity.agent.js";
import {
  buildFeedback,
  earliestStage,
  isStage,
  normalizeScript,
  qaAgent,
  stageForIssue,
  withFeedback,
  type Stage,
} from "../agents/QA.agent.js";
import { compositionPlannerAgent } from "../agents/compositionPlannerAgent.agent.js";
import { artDirectionAgent } from "../agents/artDirectionAgent.agent.js";
import { renderSceneSvg } from "../services/svg-renderer.service.js";

import { validatePackage } from "../skills/custom/skills/qa/validate_package.js";
import { envNumber, logEvent } from "../lib/run-context.js";
import type { Script } from "../schema/script.schema.js";
import type { Storyboard } from "../schema/storyboard.schema.js";

// Release thresholds (env-overridable so they can be tuned without code changes).
// QA's ten creative dimensions are scored 1-10. Translate legacy 0-100
// environment overrides to the same 1-10 scale; the default target is 8.5/10.
const configuredQualityMinimum = envNumber("QA_MIN_QUALITY", 85);
const QUALITY_MIN =
  configuredQualityMinimum > 10
    ? configuredQualityMinimum / 10
    : configuredQualityMinimum;
const COMPREHENSION_MIN = envNumber("QA_MIN_COMPREHENSION", 80);

// Without retrieval/grounding the research agent marks EVERY claim "verification required", and the
// fact reviewer repeats that list. A revision cannot fix it, so by default it is reported as a
// publication caveat instead of blocking (and burning) every revision pass.
const STRICT_SOURCE_VERIFICATION =
  process.env.STRICT_SOURCE_VERIFICATION === "true";

function parseAgentJson<T = any>(result: string): T {
  if (typeof result !== "string" || !result.trim()) {
    throw new Error("AI agent returned an empty response.");
  }

  const cleaned = result
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  const start = cleaned.search(/[{\[]/);

  if (start === -1) {
    throw new Error("No JSON object or array found.");
  }

  const stack: string[] = [];
  let inString = false;
  let escaped = false;

  for (let i = start; i < cleaned.length; i++) {
    const char = cleaned[i];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === "{" || char === "[") {
      stack.push(char);
    } else if (char === "}" || char === "]") {
      const opening = stack.pop();

      if (
        (char === "}" && opening !== "{") ||
        (char === "]" && opening !== "[")
      ) {
        throw new Error("Mismatched JSON brackets.");
      }

      if (stack.length === 0) {
        try {
          return JSON.parse(cleaned.slice(start, i + 1)) as T;
        } catch (error) {
          throw new Error("Invalid JSON returned by AI agent.", {
            cause: error,
          });
        }
      }
    }
  }

  throw new Error("Incomplete JSON response: model output was truncated.");
}

/** Model-produced JSON fields are untrusted: some models emit false/null instead of []. */
function asArray<T = any>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function shortReason(error: unknown): string {
  const cause = (error as { cause?: unknown } | undefined)?.cause;
  const msg =
    cause instanceof Error
      ? cause.message
      : String(error instanceof Error ? error.message : error);
  return msg.split("\n")[0]!.slice(0, 200);
}

/**
 * Call an agent and parse its JSON. A truncated or fenced/garbled reply is retried once with an explicit
 * repair instruction instead of crashing the whole (expensive) workflow.
 */
async function callJson<T = any>(
  agent: string,
  run: (input: string) => Promise<string>,
  input: string,
  retries = 2,
  validate?: (data: T) => void,
  normalize?: (data: any) => T,
): Promise<{ raw: string; data: T }> {
  let prompt = input;
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const raw = await run(prompt);
    try {
      const parsed = parseAgentJson<T>(raw);
      // Deterministic repair of fields the application owns (see reconcileStoryboardBatch).
      // Runs before validation, so validation checks the final, repaired artifact.
      const data = normalize ? normalize(parsed) : parsed;
      // JSON syntax alone is not enough: a response such as {} is valid JSON
      // but is not a usable artifact. Run stage-specific contract checks here
      // so malformed-but-parseable output receives the same repair attempts.
      validate?.(data);
      return { raw, data };
    } catch (error) {
      lastError = error;
      const reason = shortReason(error);
      logEvent("agent.json_parse_failed", {
        agent,
        attempt: attempt + 1,
        reason,
      });
      prompt = `${input}

IMPORTANT: Your previous response was invalid or did not satisfy the required output contract.
Validation/parsing error: ${reason}

Generate the complete response again. Do not return an empty object, an empty array,
or a partial placeholder.

STRICT REQUIREMENTS:
1. Return ONLY valid JSON, with the exact top-level structure requested.
2. Do not use Markdown code fences or explanations outside JSON.
3. Include every required field and every required array.
4. Preserve source narration, IDs, captions, and durations exactly where the contract requires it.
5. Use only enum values explicitly listed in the supplied contract.
6. Close every object and array; do not use trailing commas.
7. Keep descriptions concise enough to complete the entire artifact.

Return one complete JSON object.`;
    }
  }
  throw lastError;
}

/** State may hold either raw agent strings (old runs) or parsed objects (new runs). */
function asObject<T = any>(value: unknown): T {
  return (typeof value === "string" ? parseAgentJson<T>(value) : value) as T;
}

function getAdaptiveBatchSize(totalScenes: number): number {
  if (process.env.STORYBOARD_BATCH_SIZE) {
    return Math.max(
      1,
      Math.min(4, Math.floor(Number(process.env.STORYBOARD_BATCH_SIZE))),
    );
  }
  if (totalScenes <= 6) return 2;
  if (totalScenes <= 15) return 3;
  return 4;
}

export async function researchNode(state: typeof FilmState.State) {
  // Normalize source records once, then deterministically validate every model citation.
  const suppliedSources = normalizeSourceMaterials(state.sourceMaterials ?? []);
  const { data } = await callJson(
    "research",
    researchAgent,
    JSON.stringify({
      topic: state.topic,
      suppliedSources,
      audience: state.audience ?? "curious beginner",
    }),
  );
  return { researchDossier: groundResearchDossier(data, suppliedSources) };
}

export async function strategyNode(state: typeof FilmState.State) {
  const { data } = await callJson(
    "strategy",
    strategyAgent,
    JSON.stringify({
      topic: state.topic,
      researchDossier: state.researchDossier,
    }),
  );
  return { explanationStrategy: data };
}

export async function directorNode(state: typeof FilmState.State) {
  const basePayload = {
    topic: state.topic,
    researchDossier: state.researchDossier,
    explanationStrategy: state.explanationStrategy,
  };
  const directorPrompt = withFeedback(
    JSON.stringify(basePayload),
    state,
    "brief",
  );

  const { data } = await callJson(
    "director",
    (prompt: string) => {
      // Safely bridge string-based callJson retries with directorAgent's structured input
      try {
        const parsed = JSON.parse(prompt);
        return directorAgent(parsed);
      } catch {
        return directorAgent({
          ...basePayload,
          feedback: prompt,
        } as any);
      }
    },
    directorPrompt,
  );

  // Stored as an object, not a JSON string, so every later stage and the validator read the same data.
  return { creativeBrief: data };
}

export async function scriptNode(state: typeof FilmState.State) {
  const brief = asObject(state.creativeBrief);
  const { data } = await callJson<Script>(
    "scriptwriter",
    scriptwriterAgent,
    withFeedback(
      JSON.stringify({
        creativeBrief: brief,
        researchDossier: state.researchDossier,
        explanationStrategy: state.explanationStrategy,
      }),
      state,
      "script",
    ),
  );

  // Beats are the single source of truth: narration, word counts and duration sum are recomputed in code.
  return { script: normalizeScript(data) };
}

export async function factCheckNode(state: typeof FilmState.State) {
  const { data } = await callJson(
    "factCheck",
    factCheckAgent,
    JSON.stringify({
      topic: state.topic,
      researchDossier: state.researchDossier,
      explanationStrategy: state.explanationStrategy,
      script: asObject(state.script),
    }),
  );
  return { factCheckReport: data };
}

export async function comprehensionNode(state: typeof FilmState.State) {
  const { data } = await callJson(
    "comprehension",
    comprehensionAgent,
    JSON.stringify({
      topic: state.topic,
      researchDossier: state.researchDossier,
      explanationStrategy: state.explanationStrategy,
      script: asObject(state.script),
    }),
  );
  return { comprehensionReport: data };
}

const STORYBOARD_COMPOSITION_TYPES = new Set([
  "character-and-environment",
  "top-bottom-comparison",
  "foreground-background-contrast",
  "line-chart",
  "process-flow",
  "cutaway-magnifier",
]);

/**
 * Validate semantic storyboard requirements, not just JSON syntax.
 * This prevents parseable placeholders such as {} from reaching workflow state.
 */
function validateStoryboardOutput(data: Storyboard, script: Script): void {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("Storyboard must be a JSON object.");
  }
  if (!Array.isArray(data.scenes)) {
    throw new Error("Storyboard must contain a scenes array.");
  }
  if (!Array.isArray(script.beats) || script.beats.length === 0) {
    throw new Error("Normalized script must contain at least one beat.");
  }
  if (data.scenes.length !== script.beats.length) {
    throw new Error(
      `Storyboard scene count (${data.scenes.length}) must equal script beat count (${script.beats.length}).`,
    );
  }
  if (data.videoTitle !== script.title) {
    throw new Error("Storyboard videoTitle must exactly match script.title.");
  }
  if (data.oneIdea !== script.oneIdea) {
    throw new Error("Storyboard oneIdea must exactly match script.oneIdea.");
  }
  if (data.aspectRatio !== "9:16") {
    throw new Error('Storyboard aspectRatio must be "9:16".');
  }
  if (!Array.isArray(data.upstreamIssues)) {
    throw new Error("Storyboard upstreamIssues must be an array.");
  }
  if (
    !data.cardTemplate ||
    typeof data.cardTemplate !== "object" ||
    !data.cardTemplate.headerPosition ||
    !data.cardTemplate.artworkPosition ||
    !data.cardTemplate.captionPosition
  ) {
    throw new Error("Storyboard cardTemplate is missing a required position.");
  }

  for (let index = 0; index < script.beats.length; index++) {
    const beat = script.beats[index]!;
    const scene = data.scenes[index] as any;
    const label = `Scene ${index + 1}`;

    if (!scene || typeof scene !== "object" || Array.isArray(scene)) {
      throw new Error(`${label} must be an object.`);
    }
    if (scene.sceneId !== beat.cardNumber) {
      throw new Error(
        `${label} sceneId must equal source beat cardNumber ${beat.cardNumber}.`,
      );
    }
    if (
      !Array.isArray(scene.sourceBeatIds) ||
      scene.sourceBeatIds.length !== 1 ||
      scene.sourceBeatIds[0] !== beat.beatId
    ) {
      throw new Error(
        `${label} sourceBeatIds must contain only ${beat.beatId}.`,
      );
    }
    if (scene.narration !== beat.narration) {
      throw new Error(
        `${label} narration must exactly match beat ${beat.beatId}.`,
      );
    }
    if (scene.estimatedDurationSeconds !== beat.estimatedDurationSeconds) {
      throw new Error(
        `${label} duration must exactly match beat ${beat.beatId}.`,
      );
    }
    const caption = scene.caption;
    if (
      !caption ||
      caption.line1 !== beat.suggestedCaption?.line1 ||
      (caption.line2 ?? undefined) !==
        (beat.suggestedCaption?.line2 ?? undefined) ||
      (caption.redEmphasis ?? undefined) !==
        (beat.suggestedCaption?.redEmphasis ?? undefined)
    ) {
      throw new Error(
        `${label} caption must exactly copy beat ${beat.beatId} suggestedCaption.`,
      );
    }
    if (scene.isAhaCard !== Boolean(beat.isAhaCard)) {
      throw new Error(`${label} isAhaCard must match beat ${beat.beatId}.`);
    }
    if (!scene.centralIdea || !scene.visualPurpose || !scene.primarySubject) {
      throw new Error(
        `${label} is missing centralIdea, visualPurpose, or primarySubject.`,
      );
    }
    if (!STORYBOARD_COMPOSITION_TYPES.has(scene.compositionType)) {
      throw new Error(`${label} has an unsupported compositionType.`);
    }
    if (
      !Array.isArray(scene.supportingElements) ||
      !Array.isArray(scene.characters)
    ) {
      throw new Error(
        `${label} supportingElements and characters must be arrays.`,
      );
    }
    if (
      !scene.programmaticOverlays ||
      !Array.isArray(scene.programmaticOverlays.diagramLabels)
    ) {
      throw new Error(
        `${label} programmaticOverlays.diagramLabels must be an array.`,
      );
    }
    if (
      typeof scene.headerText !== "string" ||
      scene.headerText !== script.title
    ) {
      throw new Error(
        `${label} headerText must exactly match the video title.`,
      );
    }
    if (typeof scene.transitionToNext !== "string") {
      throw new Error(`${label} transitionToNext must be a string.`);
    }
  }
}

/**
 * Facts belong to the script, not the model. A small local model often paraphrases the title or
 * one-idea, or drifts a narration string, and then the whole batch is rejected and regenerated
 * (each attempt costs minutes on CPU). Here the application writes every script-owned field from
 * the beats. Only creative fields remain model-owned, and the validator checks those.
 */
function reconcileStoryboardBatch(
  candidate: any,
  batchScript: Script,
): Storyboard {
  if (
    !candidate ||
    typeof candidate !== "object" ||
    !Array.isArray(candidate.scenes)
  ) {
    // Leave malformed shapes untouched so validateStoryboardOutput rejects them with a clear reason.
    return candidate as Storyboard;
  }

  const scenes = candidate.scenes.map((scene: any, index: number) => {
    const beat = batchScript.beats[index];
    if (!scene || typeof scene !== "object" || !beat) return scene;

    return {
      ...scene,
      // Script-owned fields.
      sceneId: beat.cardNumber,
      sourceBeatIds: [beat.beatId],
      narration: beat.narration,
      estimatedDurationSeconds: beat.estimatedDurationSeconds,
      isAhaCard: Boolean(beat.isAhaCard),
      headerText: batchScript.title,
      caption: {
        line1: beat.suggestedCaption?.line1,
        line2: beat.suggestedCaption?.line2 ?? undefined,
        redEmphasis: beat.suggestedCaption?.redEmphasis ?? undefined,
      },
      // Optional or structural fields: default them so a model that omits them is not rejected.
      visualMetaphor: scene.visualMetaphor ?? null,
      analogyRelationShown: scene.analogyRelationShown ?? null,
      echoesScene: scene.echoesScene ?? null,
      supportingElements: asArray(scene.supportingElements),
      characters: asArray(scene.characters),
      programmaticOverlays: {
        diagramLabels: asArray(scene.programmaticOverlays?.diagramLabels),
      },
      transitionToNext:
        typeof scene.transitionToNext === "string"
          ? scene.transitionToNext
          : "",
    };
  });

  return {
    ...candidate,
    videoTitle: batchScript.title,
    oneIdea: batchScript.oneIdea,
    aspectRatio: "9:16",
    upstreamIssues: Array.isArray(candidate.upstreamIssues)
      ? candidate.upstreamIssues
      : [],
    scenes,
  } as Storyboard;
}

export async function storyboardNode(state: typeof FilmState.State) {
  const fullBrief = asObject<Record<string, any>>(state.creativeBrief);
  const normalizedScript = asObject<Script>(state.script);

  if (
    !normalizedScript ||
    !Array.isArray(normalizedScript.beats) ||
    normalizedScript.beats.length === 0
  ) {
    throw new Error(
      "Storyboard requires a normalized script with at least one beat.",
    );
  }

  if (!normalizedScript.title || !normalizedScript.oneIdea) {
    throw new Error(
      "Storyboard requires script.title and script.oneIdea before generation.",
    );
  }

  // Keep the director-owned visual guidance, but do not send research and reviewer
  // reports that have already been processed by their own pipeline stages.
  const compactBrief = {
    videoTitle: fullBrief.videoTitle ?? normalizedScript.title,
    oneIdea: fullBrief.oneIdea ?? normalizedScript.oneIdea,
    domainClassification: fullBrief.domainClassification,
    mechanism: fullBrief.mechanism,
    conceptsToCover: fullBrief.conceptsToCover,
    analogyMap: Array.isArray(fullBrief.analogyMap) ? fullBrief.analogyMap : [],
    whereAnalogyBreaks: fullBrief.whereAnalogyBreaks,
    protagonist: fullBrief.protagonist,
    visualStrategy: fullBrief.visualStrategy,
    beatMap: Array.isArray(fullBrief.beatMap) ? fullBrief.beatMap : [],
  };

  const batchSize = getAdaptiveBatchSize(normalizedScript.beats.length);

  const batches: Script["beats"][] = [];
  for (
    let index = 0;
    index < normalizedScript.beats.length;
    index += batchSize
  ) {
    batches.push(normalizedScript.beats.slice(index, index + batchSize));
  }

  const completed: Storyboard[] = [];
  let previousBatchContext:
    | {
        lastSceneId: number;
        primarySubject: string;
        characters: unknown[];
        supportingElements: string[];
        visualStyle: string;
      }
    | undefined;

  for (let index = 0; index < batches.length; index++) {
    const batchBeats = batches[index]!;
    const batchBeatIds = new Set(batchBeats.map((beat) => beat.beatId));
    const batchCardNumbers = new Set(batchBeats.map((beat) => beat.cardNumber));

    const matchingBeatMap = compactBrief.beatMap.filter((entry: any) => {
      if (!entry || typeof entry !== "object") return true;

      const id = entry.beatId ?? entry.id;
      if (typeof id === "string") return batchBeatIds.has(id);

      const cardNumber = entry.cardNumber ?? entry.sceneId;
      if (Number.isInteger(cardNumber)) {
        return batchCardNumbers.has(cardNumber);
      }

      return true;
    });

    // A batch's narration and duration must describe only its own beats. Retaining the
    // full-script values here would waste context and confuse models about batch scope.
    const batchWordCount = batchBeats.reduce(
      (total, beat) =>
        total +
        (typeof beat.wordCount === "number"
          ? beat.wordCount
          : (beat.narration.match(/[A-Za-z0-9]+(?:['’\-][A-Za-z0-9]+)*/g) ?? [])
              .length),
      0,
    );
    const batchDuration = Number(
      batchBeats
        .reduce(
          (total, beat) => total + Number(beat.estimatedDurationSeconds || 0),
          0,
        )
        .toFixed(2),
    );

    const batchScript: Script = {
      ...normalizedScript,
      beats: batchBeats,
      narration: batchBeats.map((beat) => beat.narration).join(" "),
      totalWordCount: batchWordCount,
      estimatedDurationSeconds: batchDuration,
      durationSumCheck: batchDuration,
    };

    const batchBrief = {
      ...compactBrief,
      beatMap: matchingBeatMap,
    };

    const input = JSON.stringify({
      batch: {
        index: index + 1,
        total: batches.length,
        firstSceneId: batchBeats[0]!.cardNumber,
        lastSceneId: batchBeats[batchBeats.length - 1]!.cardNumber,
        instruction:
          "Create scenes only for the beats in this batch. Do not invent scenes for other beats.",
      },
      creativeBrief: batchBrief,
      script: batchScript,
      previousBatchContext,
    });

    logEvent("storyboard.batch.start", {
      batch: index + 1,
      total: batches.length,
      scenes: batchBeats.length,
      firstSceneId: batchBeats[0]!.cardNumber,
      lastSceneId: batchBeats[batchBeats.length - 1]!.cardNumber,
      inputChars: input.length,
    });

    const { data } = await callJson<Storyboard>(
      `storyboard-batch-${index + 1}`,
      storyboardAgent,
      withFeedback(input, state, "storyboard"),
      1,
      (candidate) => validateStoryboardOutput(candidate, batchScript),
      (candidate) => reconcileStoryboardBatch(candidate, batchScript),
    );

    completed.push(data);

    const lastScene = data.scenes[data.scenes.length - 1]!;
    previousBatchContext = {
      lastSceneId: lastScene.sceneId,
      primarySubject: lastScene.primarySubject,
      characters: lastScene.characters,
      supportingElements: lastScene.supportingElements,
      visualStyle: data.videoStyle,
    };

    logEvent("storyboard.batch.success", {
      batch: index + 1,
      total: batches.length,
      scenes: data.scenes.length,
      outputChars: JSON.stringify(data).length,
    });
  }

  if (completed.length !== batches.length || completed.length === 0) {
    throw new Error(
      `Storyboard generation incomplete: received ${completed.length} of ${batches.length} batches.`,
    );
  }

  const first = completed[0]!;
  const merged: Storyboard = {
    ...first,
    videoTitle: normalizedScript.title,
    oneIdea: normalizedScript.oneIdea,
    aspectRatio: "9:16",
    scenes: completed.flatMap((batch) => batch.scenes),
    upstreamIssues: completed
      .flatMap((batch) => batch.upstreamIssues ?? [])
      .filter(
        (issue, index, all) =>
          all.findIndex(
            (candidate) => JSON.stringify(candidate) === JSON.stringify(issue),
          ) === index,
      ),
  };

  // Detect duplicate/missing IDs and ordering mistakes before writing to graph state.
  validateStoryboardOutput(merged, normalizedScript);

  const sceneIds = merged.scenes.map((scene) => scene.sceneId);
  if (new Set(sceneIds).size !== sceneIds.length) {
    throw new Error("Merged storyboard contains duplicate scene IDs.");
  }

  const raw = JSON.stringify(merged);
  logEvent("storyboard.complete", {
    batches: batches.length,
    scenes: merged.scenes.length,
    chars: raw.length,
  });

  return { storyboard: raw, scenes: merged.scenes };
}

/**
 * Art direction is not part of the QA package, so it runs once, AFTER QA passes (see workflow.graph.ts),
 * instead of on every revision pass. A failure here must not discard an otherwise approved package.
 */
export async function visualStyleNode(state: typeof FilmState.State) {
  try {
    const { data } = await callJson(
      "artDirection",
      artDirectionAgent,
      JSON.stringify({
        compositions: state.visualPrompts,
        visualStyle: state.visualStyle,
        productionBible: state.productionBible,
      }),
    );
    return { visualCompositions: data };
  } catch (error) {
    logEvent("artDirection.failed", { reason: shortReason(error) });
    return { visualCompositions: null };
  }
}

export async function compositionNode(state: typeof FilmState.State) {
  if (!state.scenes || state.scenes.length === 0) {
    throw new Error("Composition Planner requires structured scenes.");
  }

  const input = JSON.stringify({
    scenes: state.scenes,
    visualStyle: state.visualStyle,
  });

  const { raw, data: parsed } = await callJson<
    { compositionPlan?: any[] } | any[]
  >(
    "composition",
    compositionPlannerAgent,
    withFeedback(input, state, "composition"),
  );
  const plan = Array.isArray(parsed)
    ? parsed
    : Array.isArray((parsed as any)?.compositionPlan)
      ? (parsed as any).compositionPlan
      : [];

  if (plan.length === 0) {
    throw new Error(
      `Composition Planner returned an empty compositionPlan:\n${raw}`,
    );
  }

  return { compositionPlan: plan };
}

/**
 * Runs in parallel with compositionNode after storyboardNode.
 * Uses storyboard and visualStyle directly rather than compositionPlan so there is no data dependency.
 */
export async function continuityNode(state: typeof FilmState.State) {
  const input = JSON.stringify({
    storyboard: state.storyboard,
    visualStyle: state.visualStyle,
  });
  const { data } = await callJson(
    "continuity",
    continuityAgent,
    withFeedback(input, state, "continuity"),
  );
  return { productionBible: data };
}

export async function visualNode(state: typeof FilmState.State) {
  if (!state.compositionPlan || state.compositionPlan.length === 0) {
    throw new Error("Visual Director requires a populated compositionPlan.");
  }

  const input = JSON.stringify({
    storyboard: state.storyboard,
    compositionPlan: state.compositionPlan,
    productionBible: state.productionBible,
  });

  const { data: parsed } = await callJson<{ imagePrompts?: any[] } | any[]>(
    "visualDirector",
    visualDirectorAgent,
    withFeedback(input, state, "visualPrompts"),
  );
  const prompts = Array.isArray(parsed)
    ? parsed
    : Array.isArray((parsed as any)?.imagePrompts)
      ? (parsed as any).imagePrompts
      : [];

  // Overlay text is locked to the storyboard so the model can never rewrite captions.
  const lockedPrompts = prompts.map((item: any) => {
    const matchingScene = state.scenes.find((s) => s.sceneId === item.sceneId);
    if (!matchingScene) return item;

    return {
      ...item,
      svg: renderSceneSvg(
        matchingScene,
        state.productionBible?.videoTitle || "PARADOX OF PROGRESS",
      ),
      textOverlays: {
        header: matchingScene.headerText ?? item.textOverlays?.header ?? null,
        captionLine1:
          matchingScene.caption?.line1 ??
          item.textOverlays?.captionLine1 ??
          null,
        captionLine2:
          matchingScene.caption?.line2 ??
          item.textOverlays?.captionLine2 ??
          null,
        redEmphasis:
          matchingScene.caption?.redEmphasis ??
          item.textOverlays?.redEmphasis ??
          null,
        diagramLabels:
          matchingScene.programmaticOverlays?.diagramLabels ??
          item.textOverlays?.diagramLabels ??
          [],
      },
    };
  });

  return { visualPrompts: lockedPrompts };
}

const asText = (item: unknown): string =>
  typeof item === "string" ? item : JSON.stringify(item);

export async function qaNode(state: typeof FilmState.State) {
  // ---- Layer 1: deterministic validation in code. The model cannot override this. ----
  const pkg = {
    researchDossier: state.researchDossier,
    explanationStrategy: state.explanationStrategy,
    factCheckReport: state.factCheckReport,
    comprehensionReport: state.comprehensionReport,
    creativeBrief: asObject(state.creativeBrief),
    script: asObject(state.script),
    storyboard: asObject(state.storyboard),
    scenes: state.scenes,
    compositionPlan: state.compositionPlan,
    visualPrompts: state.visualPrompts,
    productionBible: asObject(state.productionBible),
  };

  const validatorReport = validatePackage(pkg);

  // ---- Layer 2: LLM judgment (facts, analogy fidelity, depiction, story craft). ----
  let qa: any = null;
  try {
    ({ data: qa } = await callJson(
      "qa",
      qaAgent,
      JSON.stringify({ package: pkg, validatorReport }),
    ));
  } catch (error) {
    // A flaky judge must not crash the pipeline; the validator alone still decides.
    logEvent("qa.judgment_failed", { reason: shortReason(error) });
  }

  const llmStatus = qa?.status ?? qa?.qualityStatus;
  const llmIssues: any[] = Array.isArray(qa?.blockingIssues)
    ? qa.blockingIssues
    : [];
  const llmBlocking = llmIssues.map((i) => ({
    gate: i.category ?? "judgment",
    sceneId: i.sceneId ?? null,
    problem: String(i.problem ?? ""),
    requiredFix: i.requiredFix,
  }));

  // ---- Release gates built from the independent reviewers. ----
  const reviewGates: any[] = [];
  const publicationCaveats: string[] = [];
  const factReport: any = state.factCheckReport;
  const comprehension: any = state.comprehensionReport;

  // 1. Missing fact-check reports block publication.
  if (!factReport || Object.keys(factReport).length === 0) {
    reviewGates.push({
      gate: "epistemic",
      sceneId: null,
      problem: "Missing fact-check report.",
      requiredFix:
        "Run the fact-check agent to generate a fact-check report before publication.",
    });
  } else {
    if (factReport.status === "incomplete" || factReport.status === "error") {
      reviewGates.push({
        gate: "epistemic",
        sceneId: null,
        problem: `Fact-check reviewer returned an incomplete response (status: ${factReport.status}).`,
        requiredFix:
          "Ensure the fact-check agent completes its review successfully.",
      });
    }

    const criticalErrors = asArray(factReport.criticalErrors);
    for (const item of criticalErrors) {
      reviewGates.push({
        gate: "epistemic",
        sceneId:
          (typeof item === "object" && item !== null
            ? (item as any).sceneId
            : null) ?? null,
        problem: asText(
          typeof item === "object" && item !== null
            ? ((item as any).problem ?? (item as any).error ?? item)
            : item,
        ),
        requiredFix:
          "Correct critical factual errors using the research dossier.",
      });
    }

    const materialIssues = asArray(factReport.materialIssues);
    for (const item of materialIssues) {
      const isResolved =
        typeof item === "object" &&
        item !== null &&
        ((item as any).resolved === true ||
          (item as any).status === "resolved");
      if (!isResolved) {
        reviewGates.push({
          gate: "epistemic",
          sceneId:
            (typeof item === "object" && item !== null
              ? (item as any).sceneId
              : null) ?? null,
          problem: asText(
            typeof item === "object" && item !== null
              ? ((item as any).problem ?? (item as any).issue ?? item)
              : item,
          ),
          requiredFix:
            "Resolve the material factual issue or mark it explicitly as resolved.",
        });
      }
    }

    if (
      factReport.status === "revise" &&
      criticalErrors.length === 0 &&
      materialIssues.filter(
        (item) =>
          !(
            typeof item === "object" &&
            item !== null &&
            ((item as any).resolved === true ||
              (item as any).status === "resolved")
          ),
      ).length === 0
    ) {
      reviewGates.push({
        gate: "epistemic",
        sceneId: null,
        problem:
          factReport.summary ?? "Independent fact review requested revision.",
      });
    }

    for (const item of asArray(factReport.sourceVerificationRequired)) {
      if (STRICT_SOURCE_VERIFICATION) {
        reviewGates.push({
          gate: "epistemic",
          sceneId: null,
          problem: `Source verification required: ${asText(item)}`,
          requiredFix:
            "Provide and verify a reliable source before publication.",
        });
      } else {
        publicationCaveats.push(asText(item));
      }
    }
  }

  // 2. Missing or low-scoring comprehension reports block publication.
  if (!comprehension || Object.keys(comprehension).length === 0) {
    reviewGates.push({
      gate: "storyCraft",
      sceneId: null,
      problem: "Missing comprehension report.",
      requiredFix:
        "Run the comprehension agent to evaluate script clarity before publication.",
    });
  } else {
    if (
      comprehension.status === "incomplete" ||
      comprehension.status === "error"
    ) {
      reviewGates.push({
        gate: "storyCraft",
        sceneId: null,
        problem: `Comprehension reviewer returned an incomplete response (status: ${comprehension.status}).`,
        requiredFix:
          "Ensure the comprehension agent completes its review successfully.",
      });
    }

    const compScore = Number(
      comprehension.overallScore ?? comprehension.comprehensionScore ?? NaN,
    );
    if (!Number.isNaN(compScore) && compScore < COMPREHENSION_MIN) {
      reviewGates.push({
        gate: "storyCraft",
        sceneId: null,
        problem: `Comprehension score ${compScore} is below minimum threshold ${COMPREHENSION_MIN}.`,
        requiredFix:
          "Clarify confusing transitions, jargon, or pacing in the script.",
      });
    }

    for (const item of asArray(comprehension.confusionPoints)) {
      reviewGates.push({
        gate: "storyCraft",
        sceneId:
          (typeof item === "object" && item !== null
            ? (item as any).sceneId
            : null) ?? null,
        problem: asText(
          typeof item === "object" && item !== null
            ? ((item as any).problem ?? (item as any).issue ?? item)
            : item,
        ),
        requiredFix: "Resolve the viewer confusion point in the script.",
      });
    }
  }

  // 3. Deterministic package validator issues & LLM creative quality threshold.
  const validatorIssues = asArray(validatorReport?.blockingIssues);
  const dimensionValues =
    qa?.dimensions && typeof qa.dimensions === "object"
      ? Object.values(qa.dimensions)
          .map(Number)
          .filter((n) => !Number.isNaN(n))
      : [];
  const averageQuality =
    dimensionValues.length > 0
      ? dimensionValues.reduce((sum, n) => sum + n, 0) / dimensionValues.length
      : null;

  if (averageQuality !== null && averageQuality < QUALITY_MIN) {
    reviewGates.push({
      gate: "storyCraft",
      sceneId: null,
      problem: `Average creative quality score (${averageQuality.toFixed(2)}/10) is below ${QUALITY_MIN}/10.`,
      requiredFix:
        "Strengthen narrative clarity, visual metaphor, and scene pacing.",
    });
  }

  const allBlocking = [...validatorIssues, ...reviewGates, ...llmBlocking];
  const passed =
    allBlocking.length === 0 && llmStatus !== "revise" && llmStatus !== "fail";

  const candidateStages: Stage[] = allBlocking
    .map((issue) => stageForIssue(issue))
    .filter((s): s is Stage => Boolean(s));

  const explicitTarget = isStage(qa?.reviseTarget) ? qa.reviseTarget : null;
  if (explicitTarget) {
    candidateStages.push(explicitTarget);
  }

  const reviseTarget = passed
    ? null
    : (earliestStage(candidateStages) ?? "script");

  const feedback = passed ? null : buildFeedback(allBlocking, qa);

  logEvent("qa.complete", {
    passed,
    blockingCount: allBlocking.length,
    averageQuality,
    reviseTarget,
    revisionCount: (state.revisionCount ?? 0) + (passed ? 0 : 1),
  });

  return {
    qualityStatus: passed ? "pass" : "revise",
    qaReport: {
      ...(qa ?? {}),
      validatorReport,
      reviewGates,
      publicationCaveats,
      averageQuality,
      blockingIssues: allBlocking,
    },
    reviseTarget,
    revisionFeedback: feedback,
    revisionCount: passed
      ? (state.revisionCount ?? 0)
      : (state.revisionCount ?? 0) + 1,
  };
}
