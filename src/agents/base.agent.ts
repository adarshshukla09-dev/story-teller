import { ChatOllama } from "@langchain/ollama";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";

import { getSkills, type TaskType } from "../skills/manger/skills-manger.js";
import { envNumber, logEvent } from "../lib/run-context.js";
import { OLLAMA_BASE_URL, OLLAMA_MODEL } from "../config/model.js";

// ===============================
// MODEL TIERS & DEFAULTS
// ===============================

export const FAST_MODEL = process.env.OLLAMA_FAST_MODEL || OLLAMA_MODEL;
export const BALANCED_MODEL = process.env.OLLAMA_BALANCED_MODEL || OLLAMA_MODEL;
export const STRONG_MODEL = process.env.OLLAMA_STRONG_MODEL || OLLAMA_MODEL;

const DEFAULT_TEMPERATURE = 0.7;
const DEFAULT_MAX_OUTPUT_TOKENS = 4096;
const DEFAULT_TIMEOUT_MS = 180_000;
const DEFAULT_CONTEXT_TOKENS = 16384;
const DEFAULT_REPEAT_PENALTY = 1.15;
const MAX_REPEAT_PENALTY = 1.5;

// ===============================
// CENTRALIZED AGENT ROUTING POLICY
// ===============================

export interface AgentPolicy {
  model: string;
  temperature: number;
  maxOutputTokens: number;
  contextTokens: number;
  timeoutMs: number;
  maxAttempts: number;
}

/**
 * Task-specific execution budgets.
 * Keep contextTokens consistent per model tier where possible to avoid Ollama runner reloads.
 */
const FAST_CONTEXT = 8192;
const BALANCED_CONTEXT = 16384;
const STRONG_CONTEXT = 32768;

export const AGENT_POLICIES: Partial<Record<TaskType, AgentPolicy>> = {
  comprehension: {
    model: FAST_MODEL,
    temperature: 0.2,
    maxOutputTokens: 800,
    contextTokens: FAST_CONTEXT,
    timeoutMs: 45000,
    maxAttempts: 1,
  },

  factCheck: {
    model: FAST_MODEL,
    temperature: 0.2,
    maxOutputTokens: 1200,
    contextTokens: FAST_CONTEXT,
    timeoutMs: 60000,
    maxAttempts: 1,
  },

  qa: {
    model: FAST_MODEL,
    temperature: 0.2,
    maxOutputTokens: 1000,
    contextTokens: FAST_CONTEXT,
    timeoutMs: 60000,
    maxAttempts: 1,
  },

  continuity: {
    model: BALANCED_MODEL,
    temperature: 0.3,
    maxOutputTokens: 1800,
    contextTokens: BALANCED_CONTEXT,
    timeoutMs: 90000,
    maxAttempts: 1,
  },

  composition: {
    model: BALANCED_MODEL,
    temperature: 0.3,
    maxOutputTokens: 2500,
    contextTokens: BALANCED_CONTEXT,
    timeoutMs: 120000,
    maxAttempts: 1,
  },

  imagePrompt: {
    model: BALANCED_MODEL,
    temperature: 0.4,
    maxOutputTokens: 2500,
    contextTokens: BALANCED_CONTEXT,
    timeoutMs: 120000,
    maxAttempts: 1,
  },

  svgIllustration: {
    model: STRONG_MODEL,
    temperature: 0.35,
    maxOutputTokens: 7000,
    contextTokens: STRONG_CONTEXT,
    timeoutMs: 240000,
    maxAttempts: 2,
  },

  renderer: {
    model: BALANCED_MODEL,
    temperature: 0.5,
    maxOutputTokens: 1800,
    contextTokens: BALANCED_CONTEXT,
    timeoutMs: 90000,
    maxAttempts: 1,
  },

  research: {
    model: STRONG_MODEL,
    temperature: 0.4,
    maxOutputTokens: 3500,
    contextTokens: STRONG_CONTEXT,
    timeoutMs: 240000,
    maxAttempts: 2,
  },

  strategy: {
    model: STRONG_MODEL,
    temperature: 0.5,
    // This stage only needs a compact plan. A smaller completion avoids very
    // slow, overlong generations on local 4B models.
    maxOutputTokens: 1200,
    contextTokens: 16384,
    // Fail over promptly on slow local inference; strategyNode supplies a
    // dossier-based fallback when this deadline is reached.
    timeoutMs: envNumber("STRATEGY_TIMEOUT_MS", 120000),
    maxAttempts: 1,
  },

  director: {
    model: STRONG_MODEL,
    temperature: 0.7,
    maxOutputTokens: 4000,
    contextTokens: STRONG_CONTEXT,
    // Director has a dossier-based fallback in directorNode; don't spend
    // eight minutes retrying the same slow local generation.
    timeoutMs: envNumber("DIRECTOR_TIMEOUT_MS", 120000),
    maxAttempts: 1,
  },

  script: {
    model: STRONG_MODEL,
    temperature: 0.7,
    maxOutputTokens: 6000,
    contextTokens: STRONG_CONTEXT,
    timeoutMs: 300000,
    maxAttempts: 2,
  },

  storyboard: {
    model: STRONG_MODEL,
    temperature: 0.5,
    maxOutputTokens: 4500,
    contextTokens: STRONG_CONTEXT,
    timeoutMs: 240000,
    maxAttempts: 2,
  },
};

