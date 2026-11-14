import { FilmState } from "./workflow.state.js";

import { directorAgent } from "../agents/director.agent.js";
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

import { validatePackage } from "../skills/custom/skills/qa/validate_package.js";

function parseAgentJson<T = any>(result: string): T {
  if (typeof result !== "string" || !result.trim()) {
    throw new Error("AI agent returned an empty response.");
  }

  let cleaned = result.trim();

  cleaned = cleaned
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  const startObject = cleaned.indexOf("{");
  const startArray = cleaned.indexOf("[");

  const starts = [startObject, startArray].filter((index) => index !== -1);

  if (starts.length === 0) {
    throw new Error(`No JSON object or array found:\n${result}`);
  }

  const start = Math.min(...starts);

  const opening = cleaned[start];
  const closing = opening === "{" ? "}" : "]";

  const end = cleaned.lastIndexOf(closing);

  if (end < start) {
    throw new Error("Incomplete JSON response:\n" + result);
  }

  const jsonString = cleaned.substring(start, end + 1);

  try {
    return JSON.parse(jsonString) as T;
  } catch (error) {
    throw new Error(`Invalid JSON returned by AI agent:\n${jsonString}`, {
      cause: error,
    });
  }
}

/** State may hold either raw agent strings (old runs) or parsed objects (new runs). */
function asObject<T = any>(value: unknown): T {
  return (typeof value === "string" ? parseAgentJson<T>(value) : value) as T;
}

export async function directorNode(state: typeof FilmState.State) {
  const result = await directorAgent(withFeedback(state.topic, state, "brief"));

  // Stored as an object, not a JSON string, so every later stage and the validator read the same data.
  return {
    creativeBrief: parseAgentJson(result),
  };
}

export async function scriptNode(state: typeof FilmState.State) {
  const brief = asObject(state.creativeBrief);
  const result = await scriptwriterAgent(
    withFeedback(JSON.stringify(brief), state, "script"),
  );

  // Beats are the single source of truth: narration, word counts and duration sum are recomputed in code.
  return {
    script: normalizeScript(parseAgentJson(result)),
  };
}

export async function storyboardNode(state: typeof FilmState.State) {
  // The storyboard skill needs the brief (beatMap, analogyMap, conceptsToCover) as well as the script.
  const input = JSON.stringify({
    creativeBrief: asObject(state.creativeBrief),
    script: asObject(state.script),
  });

  const result = await storyboardAgent(
    withFeedback(input, state, "storyboard"),
  );

  const storyboardData = parseAgentJson(result);

  if (!Array.isArray(storyboardData.scenes)) {
    throw new Error(
      "Storyboard Agent must return a JSON object containing a scenes array.",
    );
  }

  return {
    storyboard: result,
    scenes: storyboardData.scenes,
  };
}

export async function visualStyleNode(state: typeof FilmState.State) {
  const result = await artDirectionAgent(
    JSON.stringify({
      compositions: state.visualPrompts,
      visualStyle: state.visualStyle,
      productionBible: state.productionBible,
    }),
  );

  return {
    visualCompositions: parseAgentJson(result),
  };
}

export async function compositionNode(state: typeof FilmState.State) {
  if (!state.scenes || state.scenes.length === 0) {
    throw new Error("Composition Planner requires structured scenes.");
  }

  const input = JSON.stringify({
    scenes: state.scenes,
    visualStyle: state.visualStyle,
  });

  const result = await compositionPlannerAgent(
    withFeedback(input, state, "composition"),
  );

  const parsed = parseAgentJson<{ compositionPlan?: any[] } | any[]>(result);
  const plan = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed?.compositionPlan)
      ? parsed.compositionPlan
      : [];

  if (plan.length === 0) {
    throw new Error(
      `Composition Planner returned an empty compositionPlan:\n${result}`,
    );
  }

  return {
    compositionPlan: plan,
  };
}

export async function continuityNode(state: typeof FilmState.State) {
  const input = JSON.stringify({
    storyboard: state.storyboard,
    compositionPlan: state.compositionPlan,
  });

  const result = await continuityAgent(
    withFeedback(input, state, "continuity"),
  );

  return {
    productionBible: parseAgentJson(result),
  };
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

  const result = await visualDirectorAgent(
    withFeedback(input, state, "visualPrompts"),
  );

  const parsed = parseAgentJson<{ imagePrompts?: any[] } | any[]>(result);
  const prompts = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed?.imagePrompts)
      ? parsed.imagePrompts
      : [];

  const lockedPrompts = prompts.map((item) => {
    const matchingScene = state.scenes.find((s) => s.sceneId === item.sceneId);
    if (!matchingScene) return item;

    return {
      ...item,
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

  return {
    visualPrompts: lockedPrompts,
  };
}

export async function qaNode(state: typeof FilmState.State) {
  // ---- Layer 1: deterministic validation in code. The model cannot override this. ----
  const pkg = {
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
    const raw = await qaAgent(
      JSON.stringify({ package: pkg, validatorReport }),
    );
    qa = parseAgentJson(raw);
  } catch (error) {
    // A flaky judge must not crash the pipeline; the validator alone still decides.
    console.error(
      "QA judgment layer failed, using validator result only:",
      error,
    );
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

  // ---- Mechanical status: any blocking issue (either layer) or an explicit "revise" wins. ----
  const blocking = [...validatorReport.blockingIssues, ...llmBlocking];
  const status: "pass" | "revise" =
    blocking.length > 0 || llmStatus === "revise" ? "revise" : "pass";

  const stages: Stage[] = validatorReport.blockingIssues.map(stageForIssue);
  if (
    isStage(qa?.reviseTarget) &&
    (llmBlocking.length > 0 || llmStatus === "revise")
  ) {
    stages.push(qa.reviseTarget);
  }
  const reviseTarget = status === "revise" ? earliestStage(stages) : undefined;

  const qaFeedback =
    status === "revise"
      ? buildFeedback(
          blocking,
          Array.isArray(qa?.revisionInstructions)
            ? qa.revisionInstructions
            : [],
        )
      : "";

  const report = JSON.stringify({
    status,
    reviseTarget: reviseTarget ?? null,
    timingAudit: validatorReport.computed,
    blockingIssues: blocking,
    reviewItems: validatorReport.reviewItems,
    factReview: qa?.factReview ?? [],
    analogyReview: qa?.analogyReview ?? [],
    depictionReview: qa?.depictionReview ?? [],
    creativeScores: qa?.creativeScores ?? qa?.storytellingScores ?? null,
    summary: typeof qa?.report === "string" ? qa.report : null,
  });

  return {
    qualityReport: report,
    qualityStatus: status,
    reviseTarget,
    qaFeedback,
    validatorReport,
    revisionCount:
      status === "revise" ? state.revisionCount + 1 : state.revisionCount,
  };
}
