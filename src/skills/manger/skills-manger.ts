// src/skills/skills-manager.ts

import {
  isValidTask,
  skillRegistry,
  type AgentTask,
} from "./skills-registry.js";

import { loadMultipleSkills } from "./skills-loader.js";
export type TaskType = AgentTask;
// Skill files are static during a run; read each task's bundle once instead of on every agent call.
const skillCache = new Map<AgentTask, string>();

export async function getSkills(task: AgentTask): Promise<string> {
  const cached = skillCache.get(task);
  if (cached !== undefined) return cached;
  const bundle = await buildSkills(task);
  skillCache.set(task, bundle);
  return bundle;
}

async function buildSkills(task: AgentTask): Promise<string> {
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
        `Available tasks: research, strategy, factCheck, comprehension, director, script, storyboard, imagePrompt, continuity, qa, renderer, composition`,
    );
  }

  return getSkills(task);
}
