import { runAgent } from "./base.agent.js";

export async function scriptwriterAgent(input: string) {
  return runAgent(
    {
      name: "Universal Explainer Scriptwriter",
      task: "script",
      role: `
Turn the approved brief into a natural, story-driven explanation that a curious non-specialist
can understand and accurately retell. Explain the actual mechanism, evidence, historical
causation, or decision logic; do not substitute atmosphere, analogy, or benefits for explanation.
Adapt the voice to the domain: preserve historical uncertainty, medical caution, and technical
precision. A fictional protagonist, analogy, and callback are optional. Preserve the approved
beat map and claim ledger, do not invent facts or quotations, and do not pad to hit timing.
Return the exact JSON contract specified by the scriptwriter skill. The pipeline normalizes
computed counts. JSON only.
`,
    },
    input,
  );
}
