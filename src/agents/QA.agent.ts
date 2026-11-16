import { runAgent } from "./base.agent.js";
import type { Script } from "../schema/script.schema.js";

export type Stage =
  | "brief"
  | "script"
  | "storyboard"
  | "composition"
  | "continuity"
  | "visualPrompts"
  | "svgIllustrations";

export const STAGE_ORDER: Stage[] = [
  "brief", "script", "storyboard", "composition", "continuity", "visualPrompts", "svgIllustrations",
];

export const STAGE_TO_NODE: Record<Stage, string> = {
  brief: "director",
  script: "scriptwriter",
  storyboard: "storyboardGenerator",
  composition: "compositionPlanner",
  continuity: "continuity",
  visualPrompts: "visualDirector",
  svgIllustrations: "svgIllustrator",
};

const configuredRevisions = Number.parseInt(process.env.MAX_REVISIONS ?? "3", 10);
export const MAX_REVISIONS = Number.isFinite(configuredRevisions)
  ? Math.max(0, Math.min(5, configuredRevisions))
  : 3;

export function isStage(value: unknown): value is Stage {
  return typeof value === "string" && STAGE_ORDER.includes(value as Stage);
}

export function earliestStage(stages: Stage[]): Stage | null {
  if (!stages.length) return null;
  return [...stages].sort((a, b) => STAGE_ORDER.indexOf(a) - STAGE_ORDER.indexOf(b))[0]!;
}

export function normalizeScript(input: Script): Script {
  if (!input || typeof input !== "object" || !Array.isArray(input.beats) || input.beats.length === 0) {
    throw new Error("Script must contain a non-empty beats array.");
  }

  const beats = input.beats.map((beat, index) => {
    if (!beat || typeof beat.narration !== "string" || !beat.narration.trim()) {
      throw new Error(`Script beat ${index + 1} must contain narration.`);
    }
    const beatId = `B${String(index + 1).padStart(2, "0")}`;
    const duration = Number(beat.estimatedDurationSeconds);
    if (!Number.isFinite(duration) || duration <= 0) {
      throw new Error(`Script beat ${beatId} must have a positive estimatedDurationSeconds.`);
    }
    const wordCount = (beat.narration.match(/[A-Za-z0-9]+(?:['’\\-][A-Za-z0-9]+)*/g) ?? []).length;
    return {
      ...beat,
      beatId,
      cardNumber: index + 1,
      claimIds: Array.isArray(beat.claimIds) ? beat.claimIds : [],
      wordCount,
    };
  });

  const totalWordCount = beats.reduce((sum, beat) => sum + (beat.wordCount ?? 0), 0);
  const durationSumCheck = Number(beats.reduce((sum, beat) => sum + beat.estimatedDurationSeconds, 0).toFixed(2));
  return {
    ...input,
    beats,
    narration: beats.map((beat) => beat.narration).join(" "),
    totalWordCount,
    estimatedDurationSeconds: durationSumCheck,
    durationSumCheck,
  };
}

export function withFeedback(input: string, state: { qaFeedback?: string }, stage: Stage): string {
  const feedback = state.qaFeedback?.trim();
  return feedback ? `${input}\n\nQA REVISION FEEDBACK FOR ${stage.toUpperCase()}:\n${feedback}` : input;
}

export function stageForIssue(issue: any): Stage | null {
  const gate = String(issue?.gate ?? issue?.category ?? "").toLowerCase();
  if (/brief|claim|source|epistemic|fact|accuracy|central-idea/.test(gate)) return "brief";
  if (/script|narrative|storycraft|comprehension|timing|caption/.test(gate)) return "script";
  if (/storyboard|scene|depiction|analogy/.test(gate)) return "storyboard";
  if (/composition|layout|coordinate|safe-zone/.test(gate)) return "composition";
  if (/continuity|character|prop|palette|style/.test(gate)) return "continuity";
  if (/svg|illustration|asset/.test(gate)) return "svgIllustrations";
  if (/visual|prompt|artwork/.test(gate)) return "visualPrompts";
  return null;
}

export function buildFeedback(issues: any[], qa: any): string {
  const lines = issues.map((issue, index) => {
    const scene = issue?.sceneId == null ? "package" : `scene ${issue.sceneId}`;
    return `${index + 1}. [${issue?.gate ?? "review"}] ${scene}: ${issue?.problem ?? "Unspecified issue"}${issue?.requiredFix ? ` Fix: ${issue.requiredFix}` : ""}`;
  });
  if (qa?.summary) lines.push(`QA summary: ${qa.summary}`);
  return lines.join("\n");
}

export async function qaAgent(input: string) {
  return runAgent(
    { name: "Explainer QA Gatekeeper", task: "qa", temperature: 0.1 },
    input,
  );
}
