import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { SkillReference } from "./skills-registry.js";

// Resolve relative to this file, not the working directory, so the app runs from any cwd.
const SKILLS_ROOT = fileURLToPath(new URL("..", import.meta.url));

export async function loadSkill(
  repository: string,
  skillName: string,
): Promise<string> {
  const skillPath = path.resolve(
    SKILLS_ROOT,
    repository,
    "skills",
    skillName,
    "SKILL.md",
  );

  // Prevent paths from escaping the skills directory.
  const relativePath = path.relative(SKILLS_ROOT, skillPath);

  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    throw new Error(`Invalid skill path: ${repository}/${skillName}`);
  }

  try {
    return await fs.readFile(skillPath, "utf-8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new Error(
        `Skill not found: ${repository}/${skillName}/SKILL.md\n` +
          `Expected location: ${skillPath}`,
      );
    }

    throw error;
  }
}

export async function loadMultipleSkills(
  references: SkillReference[],
): Promise<string[]> {
  return Promise.all(
    references.map(({ repository, name }) => loadSkill(repository, name)),
  );
}
