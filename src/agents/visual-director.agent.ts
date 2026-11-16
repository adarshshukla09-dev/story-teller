import { runAgent } from "./base.agent.js";

export async function visualDirectorAgent(input: string) {
  return runAgent(
    {
      name: "Visual Director",
      task: "imagePrompt",
      temperature: 0.4,
    },
    input,
  );
}
