import type { Issue } from "../skills/custom/skills/qa/validate_package.js";

// Pipeline stages in execution order. A revision restarts at the EARLIEST stage that has a defect,
// because the graph edges are linear and everything downstream is regenerated from corrected input.
export type Stage =
  | "brief"
  | "script"
  | "storyboard"
  | "composition"
  | "continuity"
  | "visualPrompts";

export const STAGE_ORDER: Stage[] = [
  "brief",
  "script",
  "storyboard",
  "composition",
  "continuity",
  "visualPrompts",
];

export const STAGE_TO_NODE: Record<Stage, string> = {
  brief: "director",
  script: "scriptwriter",
  storyboard: "storyboardGenerator",
  composition: "compositionPlanner",
  continuity: "continuity",
  visualPrompts: "visualDirector",
};

// Keep the retry budget finite even if an environment variable is misconfigured.
const configuredRevisions = Number(process.env.MAX_REVISIONS);
export const MAX_REVISIONS = Number.isFinite(configuredRevisions)
  ? Math.min(3, Math.max(0, Math.floor(configuredRevisions)))
  : 3;

export function isStage(v: unknown): v is Stage {
  return typeof v === "string" && (STAGE_ORDER as string[]).includes(v);
}

/** Which stage must fix a validator issue. */
export function stageForIssue(issue: Issue): Stage {
  switch (issue.gate) {
    case "briefContract":
      return "brief";
    case "narrationConsistency":
    case "wordCount":
    case "timing":
    case "storyChain":
    case "caption":
    case "pacing":
      return "script";
    case "storyCraft":
      return /scene/i.test(issue.problem) ? "storyboard" : "script";
    case "sceneMapping":
      return "storyboard";
    case "schema":
      if (/script\.beats|script\.title|beatId|cardNumber/i.test(issue.problem))
        return "script";
      return "storyboard";
    case "epistemic":
      if (
        /claimLedger|claim .*sourceId|source .*absent from researchDossier/i.test(
          issue.problem,
        )
      )
        return "brief";
      return "script";
    case "composition":
      return "composition";
    case "continuity":
      return "continuity";
    case "visualPrompts":
      return "visualPrompts";
    default:
      return "script";
  }
}

export function earliestStage(stages: Stage[]): Stage {
  if (stages.length === 0) return "script";
  return stages.reduce((a, b) =>
    STAGE_ORDER.indexOf(a) <= STAGE_ORDER.indexOf(b) ? a : b,
  );
}

/** Compact, de-duplicated feedback text that is appended to the failing agent's input. */
export function buildFeedback(
  issues: Array<{
    gate?: string;
    sceneId?: any;
    problem: string;
    requiredFix?: string;
  }>,
  instructions: string[] = [],
): string {
  const seen = new Set<string>();
  const lines: string[] = [];
  for (const i of issues) {
    const line = `- [${i.gate ?? "issue"}]${i.sceneId != null ? ` scene ${i.sceneId}:` : ""} ${i.problem}${i.requiredFix ? ` FIX: ${i.requiredFix}` : ""}`;
    if (!seen.has(line)) {
      seen.add(line);
      lines.push(line);
    }
  }
  const shown = lines.slice(0, 40);
  if (lines.length > shown.length)
    shown.push(
      `- ...and ${lines.length - shown.length} more of the same kinds.`,
    );
  for (const ins of instructions.slice(0, 15))
    shown.push(`- INSTRUCTION: ${ins}`);
  return shown.join("\n");
}

/** Append QA feedback to an agent's input, only for the stage QA sent the pipeline back to. */
export function withFeedback(input: string, state: any, stage: Stage): string {
  if (
    state.qualityStatus !== "revise" ||
    state.reviseTarget !== stage ||
    !state.qaFeedback
  ) {
    return input;
  }
  return `${input}\n\nQA REVISION FEEDBACK. Fix every item below and keep everything else unchanged. Do not claim a number you have not computed.\n${state.qaFeedback}`;
}

