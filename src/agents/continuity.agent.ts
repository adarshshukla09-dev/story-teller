import { runAgent } from "./base.agent.js";

export async function continuityAgent(production: string) {
  return runAgent(
    {
      name: "Continuity Supervisor",
      task: "continuity",
      temperature: 0.3,

      role: `
You are responsible for visual continuity.

Create and maintain:
- Character descriptions.
- Location descriptions.
- Props.
- Clothing.
- Color palette.
- Art style.

Check whether all scenes follow
the established visual identity.

Return a structured production bible.
`,
    },
    production,
  );
}
