// // import "dotenv/config";
// // import { ChatOllama } from "@langchain/ollama";

// // const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434";

// // const DEFAULT_MODEL = process.env.OLLAMA_MODEL || "qwen2.5:1.5b";

// // const DEFAULT_TEMPERATURE = Number(process.env.OLLAMA_TEMPERATURE ?? 0.3);

// // const DEFAULT_MAX_OUTPUT_TOKENS = Number(
// //   process.env.OLLAMA_MAX_OUTPUT_TOKENS ?? 4096,
// // );

// // const DEFAULT_TIMEOUT_MS = Number(process.env.OLLAMA_TIMEOUT_MS ?? 240000);

// // export interface AgentConfig {
// //   name: string;
// //   task: string;
// //   model?: string;
// //   temperature?: number;
// //   maxOutputTokens?: number;
// //   timeoutMs?: number;
// //   maxAttempts?: number;
// // }

// // /**
// //  * Runs an agent using the local Ollama model.
// //  */
// // export async function runAgent(
// //   config: AgentConfig,
// //   input: string,
// // ): Promise<string> {
// //   const {
// //     name,
// //     task,
// //     model = DEFAULT_MODEL,
// //     temperature = DEFAULT_TEMPERATURE,
// //   } = config;

// //   if (!input || typeof input !== "string") {
// //     throw new Error(`[${name}] Input must be a non-empty string.`);
// //   }

// //   const llm = new ChatOllama({
// //     baseUrl: OLLAMA_BASE_URL,
// //     model,
// //     temperature,
// //   });

// //   console.log(`\n[${name}] Starting ${task} agent...`);
// //   console.log(`[${name}] Model: ${model}`);

// //   let timeoutId: NodeJS.Timeout | undefined;

// //   try {
// //     const result = await Promise.race([llm.invoke(input)]);

// //     const content = result.content;

// //     if (typeof content === "string") {
// //       return content.trim();
// //     }

// //     if (Array.isArray(content)) {
// //       return content
// //         .map((item) => {
// //           if (typeof item === "string") return item;
// //           if (
// //             item &&
// //             typeof item === "object" &&
// //             "text" in item &&
// //             typeof item.text === "string"
// //           ) {
// //             return item.text;
// //           }
// //           return "";
// //         })
// //         .filter(Boolean)
// //         .join("\n")
// //         .trim();
// //     }

// //     throw new Error("Ollama returned an unsupported response format.");
// //   } catch (error: unknown) {
// //     const errorMessage = error instanceof Error ? error.message : String(error);

// //     console.error(`[${name}] Failed:`, errorMessage);

// //     throw new Error(`[${name}] ${task} agent failed: ${errorMessage}`, {
// //       cause: error,
// //     });
// //   } finally {
// //     if (timeoutId) {
// //       clearTimeout(timeoutId);
// //     }
// //   }
// // }
// import "dotenv/config";
// import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

// const DEFAULT_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

// const DEFAULT_TEMPERATURE = Number(
//   process.env.GEMINI_TEMPERATURE ?? 0.3,
// );

// export interface AgentConfig {
//   name: string;
//   task: string;
//   model?: string;
//   temperature?: number;
//   maxAttempts?: number;
// }

// /**
//  * Runs an agent using Google's Gemini model.
//  */
// export async function runAgent(
//   config: AgentConfig,
//   input: string,
// ): Promise<string> {
//   const {
//     name,
//     task,
//     model = DEFAULT_MODEL,
//     temperature = DEFAULT_TEMPERATURE,
//   } = config;

//   if (!input || typeof input !== "string") {
//     throw new Error(`[${name}] Input must be a non-empty string.`);
//   }

//   const llm = new ChatGoogleGenerativeAI({
//     model,
//     apiKey: process.env.GOOGLE_API_KEY,
//     temperature,
//   });

//   console.log(`\n[${name}] Starting ${task} agent...`);
//   console.log(`[${name}] Model: ${model}`);

//   try {
//     const result = await llm.invoke(input);

//     const content = result.content;

//     if (typeof content === "string") {
//       return content.trim();
//     }

//     if (Array.isArray(content)) {
//       return content
//         .map((item) => {
//           if (typeof item === "string") return item;

//           if (
//             item &&
//             typeof item === "object" &&
//             "text" in item &&
//             typeof item.text === "string"
//           ) {
//             return item.text;
//           }

//           return "";
//         })
//         .filter(Boolean)
//         .join("\n")
//         .trim();
//     }

//     throw new Error("Gemini returned an unsupported response format.");
//   } catch (error: unknown) {
//     const errorMessage =
//       error instanceof Error ? error.message : String(error);

//     console.error(`[${name}] Failed:`, errorMessage);

//     throw new Error(
//       `[${name}] ${task} agent failed: ${errorMessage}`,
//       { cause: error },
//     );
//   }
// }
import "dotenv/config";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { readFile, writeFile } from "node:fs/promises";

const DEFAULT_MODEL = process.env.GEMINI_MODEL!;

const DEFAULT_TEMPERATURE = Number(process.env.GEMINI_TEMPERATURE ?? 0.3);

