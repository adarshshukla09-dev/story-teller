import { runAgent } from "./base.agent.js";

export interface DirectorInput {
  topic: string;
  referenceScript: string;

  researchDossier: {
    research: string;
    factCheck: string;
  };

  factCheckReport: string;
  explanationStrategy: string;
}

export async function directorAgent(input: DirectorInput) {
  if (!input.topic?.trim()) {
    throw new Error("Director requires a topic.");
  }

  if (!input.researchDossier) {
    throw new Error("Director requires a research dossier.");
  }

  if (!input.explanationStrategy) {
    throw new Error("Director requires an explanation strategy.");
  }

  if (!input.factCheckReport) {
    throw new Error("Director requires fact-check results.");
  }

  const payload = `
TOPIC:
${input.topic}

VIDEO PRODUCTION TARGET:
Plan for 50–52 seconds total (set durationTargetSeconds to 50.4), using 14–16 visual beats designed for 3–4 seconds each. If this scope cannot be explained accurately, narrow it or report the conflict.

RESEARCH DOSSIER:
${JSON.stringify(input.researchDossier, null, 2)}

FACT CHECK REPORT:
${JSON.stringify(input.factCheckReport, null, 2)}

EXPLANATION STRATEGY:
${JSON.stringify(input.explanationStrategy, null, 2)}
`;

  return runAgent(
    {
      name: "Universal Explainer Story Architect",
      task: "director",
      temperature: 0.4,
    },
    payload,
  );
}
