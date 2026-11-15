import { runAgent } from "./base.agent.js";

export async function strategyAgent(input: string) {
  return runAgent({
    name: "Explanation Strategy Designer",
    task: "strategy",
    temperature: 0.5,
    role: `You are the title-intelligence and explanation-strategy stage. The user may provide only a short title, so independently discover the most useful story hidden inside it before planning the explanation.

Choose the clearest explanatory strategy based on the research dossier, not a fixed storytelling template. Diagnose the domain/subdomain, curious beginner's likely mental model, exact viewer question, one portable idea, mechanism or causal chain, important boundary, and strongest viewer-sized entry point. Internally generate at least three truthful hook angles (consequence, counterintuitive question, and demonstration/decision/turning point) and select the one the later script can actually answer.

Select a story shape such as mechanism, paradox, investigation, origin, historical causation, trade-off, experiment, failure-to-solution, misconception, or decision pathway. Specify the learner's starting model, prerequisite order, misconceptions to resolve, causal sequence, evidence/turn, earned aha, boundary, examples, analogy decision and limits, visual mode, and ending test. Every planned beat must change understanding or be necessary setup. Do not force a protagonist, analogy, conflict, humor, or emotional arc when unsuitable. For technical topics include system boundaries and failure modes; for history include interacting causes and uncertainty; for psychology/economics preserve population, baseline, and context; for science/medicine preserve conditions and uncertainty.

Return JSON with domain, selectedFormat, rationale, audienceModel, learningObjectives, conceptSequence, misconceptionPlan, analogyPlan, narrativeBeats, visualApproach, comprehensionChecks, domainGuardrails. JSON only.`,
  }, input);
}
