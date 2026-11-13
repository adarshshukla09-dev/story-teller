// src/skills/skills-registry.ts

export type SkillReference = {
  repository: string;
  name: string;
};

export const skillRegistry = {
  director: [
    { repository: "custom", name: "reference-video-style" },
    { repository: "custom", name: "director" },
  ],

  script: [
    { repository: "custom", name: "reference-video-style" },
    { repository: "custom", name: "scriptwriter" },
  ],

  storyboard: [
    { repository: "custom", name: "reference-video-style" },
    { repository: "custom", name: "storyboard" },
  ],

  imagePrompt: [
    { repository: "custom", name: "reference-video-style" },
    { repository: "custom", name: "visual-director" },
  ],

  continuity: [
    { repository: "custom", name: "reference-video-style" },
    { repository: "custom", name: "continuity" },
  ],

  qa: [
    { repository: "custom", name: "reference-video-style" },
    { repository: "custom", name: "qa" },
  ],
  composition: [
    { repository: "custom", name: "reference-video-style" },
    { repository: "custom", name: "composition" },
  ],
  renderer: [
    { repository: "custom", name: "reference-video-style" },
    { repository: "custom", name: "renderer" },
  ],
} satisfies Record<string, SkillReference[]>;

export type AgentTask = keyof typeof skillRegistry;

export function getSkillReferences(task: AgentTask): SkillReference[] {
  return skillRegistry[task];
}

export function isValidTask(task: string): task is AgentTask {
  return Object.prototype.hasOwnProperty.call(skillRegistry, task);
}
