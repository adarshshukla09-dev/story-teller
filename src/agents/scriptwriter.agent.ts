import { runAgent } from "./base.agent.js";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const promptPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../prompts/story_script.md");

export const SCRIPT_AGENT_PROMPT = `
For every scene, negativePrompt must be exactly: "text inside the illustration area, speech bubbles, thought bubbles, object labels, realistic shading, 3D, gradients, extra characters".
mustNotInclude always contains: "speech bubbles", "thought bubbles", "object labels", "pseudo-writing", "extra characters".
header is 2 to 4 uppercase words, never a sentence or quote.
captionLine1 is max 40 characters, uppercase, and has no nested quotes. captionLine2 is null or max 40 characters.
redEmphasis is one exact word from the caption, or null.
Do not use speech or thought bubbles. Show thinking with a "?" mark or sweat drop.
`;

export async function buildStoryScriptPrompt(topic: string, targetDuration = 60, coreConcept = topic) {
  const template = await fs.readFile(promptPath, "utf8");
  return `${template}\n\n${SCRIPT_AGENT_PROMPT}`.replaceAll("{{TOPIC}}", topic).replaceAll("{{CORE_CONCEPT}}", coreConcept).replaceAll("{{TARGET_DURATION}}", String(targetDuration));
}

export async function scriptwriterAgent(input: string) {
  return runAgent(
    {
      name: "Universal Explainer Scriptwriter",
      task: "script",
      temperature: 0.4,
    },
    input,
  );
}
