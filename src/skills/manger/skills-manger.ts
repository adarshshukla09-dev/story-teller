// src/skills/skills-manager.ts

import {
  isValidTask,
  skillRegistry,
  type AgentTask,
} from "./skills-registry.js";

import { loadMultipleSkills } from "./skills-loader.js";
export type TaskType = AgentTask;
export async function getSkills(task: AgentTask): Promise<string> {
  const references = skillRegistry[task];

  if (!references) {
    throw new Error(`No skills registered for agent task: "${task}"`);
  }
  // Load all registered skills for this agent.
  const skills = await loadMultipleSkills(references);

  // Combine them into one instruction.
  return references
    .map((reference, index) => {
      return `
==================================================
SKILL: ${reference.name}
REPOSITORY: ${reference.repository}
==================================================

${skills[index]}
`;
    })
    .join("\n\n");
}

export async function getSkillsForTask(task: string): Promise<string> {
  if (!isValidTask(task)) {
    throw new Error(
      `Unknown agent task: "${task}". ` +
        `Available tasks: director, script, storyboard, imagePrompt, continuity, qa, renderer`,
    );
  }

  return getSkills(task);
}
