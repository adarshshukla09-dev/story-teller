import { Annotation } from "@langchain/langgraph";
import type { FactCheckResultOutput } from "../schema/fact.schema.js";

/* =========================================
   FACT-CHECK TYPES
========================================= */

export type FactCheckVerdict =
  | "verified"
  | "unsupported"
  | "false"
  | "disputed"
  | "misleading"
  | "unverifiable";
export interface SceneImageTask {
  sceneId: number;
  prompt: string;
  negativePrompt?: string;
}
export type IssueSeverity = "blocking" | "major" | "minor";

export type FactCheckResult = FactCheckResultOutput;

export interface GeneratedSceneImage {
  sceneId: number;
  imageUrl?: string;
  base64?: string;
  mimeType?: string;
}

/* =========================================
   PRODUCTION STATE
========================================= */

export const ProductionState = Annotation.Root({
  // =======================================
  // USER INPUT
  // =======================================

  topic: Annotation<string>(),

  // =======================================
  // UNDERSTANDING
  // =======================================

  comprehension: Annotation<string>(),

  // =======================================
  // RESEARCH
  // =======================================

  researchDossier: Annotation<string>(),

  // =======================================
  // FACT CHECK
  // =======================================

  factCheck: Annotation<FactCheckResult | null>({
    value: (_current, update) => update,
    default: () => null,
  }),

  factCheckStatus: Annotation<"pending" | "approved" | "revision_required">({
    value: (_current, update) => update,
    default: () => "pending",
  }),

  factCheckRevisionCount: Annotation<number>({
    value: (_current, update) => update,
    default: () => 0,
  }),

  visualRevisionCount: Annotation<number>({
    value: (_, update) => update,
    default: () => 0,
  }),

  failedSceneIds: Annotation<number[]>({
    value: (_, update) => update,
    default: () => [],
  }),

  imageValidationIssues: Annotation<string[]>({
    value: (_, update) => update,
    default: () => [],
  }),

  // =======================================
  // EXPLANATION PLANNING
  // =======================================

  visualQaIssues: Annotation<string[]>({
    value: (_, update) => update,
    default: () => [],
  }),

  explanationStrategy: Annotation<string>(),

  // =======================================
  // STORY ARCHITECTURE
  // =======================================

  directorOutput: Annotation<string>(),

  // =======================================
  // SCRIPT
  // =======================================

  script: Annotation<string>(),

  // =======================================
  // SCRIPT QA
  // =======================================

  qaFeedback: Annotation<string>(),

  qaStatus: Annotation<"pending" | "approved" | "revision_required">({
    value: (_current, update) => update,
    default: () => "pending",
  }),

  revisionCount: Annotation<number>({
    value: (_current, update) => update,
    default: () => 0,
  }),

  // =======================================
  // VISUAL PRODUCTION
  // =======================================

  storyboard: Annotation<string>(),

  composition: Annotation<string>(),

  continuity: Annotation<string>(),

  visualPrompts: Annotation<string>(),
  generatedImagePrompts: Annotation<SceneImageTask[]>({
    value: (_, update) => update,
    default: () => [],
  }),
  generatedImages: Annotation<GeneratedSceneImage[]>({
    value: (_current, update) => update,
    default: () => [],
  }),

  artDirection: Annotation<string>(),

  // =======================================
  // FINAL OUTPUT
  // =======================================

  finalOutput: Annotation<string>(),

  referenceScript: Annotation<string>(),

  // =======================================
  // FINAL QA
  // =======================================

  finalQaFeedback: Annotation<string>(),

  finalQaStatus: Annotation<"pending" | "approved" | "revision_required">({
    value: (_current, update) => update,
    default: () => "pending",
  }),

  // =======================================
  // ERROR TRACKING
  // =======================================
  // =======================================
  // SEQUENTIAL IMAGE GENERATION
  // =======================================

  sceneImageQueue: Annotation<SceneImageTask[]>({
    value: (_, update) => update,
    default: () => [],
  }),

  sceneImageIndex: Annotation<number>({
    value: (_, update) => update,
    default: () => 0,
  }),
  errors: Annotation<string[]>({
    value: (current, update) => [...current, ...update],
    default: () => [],
  }),
});

/* =========================================
   PRODUCTION STATE TYPE
========================================= */

export type ProductionStateType = typeof ProductionState.State;