const REQUEST_DELAY_MS = 15_000;
const MAX_REQUESTS_PER_DAY = 80;

const USAGE_FILE = ".gemini-usage.json";

let requestQueue: Promise<void> = Promise.resolve();
let lastRequestTime = 0;

interface UsageData {
  date: string;
  count: number;
}

export interface AgentConfig {
  name: string;
  task: string;
  model?: string;
  temperature?: number;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getPacificDate(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

async function getUsage(): Promise<UsageData> {
  try {
    const data = await readFile(USAGE_FILE, "utf-8");
    const usage = JSON.parse(data) as UsageData;

    if (usage.date !== getPacificDate()) {
      return { date: getPacificDate(), count: 0 };
    }

    return usage;
  } catch {
    return { date: getPacificDate(), count: 0 };
  }
}

async function saveUsage(usage: UsageData): Promise<void> {
  await writeFile(USAGE_FILE, JSON.stringify(usage, null, 2), "utf-8");
}

async function executeWithDelay<T>(operation: () => Promise<T>): Promise<T> {
  let release!: () => void;

  const previous = requestQueue;

  requestQueue = new Promise<void>((resolve) => {
    release = resolve;
  });

  await previous;

  try {
    const remainingDelay = REQUEST_DELAY_MS - (Date.now() - lastRequestTime);

    if (remainingDelay > 0) {
      console.log(`Waiting ${(remainingDelay / 1000).toFixed(1)} seconds...`);

      await delay(remainingDelay);
    }

    return await operation();
  } finally {
    lastRequestTime = Date.now();
    release();
  }
}

/**
 * Runs an agent using Gemini with request delays.
 */
export async function runAgent(
  config: AgentConfig,
  input: string,
): Promise<string> {
  const {
    name,
    task,
    model = DEFAULT_MODEL,
    temperature = DEFAULT_TEMPERATURE,
  } = config;

  if (!input || typeof input !== "string") {
    throw new Error(`[${name}] Input must be a non-empty string.`);
  }

  if (!process.env.GOOGLE_API_KEY) {
    throw new Error("GOOGLE_API_KEY is missing.");
  }

  const llm = new ChatGoogleGenerativeAI({
    model,
    apiKey: process.env.GOOGLE_API_KEY,
    temperature,
  });

  console.log(`\n[${name}] Starting ${task} agent...`);
  console.log(`[${name}] Model: ${model}`);

  try {
    const result = await executeWithDelay(async () => {
      const usage = await getUsage();

      if (usage.count >= MAX_REQUESTS_PER_DAY) {
        throw new Error(
          `Daily Gemini limit reached (${MAX_REQUESTS_PER_DAY}).`,
        );
      }

      usage.count++;
      await saveUsage(usage);

      console.log(
        `[${name}] Daily usage: ${usage.count}/${MAX_REQUESTS_PER_DAY}`,
      );

      return await llm.invoke(input);
    });

    const content = result.content;

    if (typeof content === "string") {
      return content.trim();
    }

    if (Array.isArray(content)) {
      return content
        .map((item) => {
          if (typeof item === "string") return item;

          if (
            item &&
            typeof item === "object" &&
            "text" in item &&
            typeof item.text === "string"
          ) {
            return item.text;
          }

          return "";
        })
        .filter(Boolean)
        .join("\n")
        .trim();
    }

    throw new Error("Gemini returned an unsupported response format.");
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    console.error(`[${name}] Failed:`, errorMessage);

    throw new Error(`[${name}] ${task} agent failed: ${errorMessage}`, {
      cause: error,
    });
  }
}
import type { ZodType } from "zod";

export async function runStructuredAgent<T>(
  config: AgentConfig,
  input: string,
  schema: ZodType<T>,
): Promise<T> {
  const {
    name,
    task,
    model = DEFAULT_MODEL,
    temperature = DEFAULT_TEMPERATURE,
  } = config;

  if (!input || typeof input !== "string") {
    throw new Error(`[${name}] Input must be a non-empty string.`);
  }

  if (!process.env.GOOGLE_API_KEY) {
    throw new Error("GOOGLE_API_KEY is missing.");
  }

  const llm = new ChatGoogleGenerativeAI({
    model,
    apiKey: process.env.GOOGLE_API_KEY,
    temperature,
  });

  console.log(`\n[${name}] Starting ${task} agent...`);
  console.log(`[${name}] Model: ${model}`);

  try {
    return await executeWithDelay(async () => {
      const usage = await getUsage();

      if (usage.count >= MAX_REQUESTS_PER_DAY) {
        throw new Error(
          `Daily Gemini limit reached (${MAX_REQUESTS_PER_DAY}).`,
        );
      }

      const structuredLlm = llm.withStructuredOutput(schema, {
        name: task,
        method: "jsonSchema",
      });

      const result = await structuredLlm.invoke(input);

      const parsed = schema.parse(result);

      usage.count++;
      await saveUsage(usage);

      return parsed;
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    console.error(`[${name}] Failed:`, errorMessage);

    throw new Error(`[${name}] ${task} agent failed: ${errorMessage}`, {
      cause: error,
    });
  }
}
