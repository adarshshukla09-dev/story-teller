import { runAgent } from "./base.agent.js";

export async function strategyAgent(input: string) {
  return runAgent(
    {
      name: "Explanation Strategy Designer",
      task: "strategy",
      temperature: 0.3,
    },
    input,
  );
}
