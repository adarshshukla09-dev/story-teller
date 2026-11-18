import { runAgent } from "./base.agent.js";

export async function comprehensionAgent(input: string) {
  return runAgent(
    {
      name: "Comprehension Supervisor",
      task: "comprehension",
      temperature: 0.2,
    },
    input,
  );
}
