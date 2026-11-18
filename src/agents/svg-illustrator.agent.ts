import { runAgent } from "./base.agent.js";

export async function svgIllustratorAgent(input: string) {
  return runAgent(
    {
      name: "SVG Illustrator",
      task: "svgIllustration",
      temperature: 0.35,
    },
    input,
  );
}
