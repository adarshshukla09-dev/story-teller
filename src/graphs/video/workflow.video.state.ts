import { Annotation } from "@langchain/langgraph";

interface TextOverlays {
  header: string;
  captionLine1: string;
  captionLine2: string | null;
  redEmphasis: string | null;
  diagramLabels: string[];
}

interface ImageType {
  filePath: string; // generated SVG path
  svgCodePath: string; // generated JS path

  sceneId: number;
  prompt: string; // layout spec written by the prompt agent

  rawImagePrompt: string;
  negativePrompt: string;
  requiredElements: string[];
  mustNotInclude: string[];
  textOverlays: TextOverlays;
  compositionPlan: unknown;

  imageLocation: string;
}

interface NarrationType {
  filePath: string;
  sceneId: number;
  narration: string;
  fileLocation: string;
}

interface TimeStampType {
  sceneId: number;
  startTime: string;
  endTime: string;
}

export const videoState = Annotation.Root({
  Image: Annotation<ImageType[]>(),
  narration: Annotation<NarrationType[]>(),
  timeStamp: Annotation<TimeStampType[]>(),
});

export type { ImageType, TextOverlays };
