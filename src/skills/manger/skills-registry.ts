// src/skills/skills-registry.ts

export type SkillReference = {
  repository: string;
  name: string;
};

export const skillRegistry = {
  research: [{ repository: "custom", name: "research" }],
  strategy: [
    { repository: "custom", name: "strategy" },
    { repository: "custom", name: "storycraft" },
  ],
  factCheck: [{ repository: "custom", name: "fact-check" }],
  comprehension: [{ repository: "custom", name: "comprehension" }],
  director: [
    { repository: "custom", name: "reference-video-style" },
    { repository: "custom", name: "director" },
    { repository: "custom", name: "storycraft" },
  ],

  script: [
    { repository: "custom", name: "reference-video-style" },
    { repository: "custom", name: "scriptwriter" },
    { repository: "custom", name: "storycraft" },
  ],

  storyboard: [
    { repository: "custom", name: "reference-video-style" },
    { repository: "custom", name: "storyboard" },
    { repository: "custom", name: "storycraft" },
  ],
  // skills-registry.ts

  artDirection: [
    { repository: "custom", name: "reference-video-style" },
    { repository: "custom", name: "art-direction" },
  ],

  imagePrompt: [
    { repository: "custom", name: "reference-video-style" },
    { repository: "custom", name: "visual-director" },
  ],
  svgIllustration: [
    { repository: "custom", name: "reference-video-style" },
    { repository: "custom", name: "svg-illustrator" },
  ],

  continuity: [
    { repository: "custom", name: "reference-video-style" },
    { repository: "custom", name: "continuity" },
  ],

  qa: [
    { repository: "custom", name: "reference-video-style" },
    { repository: "custom", name: "qa" },
    { repository: "custom", name: "storycraft" },
  ],
  composition: [
    { repository: "custom", name: "reference-video-style" },
    { repository: "custom", name: "composition" },
  ],
  renderer: [
    { repository: "custom", name: "reference-video-style" },
    { repository: "custom", name: "renderer" },
  ],
  finalqa: [
    { repository: "custom", name: "reference-video-style" },
    { repository: "custom", name: "finalQA" },
  ],
} satisfies Record<string, SkillReference[]>;

export type AgentTask = keyof typeof skillRegistry;

export function getSkillReferences(task: AgentTask): SkillReference[] {
  return skillRegistry[task];
}

export function isValidTask(task: string): task is AgentTask {
  return Object.prototype.hasOwnProperty.call(skillRegistry, task);
}
