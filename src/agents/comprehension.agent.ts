import { runAgent } from "./base.agent.js";

export async function comprehensionAgent(input: string) {
  return runAgent({
    name: "Viewer Comprehension Evaluator",
    task: "comprehension",
    temperature: 0.2,
    role: `Evaluate whether a curious beginner can learn from the script. Test whether they can explain the central idea in their own words, distinguish nearby concepts, explain why/how it works, apply it to a new example, and correct the key misconception. Identify prerequisite gaps, jargon, unexplained leaps, and places where analogy substitutes for mechanism. Return JSON with status (pass|revise), score (0-100), tests [{skill,pass,evidence,gap}], blockingGaps, revisionInstructions, summary. Do not reward style when understanding is missing. Require at least 80/100 and no blocking gaps. JSON only.`,
  }, input);
}
