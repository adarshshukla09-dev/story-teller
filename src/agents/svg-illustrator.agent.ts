import { runAgent } from "./base.agent.js";

export async function svgIllustratorAgent(input: string) {
  return runAgent(
    {
      name: "SVG Illustrator",
      task: "svgIllustration",
      temperature: 0.35,
      maxOutputTokens: 7000,
      timeoutMs: 240000,
      maxAttempts: 2,
    },
    input,
  );
}
