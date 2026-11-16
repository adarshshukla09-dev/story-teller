import { runAgent } from "./base.agent.js";

export async function artDirectionAgent(input: string) {
  return runAgent(
    {
      name: "Film Art Director",
      task: "artDirection",
      temperature: 0.2,
    },
    input,
  );
}
