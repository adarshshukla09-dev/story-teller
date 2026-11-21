export type BeatConnector = "START" | "BUT" | "THEREFORE";

export interface SuggestedCaption {
  line1: string;
  line2?: string;
  redEmphasis?: string;
}

/** Canonical beat-level source of truth for narration, timing and claim provenance. */
export interface ScriptBeat {
  beatId: string;
  cardNumber: number;
  stage: string;
  connector: BeatConnector;
  narration: string;
  estimatedDurationSeconds: number;
  suggestedCaption: SuggestedCaption;
  isAhaCard: boolean;
  /** IDs must resolve to creativeBrief.claimLedger[].id. */
  claimIds: string[];
  /** Recomputed by normalizeScript; model-provided values are not authoritative. */
  wordCount?: number;
}

/** Canonical script output. Computed fields are populated by normalizeScript. */
export interface Script {
  title: string;
  oneIdea: string;
  estimatedDurationSeconds: number;
  beats: ScriptBeat[];
  narration?: string;
  totalWordCount?: number;
  durationSumCheck?: number;
  factCheckRequired?: unknown[];
  storyPlan?: {
    centralQuestion: string;
    thesis: string;
    keyConcepts: string[];
    character: string;
    recurringMotif: string;
    emotionalArc: string;
  };
  [key: string]: unknown;
}
