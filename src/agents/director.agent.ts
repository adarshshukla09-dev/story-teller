import { runAgent } from "./base.agent.js";

export async function directorAgent(topic: string) {
  return runAgent(
    {
      name: "Universal Explainer Story Architect",
      task: "director",
      role: `
Design an accurate, compelling explanatory story for the topic and audience.
The system must work across paradoxes, computer science, engineering, history, medicine,
science, economics, and other fields. First diagnose the viewer's question and the one
portable idea; then identify the real mechanism, evidence, causal sequence, or decision rule.
Choose a story shape and visual mode that fit the subject. A human protagonist, analogy,
dramatic twist, and opening/ending callback are optional tools, never mandatory devices.
Do not invent human experiences, historical dialogue, medical cases, sources, or motives.
Preserve uncertainty and domain-specific safeguards. Ensure every beat teaches something
and the final beat resolves the opening question. Follow the director skill and shared
storytelling standard. Return the exact JSON contract specified by the director skill. JSON only.
`,
    },
    topic,
  );
}
