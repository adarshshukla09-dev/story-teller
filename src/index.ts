import { pathToFileURL } from "node:url";

import { filmGraph, RECURSION_LIMIT } from "./graphs/workflow.graph.js";
import { saveResult } from "./lib/utils/saveResult.js";
import { logEvent, newRunId, runWithId } from "./lib/run-context.js";

type WorkflowOptions = { audience?: string; sourceMaterials?: unknown[] };
type FilmResult = Awaited<ReturnType<typeof filmGraph.invoke>>;
export type WorkflowOutcome = {
  result: FilmResult;
  savedPath: string;
  /** true only when deterministic validation, fact review, comprehension and QA all passed. */
  approved: boolean;
};

// Single-flight: the same topic + audience can only run once at a time. Starting a second identical run
// would double the paid model calls and halve the shared rate limit for both.
const inFlight = new Map<string, Promise<WorkflowOutcome>>();

export function runFilmWorkflow(
  topic: string,
  options: WorkflowOptions = {},
): Promise<WorkflowOutcome> {
  if (!topic || !topic.trim()) throw new Error("A non-empty topic is required.");

  const cleanTopic = topic.trim();
  const audience = options.audience ?? "curious beginner";
  const key = `${cleanTopic.toLowerCase()}|${audience.toLowerCase()}`;

  const existing = inFlight.get(key);
  if (existing) {
    logEvent("workflow.duplicate_ignored", { topic: cleanTopic });
    return existing;
  }

  const promise = execute(cleanTopic, audience, options).finally(() => inFlight.delete(key));
  inFlight.set(key, promise);
  return promise;
}

async function execute(topic: string, audience: string, options: WorkflowOptions): Promise<WorkflowOutcome> {
  const runId = newRunId();

  return runWithId(runId, async () => {
    logEvent("workflow.start", { topic, audience, recursionLimit: RECURSION_LIMIT });

    // stream() instead of invoke() so the latest state survives a crash.
    let latest: FilmResult | undefined;
    try {
      const stream = await filmGraph.stream(
        { topic, audience, sourceMaterials: options.sourceMaterials ?? [] },
        { streamMode: "values", recursionLimit: RECURSION_LIMIT },
      );
      for await (const state of stream) latest = state as FilmResult;
    } catch (error) {
      logEvent("workflow.failed", { error: String(error).slice(0, 500) });
      if (latest) {
        const savedPath = await saveResult({ failed: true, error: String(error), state: latest }, "failed");
        logEvent("workflow.partial_saved", { savedPath });
      }
      throw error;
    }

    if (!latest) throw new Error("Workflow produced no state.");

    const savedPath = await saveResult(latest);
    const approved = latest.qualityStatus === "pass";
    logEvent("workflow.completed", { topic, qualityStatus: latest.qualityStatus, approved, revisions: latest.revisionCount, savedPath });
    return { result: latest, savedPath, approved };
  });
}

// ---- CLI: runs only when this file is executed directly, never on import. ----
//   npm run dev -- "Explain Docker in computer science"
//   DEMO_TOPIC="How vaccines work" RUN_DEMO=true npm run dev
const isMain = Boolean(process.argv[1]) && import.meta.url === pathToFileURL(process.argv[1]!).href;

if (isMain) {
  const topic = process.argv.slice(2).join(" ").trim() || (process.env.RUN_DEMO === "true" ? process.env.DEMO_TOPIC || "Explain Docker in computer science" : "");

  if (!topic) {
    console.log('Usage: npm run dev -- "<topic>"   (or RUN_DEMO=true [DEMO_TOPIC="..."] npm run dev)');
  } else {
    runFilmWorkflow(topic).catch((error) => {
      console.error("Workflow failed:", error);
      process.exitCode = 1;
    });
  }
}
