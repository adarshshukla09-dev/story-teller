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

  if (!references || references.length === 0) {
    throw new Error(`No skills registered for agent task: "${task}"`);
  }

  // Load all registered skills for this agent.
  const skills = await loadMultipleSkills(references);

  // Validate that every registered reference produced non-empty content.
  references.forEach((reference, index) => {
    const content = skills[index];
    if (typeof content !== "string" || content.trim().length === 0) {
      throw new Error(
        `Empty or missing skill content for task "${task}": ${reference.name} (repo: ${reference.repository})`,
      );
    }
  });

  // Combine them into one instruction.
  return references
    .map((reference, index) => {
      return `
==================================================
SKILL: ${reference.name}
REPOSITORY: ${reference.repository}
==================================================

${skills[index]!.trim()}
`;
    })
    .join("\n\n");
}

export async function getSkillsForTask(task: string): Promise<string> {
  if (!isValidTask(task)) {
    const available = Object.keys(skillRegistry).join(", ");
    throw new Error(
      `Unknown agent task: "${task}". Available tasks: ${available}`,
    );
  }

  return getSkills(task);
}
