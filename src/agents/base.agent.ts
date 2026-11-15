import "dotenv/config";
import { ChatOllama } from "@langchain/ollama";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import { getSkills, type TaskType } from "../skills/manger/skills-manger.js";
import { envNumber, logEvent } from "../lib/run-context.js";

// ===============================
// MODEL CONFIGURATION
// ===============================

const DEFAULT_TEMPERATURE = 0.7;

const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "gemma4:e2b";
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434";

const models = new Map<number, ChatOllama>();

function getModel(temperature: number): ChatOllama {
  let model = models.get(temperature);

  if (!model) {
    model = new ChatOllama({
      model: OLLAMA_MODEL,
      baseUrl: OLLAMA_BASE_URL,
      temperature,
      numPredict: envNumber("OLLAMA_MAX_OUTPUT_TOKENS", 8192),
    });

    models.set(temperature, model);
  }

  return model;
}

// ===============================
// RATE LIMITING
// ===============================

// Ollama runs locally, so provider API quotas are unnecessary.
// Keep optional throttling to control local resource usage.

const REQUEST_DELAY = envNumber("OLLAMA_MIN_DELAY_MS", 0);

let lastRequestTime = 0;

const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

async function waitForRateLimit(): Promise<void> {
  const elapsed = Date.now() - lastRequestTime;

  if (elapsed < REQUEST_DELAY) {
    await delay(REQUEST_DELAY - elapsed);
  }

  lastRequestTime = Date.now();
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

interface AgentConfig {
  name: string;
  role: string;
  task: TaskType;
  temperature?: number;
}

// ===============================
// RUN AGENT
// ===============================

export async function runAgent(
  config: AgentConfig,
  input: string,
): Promise<string> {
  logEvent("agent.start", {
    agent: config.name,
    model: OLLAMA_MODEL,
  });

  const skills = await getSkills(config.task);

  const configuredAttempts = envNumber("AGENT_MAX_ATTEMPTS", 1);

  const maxAttempts = Math.min(5, Math.max(1, Math.floor(configuredAttempts)));

  const timeoutMs = envNumber("AGENT_TIMEOUT_MS", 180_000);

  const temperature = config.temperature ?? DEFAULT_TEMPERATURE;

  const messages: ChatMessage[] = [
    {
      role: "system",
      content: `
You are ${config.name}.

YOUR ROLE:
${config.role}

YOUR SPECIALIZED KNOWLEDGE:
Follow the filmmaking methodologies, instructions and workflows provided below.

ACTIVE SKILLS:
${skills}

RULES:
- Follow your assigned role.
- Use the supplied skills.
- Do not perform another agent's responsibilities.
- Produce structured, useful outputs.
- Treat the user's topic as a title, not as a complete brief.
`,
    },
    {
      role: "user",
      content: input,
    },
  ];

  let lastError: unknown;
  let attemptsUsed = 0;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    attemptsUsed = attempt;

    try {
      await waitForRateLimit();

      const startedAt = performance.now();

      const signal = AbortSignal.timeout(timeoutMs);

      const text = customInvoker
        ? await customInvoker(messages, {
            temperature,
            signal,
            agent: config.name,
          })
        : contentToText(
            (
              await getModel(temperature).invoke(
                messages.map((message) =>
                  message.role === "system"
                    ? new SystemMessage(message.content)
                    : new HumanMessage(message.content),
                ),
                { signal },
              )
            ).content,
          );

      logEvent("agent.success", {
        agent: config.name,
        model: OLLAMA_MODEL,
        attempt,
        durationMs: Math.round(performance.now() - startedAt),
        chars: text.length,
      });

      return text;
    } catch (error) {
      lastError = error;

      const message = error instanceof Error ? error.message : String(error);

      logEvent("agent.failure", {
        agent: config.name,
        model: OLLAMA_MODEL,
        attempt,
        error: message.slice(0, 500),
      });

      if (attempt >= maxAttempts) break;

      const backoff = Math.min(30_000, 1000 * 2 ** (attempt - 1));

      await delay(backoff);
    }
  }

  throw new Error(
    `Agent ${config.name} failed after ${attemptsUsed} attempt(s)`,
    {
      cause: lastError,
    },
  );
}
