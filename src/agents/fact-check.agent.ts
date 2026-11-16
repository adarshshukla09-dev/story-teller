import { runAgent } from "./base.agent.js";

export async function factCheckAgent(input: string) {
  return runAgent(
    {
      name: "Independent Factuality and Domain Reviewer",
      task: "factCheck",
      temperature: 0.1,
    },
    input,
  );
}
