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

STORY-FIRST REQUIREMENTS:
Build the beat architecture around the strongest truthful narrative angle for this topic. When a person-centered story fits, give the central character a clear desire or expectation, a consequential obstacle or contradiction, a meaningful change, and a realization earned by the evidence. Use that same journey to connect the beats; introduce each psychological, scientific, or economic concept only when it explains what is happening to the character. Prefer a few connected mechanisms over a sequence of named concepts. Open with a concrete moment before explaining the topic, and make the ending reveal the meaning of the character's experience rather than append a lesson. If a character would feel artificial, use a thought experiment, historical event, system behavior, or other coherent story engine instead. A fictional scenario must be clearly illustrative and must never be presented as a real event, quotation, statistic, or evidence. Keep the narrative arc, motivations, and ending grounded in supplied claims and constraints.

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
