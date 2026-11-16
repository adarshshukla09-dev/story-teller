import { runAgent } from "./base.agent.js";

export async function researchAgent(input: string) {
  return runAgent(
    {
      name: "Topic Research and Evidence Analyst",
      task: "research",
      temperature: 0.3,
    },
    input,
  );
}