function resolvePolicy(config: AgentConfig): AgentPolicy {
  const routed = AGENT_POLICIES[config.task];

  return {
    model: config.model ?? routed?.model ?? OLLAMA_MODEL,
    temperature:
      config.temperature ?? routed?.temperature ?? DEFAULT_TEMPERATURE,
    maxOutputTokens:
      config.maxOutputTokens ??
      routed?.maxOutputTokens ??
      envNumber("OLLAMA_MAX_OUTPUT_TOKENS", DEFAULT_MAX_OUTPUT_TOKENS),
    contextTokens:
      config.contextTokens ??
      routed?.contextTokens ??
      envNumber("OLLAMA_NUM_CTX", DEFAULT_CONTEXT_TOKENS),
    timeoutMs:
      config.timeoutMs ??
      routed?.timeoutMs ??
      envNumber("AGENT_TIMEOUT_MS", DEFAULT_TIMEOUT_MS),
    maxAttempts:
      config.maxAttempts ??
      routed?.maxAttempts ??
      envNumber("AGENT_MAX_ATTEMPTS", 2),
  };
}

// ===============================
// SKILL BUNDLE CACHE
// ===============================

const skillCache = new Map<TaskType, Promise<string>>();

function getCachedSkills(task: TaskType): Promise<string> {
  let cached = skillCache.get(task);
  if (!cached) {
    cached = getSkills(task).catch((err) => {
      skillCache.delete(task);
      throw err;
    });
    skillCache.set(task, cached);
  }
  return cached;
}

export function clearSkillCache(): void {
  skillCache.clear();
}

// ===============================
// MODEL CONFIGURATION
// ===============================

const models = new Map<string, ChatOllama>();

function getModel(
  modelName: string,
  temperature: number,
  maxOutputTokens: number,
  contextTokens: number,
  repeatPenalty: number,
): ChatOllama {
  const key = `${modelName}|${temperature}|${maxOutputTokens}|${contextTokens}|${repeatPenalty}`;
  let model = models.get(key);

  if (!model) {
    model = new ChatOllama({
      model: modelName,
      baseUrl: OLLAMA_BASE_URL,
      temperature,
      numPredict: maxOutputTokens,
      numCtx: contextTokens,
      repeatPenalty,
      repeatLastN: envNumber("OLLAMA_REPEAT_LAST_N", 256),
      format: "json",
    });

    models.set(key, model);
  }

  return model;
}

