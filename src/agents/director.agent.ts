import { runAgent } from "./base.agent.js";

export interface DirectorInput {
  topic: string;
  coreConcept: string;
  relatedConceptsExcluded: string[];
  referenceScript: string;

  researchDossier: {
    research: string;
    factCheck: string;
  };

  factCheckReport: string;
  explanationStrategy: string;
  correction?: string;
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

CORE CONCEPT (only named concept to teach):
${input.coreConcept}

RELATED CONCEPTS EXCLUDED:
${JSON.stringify(input.relatedConceptsExcluded)}

VIDEO PRODUCTION TARGET:
Plan for about 60 seconds total, within a 45–75 second format (set durationTargetSeconds to 60 unless the input specifies another target). Use 12–16 connected visual beats; timing is derived from narration at about 2.7 words per second, plus brief transitions. If this scope cannot be explained accurately, narrow it or report the conflict.

STORY-FIRST REQUIREMENTS:
Reject any beat map that names more than one theory/paradox/effect by name. If coreConcept is 'Paradox of Choice', every beat must build toward explaining THAT, through concrete scenes and mechanism, not pivot to a different named phenomenon. Before returning the beat map, list every proper-noun theory/paradox/law name it contains. If that list has more than one distinct concept (not counting a renamed synonym of coreConcept), revise the beat map to cut the extra one and replace it with another facet or example of coreConcept.
Build the beat architecture around the strongest truthful narrative angle for this topic. When a person-centered story fits, give the central character a clear desire or expectation, a consequential obstacle or contradiction, a meaningful change, and a realization earned by the evidence. Use that same journey to connect the beats; introduce each psychological, scientific, or economic concept only when it explains what is happening to the character. Prefer a few connected mechanisms over a sequence of named concepts. Open with a concrete moment before explaining the topic, and make the ending reveal the meaning of the character's experience rather than append a lesson. If a character would feel artificial, use a thought experiment, historical event, system behavior, or other coherent story engine instead. A fictional scenario must be clearly illustrative and must never be presented as a real event, quotation, statistic, or evidence. Keep the narrative arc, motivations, and ending grounded in supplied claims and constraints.

SCOPE AND PACING GATES:
- State one central question and one-sentence thesis. Teach only the named coreConcept; explain supporting mechanisms in plain language as facets of that concept.
- Do not turn every related research concept into a beat. Exclude concepts that do not advance the central question through the protagonist's experience.
- Design a complete 45–75 second script, defaulting to 60 seconds. Target approximately 2.7 spoken words per second (about 160 words at 60 seconds); narration timing is recomputed in code.
- Ensure the full beat map can be narrated within that word budget without dropping the hook, evidence, causal explanation, nuance, or resolution.

RESEARCH DOSSIER:
${JSON.stringify(input.researchDossier, null, 2)}

FACT CHECK REPORT:
${JSON.stringify(input.factCheckReport, null, 2)}

EXPLANATION STRATEGY:
${JSON.stringify(input.explanationStrategy, null, 2)}

${input.correction ? `BEAT COUNT CORRECTION:\n${input.correction}` : ""}
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
