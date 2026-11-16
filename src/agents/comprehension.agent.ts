import { runAgent } from "./base.agent.js";

export async function comprehensionAgent(input: string) {
  return runAgent(
    {
      name: "comprehension Supervisor",
      task: "comprehension",
      temperature: 0.3,
    },
    input,
  );
}