// ===============================
// DEADLINE ENFORCEMENT
// ===============================

async function withTimeout<T>(
  work: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number,
): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;

  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new Error(`Agent call exceeded ${timeoutMs} ms and was aborted.`));
    }, timeoutMs);
  });

  try {
    return await Promise.race([work(controller.signal), deadline]);
  } finally {
    clearTimeout(timer);
  }
}

// ===============================
// ERROR CLASSIFICATION & RETRY POLICY
// ===============================

export type AgentErrorType =
  | "timeout"
  | "repeat_loop"
  | "rate_limit"
  | "cancelled"
  | "model_error";

function classifyError(error: unknown): AgentErrorType {
  const message = error instanceof Error ? error.message : String(error);

  if (/aborted|exceeded \d+ ms|timeout/i.test(message)) return "timeout";
  if (/repeat limit/i.test(message)) return "repeat_loop";
  if (/rate limit|429|too many requests/i.test(message)) return "rate_limit";
  if (/cancel/i.test(message)) return "cancelled";
  return "model_error";
}

function shouldRetry(errorType: AgentErrorType): boolean {
  switch (errorType) {
    case "repeat_loop":
    case "rate_limit":
      return true;
    case "timeout":
      // Retrying a full generation that already hit a generous deadline rarely succeeds
      // unless transient load caused it; allow retry only if maxAttempts > 1.
      return true;
    case "cancelled":
    case "model_error":
      return false;
  }
}

// ===============================
// METRICS & TELEMETRY
// ===============================

export interface AgentMetrics {
  agent: string;
  task: TaskType;
  model: string;

  durationMs: number;

  inputCharacters: number;
  outputCharacters: number;

  attempts: number;
  success: boolean;

  errorType?: AgentErrorType | undefined;

  // Additional measurements
  timeToFirstTokenMs?: number | undefined;
  tokensPerSecond?: number | undefined;
}

const metricsLog: AgentMetrics[] = [];

export function getAgentMetrics(): readonly AgentMetrics[] {
  return metricsLog;
}

export function resetAgentMetrics(): void {
  metricsLog.length = 0;
}

// ===============================
// TEST SEAM
// ===============================

export interface ChatMessage {
  role: "system" | "user";
  content: string;
}

export type ModelInvoker = (
  messages: ChatMessage[],
  options: {
    temperature: number;
    signal: AbortSignal;
    agent: string;
    model: string;
  },
) => Promise<string>;

let customInvoker: ModelInvoker | null = null;

export function setModelInvoker(invoker: ModelInvoker | null): void {
  customInvoker = invoker;
}

function contentToText(content: unknown): string {
  if (typeof content === "string") return content;

  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") return part;
        if (part && typeof part === "object" && "text" in part) {
          return String((part as { text?: unknown }).text ?? "");
        }
        return "";
      })
      .join("");
  }

  return JSON.stringify(content);
}

// ===============================
// AGENT CONFIGURATION
// ===============================

export interface AgentConfig {
  name: string;
  task: TaskType;
  temperature?: number;

  model?: string;
  maxOutputTokens?: number;
  contextTokens?: number;
  timeoutMs?: number;
  maxAttempts?: number;
}

// ===============================
// RUN AGENT
// ===============================

