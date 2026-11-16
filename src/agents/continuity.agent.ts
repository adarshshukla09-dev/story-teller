import { runAgent } from "./base.agent.js";

export async function continuityAgent(production: string) {
  return runAgent(
    {
      name: "Continuity Supervisor",
      task: "continuity",
      temperature: 0.3,
    },
    production,
  );
}
