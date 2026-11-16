import { runAgent } from "./base.agent.js";

export async function storyboardAgent(input: string) {
  return runAgent(
    {
      name: "Illustrated Explainer Storyboard Artist",
      task: "storyboard",

      ...(process.env.OLLAMA_MODEL_STORYBOARD
        ? { model: process.env.OLLAMA_MODEL_STORYBOARD }
        : {}),

      maxOutputTokens: 3072,
      timeoutMs: 480_000,
      maxAttempts: 1,
    },
    input,
  );
}