export async function runAgent(
  config: AgentConfig,
  input: string,
): Promise<string> {
  const policy = resolvePolicy(config);
  const maxAttempts = Math.min(5, Math.max(1, Math.floor(policy.maxAttempts)));
  const baseRepeatPenalty = envNumber(
    "OLLAMA_REPEAT_PENALTY",
    DEFAULT_REPEAT_PENALTY,
  );

  logEvent("agent.start", {
    agent: config.name,
    task: config.task,
    model: policy.model,
    maxOutputTokens: policy.maxOutputTokens,
    contextTokens: policy.contextTokens,
    timeoutMs: policy.timeoutMs,
  });

  const skills = await getCachedSkills(config.task);

  const systemPrompt = `
You are an AI agent operating as: ${config.name}

YOUR INSTRUCTIONS:
Follow the assigned skills below as your authoritative task instructions.

ACTIVE SKILLS:
${skills}

EXECUTION RULES:
- Follow the assigned skills and their output contracts.
- Do not perform another agent's responsibilities.
- Treat the supplied input as the authoritative payload for your task.
- Use only information available in the supplied context.
- Never invent missing research, evidence, sources, or upstream artifacts.
- Respect all schemas, constraints, and formatting requirements defined by your skills.
- Return the exact output format required by your assigned skills.
`;
  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    {
      // Qwen3 models otherwise spend substantial time in hidden reasoning on
      // this JSON planning task. Keep this opt-in narrowly scoped to Qwen3.
      role: "user",
      content: /^qwen3(?::|$)/i.test(policy.model)
        ? `/no_think\n${input}`
        : input,
    },
  ];

  const inputCharacters = systemPrompt.length + input.length;
  const totalStartedAt = performance.now();

  let lastError: unknown;
  let lastErrorType: AgentErrorType | undefined;
  let attemptsUsed = 0;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    attemptsUsed = attempt;

    // Raise repeat penalty on retries to break token repetition loops.
    const repeatPenalty = Math.min(
      MAX_REPEAT_PENALTY,
      baseRepeatPenalty + 0.15 * (attempt - 1),
    );

    try {
      const attemptStartedAt = performance.now();

      const text = await withTimeout(async (signal) => {
        if (customInvoker) {
          return customInvoker(messages, {
            temperature: policy.temperature,
            signal,
            agent: config.name,
            model: policy.model,
          });
        }

        const response = await getModel(
          policy.model,
          policy.temperature,
          policy.maxOutputTokens,
          policy.contextTokens,
          repeatPenalty,
        ).invoke(
          messages.map((message) =>
            message.role === "system"
              ? new SystemMessage(message.content)
              : new HumanMessage(message.content),
          ),
          { signal },
        );

        return contentToText(response.content);
      }, policy.timeoutMs);

      const durationMs = Math.round(performance.now() - attemptStartedAt);

      const metric: AgentMetrics = {
        agent: config.name,
        task: config.task,
        model: policy.model,
        durationMs,
        inputCharacters,
        outputCharacters: text.length,
        attempts: attempt,
        success: true,
      };
      metricsLog.push(metric);

      logEvent("agent.success", {
        ...metric,
        repeatPenalty,
      });

      return text;
    } catch (error) {
      lastError = error;
      lastErrorType = classifyError(error);
      const message = error instanceof Error ? error.message : String(error);

      logEvent("agent.failure", {
        agent: config.name,
        task: config.task,
        model: policy.model,
        attempt,
        repeatPenalty,
        errorType: lastErrorType,
        repeatLoop: lastErrorType === "repeat_loop",
        error: message.slice(0, 500),
      });

      if (attempt >= maxAttempts || !shouldRetry(lastErrorType)) {
        break;
      }

      if (lastErrorType === "rate_limit") {
        await new Promise((r) => setTimeout(r, 1000 * attempt));
      }
    }
  }

  const totalDurationMs = Math.round(performance.now() - totalStartedAt);
  const failedMetric: AgentMetrics = {
    agent: config.name,
    task: config.task,
    model: policy.model,
    durationMs: totalDurationMs,
    inputCharacters,
    outputCharacters: 0,
    attempts: attemptsUsed,
    success: false,
    ...(lastErrorType !== undefined ? { errorType: lastErrorType } : {}),
  };
  metricsLog.push(failedMetric);

  throw new Error(
    `Agent ${config.name} (${lastErrorType ?? "unknown"}) failed after ${attemptsUsed} attempt(s)`,
    { cause: lastError },
  );
}
