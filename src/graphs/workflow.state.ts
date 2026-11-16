import { Annotation } from "@langchain/langgraph";

import type { ValidatorReport } from "../skills/custom/skills/qa/validate_package.js";
import type { Scene } from "../schema/scene.schema.js";
import type { Script } from "../schema/script.schema.js";

export type { Scene } from "../schema/scene.schema.js";

// ------------------------------------
// Workflow Stage
// ------------------------------------

export type Stage =
  | "brief"
  | "script"
  | "storyboard"
  | "composition"
  | "continuity"
  | "visualPrompts"
  | "svgIllustrations";

// ------------------------------------
// Composition Designer
// ------------------------------------

export interface CompositionElement {
  element: string;
  position: string;

  coordinates:
    | {
        x: number;
        y: number;
      }
    | {
        x: number;
        y: number;
      }[];

  relativeSize: "large" | "medium" | "small";
  depth: "foreground" | "midground" | "background";
  visualPriority: number;
  relationship?: string;
}

export type CreativeScore = number | null;

export interface CreativeScores {
  hookAndCuriosity: CreativeScore;
  narrativeStructure: CreativeScore;
  centralIdeaClarity: CreativeScore;
  causeAndEffectProgression: CreativeScore;
  emotionalEngagement: CreativeScore;
  analogyQualityAndFidelity: CreativeScore;
  visualStorytelling: CreativeScore;
  ahaMomentAndPayoff: CreativeScore;
  factualAccuracy: CreativeScore;
  endingAndMemorability: CreativeScore;
  average: number | null;
  rationales: Record<string, string>;
}

export interface CompositionPlan {
  sceneId: number;
  compositionType: string;
  primarySubject: CompositionElement;
  elements: CompositionElement[];
  visualHierarchy: string[];
  visualFlow: string;
  negativeSpace: string;

  safeZones: {
    headerSafeZone: string;
    artworkZone: string;
    captionSafeZone: string;
  };

  continuityNotes?: string;
}

// ------------------------------------
// Visual Director
// ------------------------------------

export interface SvgAsset {
  sceneId: number;
  svg: string;
}

export interface VisualPrompt {
  sceneId: number;
  assetType: "central-artwork";
  prompt: string;

  negativePrompt: string;
  requiredElements: string[];
  mustNotInclude: string[];

  textOverlays: {
    header: string | null;
    captionLine1: string | null;
    captionLine2: string | null;
    redEmphasis: string | null;
    diagramLabels: string[];
  };
}

// ------------------------------------
// Continuity
// ------------------------------------

export interface ProductionBible {
  videoTitle: string;
  aspectRatio: "9:16";

  cardTemplate: {
    headerSafeZone: string;
    artworkZone: string;
    captionSafeZone: string;
  };

  palette: Record<string, unknown>;
  drawingStyle: Record<string, unknown>;
  characters: Record<string, unknown>[];
  propsAndSymbols: Record<string, unknown>[];
  captionRules: Record<string, unknown>;
}

// ------------------------------------
// QA
// ------------------------------------

/** Structured independent QA report stored in workflow state. */
export interface QualityReport {
  status: "pass" | "revise";
  reviseTarget: Stage | null;
  timingAudit: Record<string, unknown>;

  blockingIssues: {
    gate: string;
    sceneId: number | string | null;
    problem: string;
    requiredFix?: string;
  }[];

  reviewItems: {
    gate: string;
    sceneId: number | string | null;
    problem: string;
  }[];

  factReview: unknown;
  analogyReview: unknown[];
  depictionReview: unknown[];

  // Creative scores are an object containing individual dimensions,
  // average score, and rationales.
  creativeScores: CreativeScores;

  summary: string | null;
}

// ------------------------------------
// LangGraph Film State
// ------------------------------------

export const FilmState = Annotation.Root({
  topic: Annotation<string>(),

  sourceMaterials: Annotation<any[]>({
    reducer: (_, next) => next,
    default: () => [],
  }),

  audience: Annotation<string>({
    reducer: (_, next) => next,
    default: () => "curious beginner",
  }),

  researchDossier: Annotation<any>({
    reducer: (_, next) => next,
    default: () => null,
  }),

  explanationStrategy: Annotation<any>({
    reducer: (_, next) => next,
    default: () => null,
  }),

  factCheckReport: Annotation<any>({
    reducer: (_, next) => next,
    default: () => null,
  }),

  comprehensionReport: Annotation<any>({
    reducer: (_, next) => next,
    default: () => null,
  }),

  // Parsed objects (not JSON strings).
  creativeBrief: Annotation<any>({
    reducer: (_, next) => next,
    default: () => null,
  }),

  script: Annotation<Script | string | null>({
    reducer: (_, next) => next,
    default: () => null,
  }),

  // Storyboard's original structured output.
  storyboard: Annotation<string>({
    reducer: (_, next) => next,
    default: () => "",
  }),

  // Normalized scenes extracted from storyboard.
  scenes: Annotation<Scene[]>({
    reducer: (_, next) => next,
    default: () => [],
  }),

  // Art Direction output.
  visualCompositions: Annotation<any>({
    reducer: (_, next) => next,
    default: () => null,
  }),

  // Canonical visual identity.
  productionBible: Annotation<any>({
    reducer: (_, next) => next,
    default: () => null,
  }),

  // Composition Designer output.
  compositionPlan: Annotation<CompositionPlan[]>({
    reducer: (_, next) => next,
    default: () => [],
  }),

  // Visual Director output.
  visualPrompts: Annotation<VisualPrompt[]>({
    reducer: (_, next) => next,
    default: () => [],
  }),

  // Topic-specific artwork generated as self-contained SVG per scene.
  svgAssets: Annotation<SvgAsset[]>({
    reducer: (_, next) => next,
    default: () => [],
  }),

  svgIssues: Annotation<string[]>({
    reducer: (_, next) => next,
    default: () => [],
  }),

  visualStyle: Annotation<string>({
    reducer: (_, next) => next,
    default: () => "",
  }),

  // QA output.
  qualityReport: Annotation<QualityReport | null>({
    reducer: (_, next) => next,
    default: () => null,
  }),

  qualityStatus: Annotation<"pass" | "revise">({
    reducer: (_, next) => next,
    default: () => "revise",
  }),

  // Earliest stage QA sent the pipeline back to.
  reviseTarget: Annotation<Stage | undefined>({
    reducer: (_, next) => next,
    default: () => undefined,
  }),

  // Feedback appended to the failing agent's input.
  qaFeedback: Annotation<string>({
    reducer: (_, next) => next,
    default: () => "",
  }),

  // Raw deterministic validator output.
  validatorReport: Annotation<ValidatorReport | null>({
    reducer: (_, next) => next,
    default: () => null,
  }),

  revisionCount: Annotation<number>({
    reducer: (_, next) => next,
    default: () => 0,
  }),
});
