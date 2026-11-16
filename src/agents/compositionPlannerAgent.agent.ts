import { runAgent } from "./base.agent.js";

export async function compositionPlannerAgent(input: string) {
  return runAgent(
    {
      name: "Illustrated Visual Composition Designer",
      task: "composition",
      temperature: 0.3,
    },
    input,
  );
}