const WORD_RE = /[A-Za-z0-9]+(?:['’\-][A-Za-z0-9]+)*/g;
const countWords = (t: unknown) =>
  (String(t ?? "").match(WORD_RE) ?? []).length;

/**
 * Make the beats the single source of truth in code, not by asking the model nicely:
 * narration = joined beats, wordCount = real counts, durationSumCheck = real sum.
 * This does NOT hide timing problems; the validator still compares the sum with the target.
 */
export function normalizeScript(script: any): any {
  if (!script || !Array.isArray(script.beats)) return script;
  const beats = script.beats.map((rawBeat: any, index: number) => {
    const b = rawBeat && typeof rawBeat === "object" ? rawBeat : {};
    const narration = String(b.narration ?? "").trim();
    const ordinal = String(index + 1).padStart(2, "0");
    return {
      ...b,
      beatId:
        typeof b.beatId === "string" && b.beatId.trim()
          ? b.beatId
          : `B${ordinal}`,
      cardNumber: Number.isInteger(b.cardNumber) ? b.cardNumber : index + 1,
      narration,
      wordCount: countWords(narration),
    };
  });
  const durationSum = beats.reduce(
    (n: number, b: any) => n + Number(b.estimatedDurationSeconds || 0),
    0,
  );
  return {
    ...script,
    beats,
    narration: beats.map((b: any) => b.narration).join(" "),
    totalWordCount: beats.reduce((n: number, b: any) => n + b.wordCount, 0),
    durationSumCheck: Number(durationSum.toFixed(2)),
  };
}
import { runAgent } from "./base.agent.js";

// The detailed rubric lives in src/skills/custom/skills/qa/SKILL.md, which runAgent injects
// through getSkills("qa"). The role below must NOT restate or contradict it (the old role asked
// for generic film QA and forbade extra JSON properties, which clashed with the skill's contract).
export async function qaAgent(input: string) {
  return runAgent(
    {
      name: "Explainer QA Gatekeeper",
      task: "qa",
      temperature: 0.1,
      role: `
You are the independent QA gatekeeper for an illustrated 9:16 explainer video.

Your input is a JSON object: { "package": {...}, "validatorReport": {...} }.
validatorReport is the output of the deterministic validate_package check. Treat it as already run:
copy its numbers verbatim, never recompute or soften them, and never override a blocking issue.

CRITICAL CREATIVE EVALUATION RULES:
Keep technical validation strictly separate from creative quality. Evaluate and score each of the following 10 creative dimensions separately on a 1-10 scale using evidence from the package:
1. Hook and curiosity
2. Narrative structure
3. Central idea clarity
4. Cause-and-effect progression
5. Emotional engagement
6. Analogy quality
7. Visual storytelling
8. Aha moment
9. Factual accuracy
10. Ending and memorability

- A 9 or 10 is exceptional, not a compliance reward.
- Give a concrete reason (concise rationale and concrete weakness) for EVERY score below 9.
- Calculate the arithmetic mean across all ten dimensions on the 1-10 scale (do not round up; report to one decimal place). creativeScores.average must be on the 1-10 scale, not a percentage. If evidence is insufficient, mark the dimension 'unscored' and do not fabricate a mean.
- Confirm that material factual claims in narration/captions cite valid claim IDs from the brief and that those claims map to real research-dossier source IDs. Flag unsupported, disputed-without-qualification, or invented sources as factual blockers.
- Identify the three weakest dimensions and give minimal, actionable changes for the responsible stage; preserve sections that already work.
- A technically valid schema is not evidence of creative excellence. Do not lower a score merely because revision budget is exhausted, and never claim the deterministic validator passed if it did not.
- Ensure technical release gates (factual errors, missing reports, validation blockers) are evaluated independently from creative quality scores.

Return ONLY one valid JSON object following the QA skill's Output Contract.
No markdown fences, no text outside the JSON, no comments, no trailing commas.
`,
    },
    input,
  );
}
