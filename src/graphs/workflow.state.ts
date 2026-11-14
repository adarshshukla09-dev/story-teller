import { Annotation } from "@langchain/langgraph";

import type { ValidatorReport } from "../skills/custom/skills/qa/validate_package.js";
import type { Stage } from "../agents/QA.agent.js";

// ------------------------------------
// Storyboard
// ------------------------------------

export interface Scene {
  sceneId: number;
  sourceBeatIds?: string[];

  // Copied verbatim from the script beat; never edited by the storyboard agent.
  narration: string;
  estimatedDurationSeconds?: number;
  /** @deprecated older storyboards used `duration`; prefer estimatedDurationSeconds. */
  duration?: number;

  centralIdea?: string;
  visualPurpose: string;
  visualMetaphor?: string;
  analogyRelationShown?: string | null;
  compositionType?: string;
  primarySubject?: string;
  supportingElements?: string[];
  isAhaCard?: boolean;
  echoesScene?: number | null;

  characters?: {
    characterId: string;
    name?: string;
    expression?: string;
    pose?: string;
  }[];

  // Exact programmatic text from storyboard
  headerText?: string;

  caption?: {
    line1: string;
    line2?: string;
    redEmphasis?: string;
  };

  programmaticOverlays?: {
    diagramLabels?: string[];
  };

  transitionToNext?: string;
}

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

/** Shape of the JSON string that qaNode stores in `qualityReport`. */
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
  factReview: unknown[];
  analogyReview: unknown[];
  depictionReview: unknown[];
  creativeScores?: {
    hookAndCuriosity: number;
    narrativeStructure: number;
    centralIdeaClarity: number;
    causeAndEffectProgression: number;
    emotionalEngagement: number;
    analogyQualityAndFidelity: number;
    visualStorytelling: number;
    ahaMomentAndPayoff: number;
    factualAccuracy: number;
    endingAndMemorability: number;
    average: number;
    rationales?: Record<string, string>;
  } | null;
  summary: string | null;
}

// ------------------------------------
// LangGraph Film State
// ------------------------------------

export const FilmState = Annotation.Root({
  topic: Annotation<string>(),

  // Parsed objects (not JSON strings), so every stage and the validator read the same data.
  creativeBrief: Annotation<any>({
    reducer: (_, next) => next,
    default: () => null,
  }),

  script: Annotation<any>({
    reducer: (_, next) => next,
    default: () => null,
  }),

  // Storyboard's original structured output (raw agent text; qaNode parses it on demand)
  storyboard: Annotation<string>({
    reducer: (_, next) => next,
    default: () => "",
  }),

  // Normalized scenes extracted from storyboard
  scenes: Annotation<Scene[]>({
    reducer: (_, next) => next,
    default: () => [],
  }),

  // Art Direction output. It is an object ({ imagePrompts: [...] }), not an array.
  visualCompositions: Annotation<any>({
    reducer: (_, next) => next,
    default: () => null,
  }),

  // Canonical visual identity (parsed: { productionBible, continuityChecks, globalRules })
  productionBible: Annotation<any>({
    reducer: (_, next) => next,
    default: () => null,
  }),

  // Composition Designer output
  compositionPlan: Annotation<CompositionPlan[]>({
    reducer: (_, next) => next,
    default: () => [],
  }),

  // Visual Director output
  visualPrompts: Annotation<VisualPrompt[]>({
    reducer: (_, next) => next,
    default: () => [],
  }),

  // Optional global style description for prompt construction
  visualStyle: Annotation<string>({
    reducer: (_, next) => next,
    default: () => "",
  }),

  // QA output
  qualityReport: Annotation<QualityReport | string>({
    reducer: (_, next) => next,
    default: () => "",
  }),

  qualityStatus: Annotation<"pass" | "revise">({
    reducer: (_, next) => next,
    default: () => "revise",
  }),

  // Earliest stage QA sent the pipeline back to (undefined when passing or before the first QA run)
  reviseTarget: Annotation<Stage | undefined>({
    reducer: (_, next) => next,
    default: () => undefined,
  }),

  // De-duplicated issue list appended to the failing agent's input on the next attempt
  qaFeedback: Annotation<string>({
    reducer: (_, next) => next,
    default: () => "",
  }),

  // Raw deterministic validator output from the latest QA run
  validatorReport: Annotation<ValidatorReport | null>({
    reducer: (_, next) => next,
    default: () => null,
  }),

  revisionCount: Annotation<number>({
    reducer: (_, next) => next,
    default: () => 0,
  }),
});
