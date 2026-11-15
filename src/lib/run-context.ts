import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";

interface RunContext {
  runId: string;
}

const storage = new AsyncLocalStorage<RunContext>();

export function newRunId(): string {
  return randomUUID().slice(0, 8);
}

/** Everything logged inside `fn` (including inside LangGraph nodes) is tagged with `runId`. */
export function runWithId<T>(runId: string, fn: () => Promise<T>): Promise<T> {
  return storage.run({ runId }, fn);
}

export function currentRunId(): string | undefined {
  return storage.getStore()?.runId;
}

/** Structured JSON log line. Always carries runId, so concurrent runs are easy to tell apart. */
export function logEvent(event: string, fields: Record<string, unknown> = {}): void {
  console.log(
    JSON.stringify({
      event,
      runId: currentRunId(),
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
