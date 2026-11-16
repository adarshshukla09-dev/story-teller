import { runAgent } from "./base.agent.js";

interface DirectorInput {
  topic: string;
  researchDossier: unknown;
  explanationStrategy: unknown;
}

export async function directorAgent(input: DirectorInput) {
  if (!input.researchDossier) {
    throw new Error("Director requires a research dossier.");
  }

  if (!input.explanationStrategy) {
    throw new Error("Director requires an explanation strategy.");
  }

  const payload = `
TOPIC:
${input.topic}

RESEARCH DOSSIER:
${JSON.stringify(input.researchDossier, null, 2)}

EXPLANATION STRATEGY:
${JSON.stringify(input.explanationStrategy, null, 2)}
`;

  return runAgent(
    {
      name: "Universal Explainer Story Architect",
      task: "director",
      temperature: 0.7,
      role: `Your Director role instructions go here.`,
    },
    payload,
  );
}
