import { FilmState } from "./workflow.state.js";
import { groundResearchDossier, normalizeSourceMaterials } from "../lib/source-grounding.js";

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

const isProviderQuotaError = (error: unknown) =>
  /\b429\b|RESOURCE_EXHAUSTED|quota exceeded|rate.?limit/i.test(String(error));

function fallbackComposition(scenes: any[]) {
  return scenes.map((scene) => ({
    sceneId: scene.sceneId,
    compositionType: ["character-and-environment","top-bottom-comparison","foreground-background-contrast","line-chart","process-flow","cutaway-magnifier"].includes(scene.compositionType) ? scene.compositionType : "character-and-environment",
    primarySubject: {
      element: scene.primarySubject || scene.visualMetaphor || scene.centralIdea || "Central subject",
      position: "center",
      coordinates: { x: 50, y: 43 },
      relativeSize: "large",
      depth: "midground",
      visualPriority: 1,
    },
    elements: (scene.supportingElements || []).slice(0, 5).map((element: string, i: number) => ({
      element, position: i % 2 ? "right" : "left",
      coordinates: { x: i % 2 ? 76 : 24, y: 35 + i * 8 },
      relativeSize: "small", depth: "foreground", visualPriority: i + 2,
      relationship: "Supports the scene's central idea",
    })),
    visualHierarchy: ["primary subject", "supporting elements"],
    visualFlow: "Move attention from the central subject to supporting elements.",
    negativeSpace: "Keep header and caption bands clear.",
    safeZones: { headerSafeZone: "0-14%", artworkZone: "15-74%", captionSafeZone: "75-100%" },
  }));
}


// Release thresholds (env-overridable so they can be tuned without code changes).
// QA's ten creative dimensions are scored 1-10. Translate legacy 0-100
// environment overrides to the same 1-10 scale; the default target is 8.5/10.
const configuredQualityMinimum = envNumber("QA_MIN_QUALITY", 85);
const QUALITY_MIN = configuredQualityMinimum > 10
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
- Call an agent and parse its JSON. A truncated or fenced/garbled reply is retried once with an explicit
- repair instruction instead of crashing the whole (expensive) workflow.
 */
async function callJson<T = any>(
  agent: string,
  run: (input: string) => Promise<string>,
  input: string,
  retries = 1,
): Promise<{ raw: string; data: T }> {
  let prompt = input;
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const raw = await run(prompt);
    try {
      return { raw, data: parseAgentJson<T>(raw) };
    } catch (error) {
      lastError = error;
      const reason = shortReason(error);
      logEvent("agent.json_parse_failed", {
        agent,
        attempt: attempt + 1,
        reason,
      });
      prompt = `${input}\n\nYOUR PREVIOUS RESPONSE COULD NOT BE PARSED AS JSON (${reason}). Return ONLY one complete, valid JSON value: no markdown fences, no commentary, no truncation, no trailing commas.`;
    }
  }
  throw lastError;
}

