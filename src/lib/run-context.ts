import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";
import type { AgentMetrics } from "../agents/base.agent.js";

interface RunContext {
  runId: string;
  startedAt: number;
  metrics: AgentMetrics[];
}

const storage = new AsyncLocalStorage<RunContext>();

export function newRunId(): string {
  return randomUUID().slice(0, 8);
}

/** Everything logged inside `fn` (including inside LangGraph nodes) is tagged with `runId`. */
export function runWithId<T>(runId: string, fn: () => Promise<T>): Promise<T> {
  return storage.run(
    {
      runId,
      startedAt: performance.now(),
      metrics: [],
    },
    fn,
  );
}

export function currentRunId(): string | undefined {
  return storage.getStore()?.runId;
}

export function recordRunMetric(metric: AgentMetrics): void {
  storage.getStore()?.metrics.push(metric);
}

export function getRunMetrics(): readonly AgentMetrics[] {
  return storage.getStore()?.metrics ?? [];
}

/** Structured JSON log line. Always carries runId and elapsedMs since run start. */
export function logEvent(
  event: string,
  fields: Record<string, unknown> = {},
): void {
  const store = storage.getStore();
  const elapsedMs = store
    ? Math.round(performance.now() - store.startedAt)
    : undefined;

  console.log(
    JSON.stringify({
      event,
      runId: store?.runId,
      ...(elapsedMs !== undefined ? { elapsedMs } : {}),
      ...fields,
      at: new Date().toISOString(),
    }),
  );
}

export function envNumber(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === "") return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}
