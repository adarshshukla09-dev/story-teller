import { runAgent } from "./base.agent.js";

export async function scriptwriterAgent(input: string) {
  return runAgent(
    {
      name: "Universal Explainer Scriptwriter",
      task: "script",
      temperature: 0.4,
    },
    input,
  );
}
