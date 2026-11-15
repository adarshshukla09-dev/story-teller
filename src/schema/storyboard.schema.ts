import type { Scene } from "./scene.schema.js";

export interface Storyboard {
  videoTitle: string;
  oneIdea: string;
  videoStyle: string;
  aspectRatio: "9:16";
  timingMode: string;
  sourceNarrationFingerprint?: string | null;
  cardTemplate: {
    headerPosition: string;
    artworkPosition: string;
    captionPosition: string;
  };
  scenes: Scene[];
  upstreamIssues: unknown[];
  [key: string]: unknown;
}
