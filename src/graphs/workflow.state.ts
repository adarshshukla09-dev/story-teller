import { Annotation } from "@langchain/langgraph";
import type { FactCheckResultOutput } from "../schema/factCheck.schema.js";

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

export type IssueSeverity = "blocking" | "major" | "minor";

export type FactCheckResult = FactCheckResultOutput;

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

  svgValidationIssues: Annotation<string[]>({
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

  svgIllustrations: Annotation<string>(),

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

  errors: Annotation<string[]>({
    value: (current, update) => [...current, ...update],
    default: () => [],
  }),
});

/* =========================================
   PRODUCTION STATE TYPE
========================================= */

export type ProductionStateType = typeof ProductionState.State;
