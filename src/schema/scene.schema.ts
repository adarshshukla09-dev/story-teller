export interface Scene {
  sceneId: number;
  sourceBeatIds: string[];

  /** Copied verbatim from its source script beat. */
  narration: string;
  estimatedDurationSeconds: number;
  centralIdea: string;
  visualPurpose: string;
  visualMetaphor?: string | null;
  analogyRelationShown?: string | null;
  compositionType: string;
  primarySubject: string;
  supportingElements: string[];
  isAhaCard: boolean;
  echoesScene: number | null;

  characters: {
    characterId: string;
    name?: string;
    expression?: string;
    pose?: string;
  }[];

  headerText: string;
  caption: {
    line1: string;
    line2?: string;
    redEmphasis?: string;
  };
  programmaticOverlays: {
    diagramLabels: string[];
  };
  transitionToNext: string;
}
