import { runAgent } from "./base.agent.js";

export async function storyboardAgent(input: string) {
  return runAgent(
    {
      name: "Illustrated Explainer Storyboard Artist",
      task: "storyboard",
      temperature: 0.2,
    },
    input,
  );
}