/** State may hold either raw agent strings (old runs) or parsed objects (new runs). */
function asObject<T = any>(value: unknown): T {
  return (typeof value === "string" ? parseAgentJson<T>(value) : value) as T;
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
  const directorInput = JSON.stringify({
    topic: state.topic,
    researchDossier: state.researchDossier,
    explanationStrategy: state.explanationStrategy,
  });
  const { data } = await callJson(
    "director",
    directorAgent,
    withFeedback(directorInput, state, "brief"),
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

export async function storyboardNode(state: typeof FilmState.State) {
  // The storyboard skill needs the brief (beatMap, analogyMap, conceptsToCover) as well as the script.
  const input = JSON.stringify({
    researchDossier: state.researchDossier,
    explanationStrategy: state.explanationStrategy,
    factCheckReport: state.factCheckReport,
    comprehensionReport: state.comprehensionReport,
    creativeBrief: asObject(state.creativeBrief),
    script: asObject(state.script),
  });

  const { raw, data } = await callJson<Storyboard>(
    "storyboard",
    storyboardAgent,
    withFeedback(input, state, "storyboard"),
  );

  if (!Array.isArray(data?.scenes)) {
    throw new Error(
      "Storyboard Agent must return a JSON object containing a scenes array.",
    );
  }

  return { storyboard: raw, scenes: data.scenes };
}

/**
- Art direction is not part of the QA package, so it runs once, AFTER QA passes (see workflow.graph.ts),
- instead of on every revision pass. A failure here must not discard an otherwise approved package.
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

  let raw = "";
  let parsed: { compositionPlan?: any[] } | any[] = [];
  try {
    ({ raw, data: parsed } = await callJson<
      { compositionPlan?: any[] } | any[]
    >("composition", compositionPlannerAgent, withFeedback(input, state, "composition")));
  } catch (error) {
    if (!isProviderQuotaError(error)) throw error;
    logEvent("composition.fallback", { reason: "Gemini quota exhausted; using deterministic scene layout." });
    parsed = fallbackComposition(state.scenes);
  }
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

export async function continuityNode(state: typeof FilmState.State) {
  const input = JSON.stringify({
    storyboard: state.storyboard,
    compositionPlan: state.compositionPlan,
  });
  try {
    const { data } = await callJson(
      "continuity", continuityAgent, withFeedback(input, state, "continuity"),
    );
    return { productionBible: data };
  } catch (error) {
    if (!isProviderQuotaError(error)) throw error;
    logEvent("continuity.fallback", { reason: "Gemini quota exhausted; using storyboard-derived visual identity." });
    let storyboard: any = {};
    try { storyboard = JSON.parse(state.storyboard || "{}"); } catch {}
    return { productionBible: {
      videoTitle: storyboard.videoTitle || "PARADOX OF PROGRESS",
      aspectRatio: "9:16",
      palette: { background: "#F9F8F4", ink: "#111111", red: "#C81D11", green: "#2E7D32", ochre: "#D9B66F", sage: "#A8B9A0" },
      drawingStyle: { medium: "minimalist flat 2D vector explainer cartoon", outline: "#111111", strokeWidth: 6 },
      characters: state.scenes.flatMap((x: any) => x.characters || []),
      propsAndSymbols: [],
      cardTemplate: { headerSafeZone: "0-14%", artworkZone: "15-74%", captionSafeZone: "75-100%" },
      captionRules: { header: "uppercase", line1: "black", line2: "crimson" },
    } };
  }
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

  let parsed: { imagePrompts?: any[] } | any[] = [];
  try {
    ({ data: parsed } = await callJson<{ imagePrompts?: any[] } | any[]>(
      "visualDirector", visualDirectorAgent, withFeedback(input, state, "visualPrompts"),
    ));
  } catch (error) {
    if (!isProviderQuotaError(error)) throw error;
    logEvent("visualDirector.fallback", { reason: "Gemini quota exhausted; creating prompts from approved storyboard." });
    parsed = state.scenes.map((scene: any) => ({
      sceneId: scene.sceneId, assetType: "central-artwork",
      prompt: [scene.visualPurpose, scene.visualMetaphor, scene.primarySubject, ...(scene.supportingElements || [])].filter(Boolean).join(". "),
      negativePrompt: "photorealism, 3D, rendered words, watermark, clutter",
      requiredElements: [scene.primarySubject, ...(scene.supportingElements || [])].filter(Boolean),
      mustNotInclude: ["watermarks", "unapproved text"],
      textOverlays: {},
    }));
  }
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
      svg: renderSceneSvg(matchingScene, state.productionBible?.videoTitle || "PARADOX OF PROGRESS"),
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
    // A model cannot approve a package simply because a reviewer returned an incomplete response.
    if (factReport.status === "incomplete" || factReport.status === "error") {
      reviewGates.push({
        gate: "epistemic",
        sceneId: null,
        problem: `Fact-check reviewer returned an incomplete response (status: ${factReport.status}).`,
        requiredFix:
          "Ensure the fact-check agent completes its review successfully.",
      });
    }

    // Critical factual errors always block publication.
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

    // Material issues block publication unless explicitly marked resolved.
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

  // Missing comprehension reports block publication.
  if (!comprehension || Object.keys(comprehension).length === 0) {
    reviewGates.push({
      gate: "storyCraft",
      sceneId: null,
      problem: "Missing comprehension report.",
      requiredFix:
        "Run the comprehension agent to generate a comprehension report before publication.",
    });
  } else {
    // A model cannot approve a package simply because a reviewer returned an incomplete response.
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

    const blockingGaps = asArray(comprehension.blockingGaps);
    if (
      comprehension.status === "revise" ||
      Number(comprehension.score ?? 100) < COMPREHENSION_MIN ||
      blockingGaps.length > 0
    ) {
      const before = reviewGates.length;
      for (const item of blockingGaps) {
        reviewGates.push({
          gate: "storyCraft",
          sceneId: null,
          problem: asText(item),
          requiredFix: "Revise to close the beginner comprehension gap.",
        });
      }
      if (reviewGates.length === before) {
        reviewGates.push({
          gate: "storyCraft",
          sceneId: null,
          problem:
            comprehension.summary ??
            `Comprehension score below threshold (${comprehension.score ?? "unknown"}/100).`,
        });
      }
    }
  }

  const rawQualityAverage =
    qa?.creativeScores?.average ?? qa?.storytellingScores?.average;
  const rawQualityNumber = Number(rawQualityAverage);
  const qualityAverage =
    Number.isFinite(rawQualityNumber) && rawQualityNumber > 10 && rawQualityNumber <= 100
      ? rawQualityNumber / 10
      : rawQualityNumber;
  if (!qa) {
    // gate "judgment" is never routed to a stage: re-running the script cannot fix a failed judge call.
    reviewGates.push({
      gate: "judgment",
      sceneId: null,
      problem:
        "Independent LLM QA did not complete; release cannot be approved from deterministic checks alone.",
    });
  } else if (!Number.isFinite(qualityAverage)) {
    reviewGates.push({
      gate: "storyCraft",
      sceneId: null,
      problem:
        "QA did not return a valid creative quality average on a 1-10 or legacy 0-100 scale; release score is unavailable.",
      requiredFix:
        "Return the arithmetic mean in creativeScores.average on the 1-10 scale.",
    });
  } else if (qualityAverage < QUALITY_MIN) {
    reviewGates.push({
      gate: "storyCraft",
      sceneId: null,
      problem: `Creative quality average ${qualityAverage}/10 is below the ${QUALITY_MIN}/10 release target.`,
      requiredFix: "Improve the lowest-scoring dimensions and rerun QA.",
    });
  }

  // ---- Mechanical status: any blocking issue (either layer) or an explicit "revise" wins. ----
  const blocking = [
    ...validatorReport.blockingIssues,
    ...llmBlocking,
    ...reviewGates,
  ];
  const status: "pass" | "revise" =
    blocking.length > 0 || llmStatus === "revise" ? "revise" : "pass";

  // ---- Where to restart: the earliest stage with a defect, from EVERY layer (not just the validator). ----
  const stages: Stage[] = [
    ...validatorReport.blockingIssues.map(stageForIssue),
    ...reviewGates
      .filter((g) => g.gate !== "judgment")
      .map((g) => stageForIssue(g)),
  ];
  if (llmBlocking.length > 0 || llmStatus === "revise") {
    stages.push(isStage(qa?.reviseTarget) ? qa.reviseTarget : "script");
  }
  // No stage means nothing upstream can fix it (e.g. the judge itself failed): stop instead of looping.
  const reviseTarget =
    status === "revise" && stages.length > 0
      ? earliestStage(stages)
      : undefined;

  const instructions = [
    ...(Array.isArray(qa?.revisionInstructions) ? qa.revisionInstructions : []),
    ...asArray(comprehension.revisionInstructions),
    ...asArray(factReport?.correctedClaimSuggestions),
  ].map(asText);

  const qaFeedback =
    status === "revise" ? buildFeedback(blocking, instructions) : "";

  const rawCreativeScores = qa?.creativeScores ?? qa?.storytellingScores ?? null;
  const creativeScores =
    rawCreativeScores &&
    typeof rawCreativeScores === "object" &&
    Number.isFinite(qualityAverage)
      ? { ...rawCreativeScores, average: Number(qualityAverage.toFixed(1)) }
      : rawCreativeScores;

  const report = JSON.stringify({
    status,
    reviseTarget: reviseTarget ?? null,
    timingAudit: validatorReport.computed,
    blockingIssues: blocking,
    reviewItems: validatorReport.reviewItems,
    publicationCaveats,
    factReview: qa?.factReview ?? factReport,
    comprehensionReview: comprehension,
    analogyReview: qa?.analogyReview ?? [],
    depictionReview: qa?.depictionReview ?? [],
    creativeScores,
    summary: typeof qa?.report === "string" ? qa.report : null,
    weightedQualityAverage: Number.isFinite(qualityAverage)
      ? Number((qualityAverage * 10).toFixed(1))
      : null,
    creativeQualityAverage: Number.isFinite(qualityAverage)
      ? Number(qualityAverage.toFixed(1))
      : null,
    qualityScoreScale: "1-10 arithmetic mean",
    releaseThresholds: {
      creativeQualityMinimum: QUALITY_MIN,
      weightedQualityMinimum: Number((QUALITY_MIN * 10).toFixed(1)),
      comprehensionMinimum: COMPREHENSION_MIN,
      factualCriticalErrorsAllowed: 0,
      strictSourceVerification: STRICT_SOURCE_VERIFICATION,
    },
  });

  logEvent("qa.result", {
    status,
    reviseTarget: reviseTarget ?? null,
    blocking: blocking.length,
    caveats: publicationCaveats.length,
    quality: Number.isFinite(qualityAverage) ? qualityAverage : null,
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
