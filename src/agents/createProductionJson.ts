import fs from "node:fs/promises";
import path from "node:path";

interface ScriptBeat {
  cardNumber?: number;
  scene?: number;
  sceneId?: number;
  beat?: number;
  estimatedDurationSeconds?: number;
  time?: string;
  narration: string;
  imageDetails?: string;
  visualPrompt?: string;
  caption?: string;
  onScreenText?: string;
}

interface ImagePromptAsset {
  sceneId?: number;
  scene?: number;
  prompt: string;
  negativePrompt?: string;
  requiredElements?: string[];
  mustNotInclude?: string[];
  textOverlays?: Record<string, unknown>;
}

interface GeneratedImage {
  sceneId: number;
  imageUrl?: string;
  base64?: string;
  mimeType?: string;
}

interface CompositionItem {
  sceneId?: number;
  scene?: number;
  [key: string]: unknown;
}

interface ExtractionInput {
  topic?: string;
  script?: string | { beats?: ScriptBeat[]; script?: ScriptBeat[] };
  storyboard?: string | { videoTitle?: string; scenes?: any[] };
  visualPrompts?: string | { imagePrompts?: ImagePromptAsset[]; scenes?: ImagePromptAsset[] };
  generatedImagePrompts?: ImagePromptAsset[];
  generatedImages?: GeneratedImage[];
  composition?: string | { compositionPlan?: CompositionItem[] };
  finalOutput?: string | ExtractionInput;
}

interface ProductionScene {
  sceneNo: number;
  narration: string;
  startTime: number;
  endTime: number;
  imagePrompt: string;
  negativePrompt: string;
  requiredElements: string[];
  mustNotInclude: string[];
  textOverlays: Record<string, unknown>;
  compositionPlan: CompositionItem | null;
  imageGenerated: boolean;
  imageUrl?: string;
  imageMimeType?: string;
  plannedImageFile: string;
}

interface ProductionOutput {
  projectTitle: string;
  aspectRatio: "1:1";
  resolution: { width: 1080; height: 1080 };
  estimatedTotalDuration: number;
  assetStatus: "prompts_ready_images_not_generated" | "images_generated" | "images_partially_generated";
  scenes: ProductionScene[];
}

function parseJson<T>(value: string | T | undefined, label: string): T {
  if (value === undefined) throw new Error(`Missing ${label}.`);
  if (typeof value !== "string") return value as T;

  const cleaned = value.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try {
    return JSON.parse(cleaned) as T;
  } catch (error) {
    throw new Error(`Could not parse ${label} JSON: ${(error as Error).message}`);
  }
}

function getRoot(input: ExtractionInput): ExtractionInput {
  return input.finalOutput
    ? parseJson<ExtractionInput>(input.finalOutput, "finalOutput")
    : input;
}

function resolveDurationSeconds(beat: ScriptBeat, scene: any): number {
  const explicit = Number(beat.estimatedDurationSeconds ?? scene.estimatedDurationSeconds);
  if (Number.isFinite(explicit) && explicit > 0) return explicit;

  const range = String(beat.time ?? scene.time ?? "").match(/([\d.]+)\s*[-–]\s*([\d.]+)/);
  if (!range) return Number.NaN;
  const start = Number(range[1]);
  const end = Number(range[2]);
  return Number.isFinite(start) && Number.isFinite(end) && end > start
    ? end - start
    : Number.NaN;
}

function sceneNumber(beat: ScriptBeat, index: number): number {
  return Number(beat.sceneId ?? beat.scene ?? beat.cardNumber ?? beat.beat ?? index + 1);
}

function promptList(value: ExtractionInput["visualPrompts"]): ImagePromptAsset[] {
  const parsed = parseJson<any>(value, "visualPrompts");
  if (Array.isArray(parsed)) return parsed;
  if (Array.isArray(parsed?.imagePrompts)) return parsed.imagePrompts;
  if (Array.isArray(parsed?.scenes)) return parsed.scenes;
  throw new Error("visualPrompts must contain an imagePrompts array.");
}

export async function createProductionJson(
  input: ExtractionInput,
  outputDir: string,
): Promise<ProductionOutput> {
  if (!input || typeof input !== "object") {
    throw new Error("Input must be a valid production JSON object.");
  }

  const root = getRoot(input);
  const parsedScript = parseJson<{ beats?: ScriptBeat[]; script?: ScriptBeat[] }>(root.script, "script");
  // Legacy scriptwriter responses used { script: [...] }; canonical responses use { beats: [...] }.
  const beats = Array.isArray(parsedScript.beats)
    ? parsedScript.beats
    : parsedScript.script;
  if (!Array.isArray(beats) || beats.length === 0) {
    throw new Error("script must contain a non-empty beats array (or legacy script array).");
  }
  if (beats.length < 14 || beats.length > 16) {
    throw new Error(`The final card package requires 14–16 scenes (received ${beats.length}).`);
  }

  const storyboard = parseJson<{ videoTitle?: string; scenes?: any[] }>(root.storyboard, "storyboard");
  if (!Array.isArray(storyboard.scenes) || storyboard.scenes.length !== beats.length) {
    throw new Error(`Storyboard scene count must match script beats (${beats.length}).`);
  }

  const visualPrompts = root.visualPrompts ? promptList(root.visualPrompts) : [];
  const generatedPromptList = Array.isArray(root.generatedImagePrompts)
    ? root.generatedImagePrompts
    : visualPrompts;
  const promptByScene = new Map<number, ImagePromptAsset>();
  for (const prompt of [...visualPrompts, ...generatedPromptList]) {
    const id = Number(prompt.sceneId ?? prompt.scene);
    if (!Number.isInteger(id) || id < 1) continue;
    const existing = promptByScene.get(id);
    promptByScene.set(id, {
      ...existing,
      ...prompt,
      // Prefer the exact prompt sent through the image node when available.
      prompt: prompt.prompt || existing?.prompt || "",
      negativePrompt: prompt.negativePrompt || existing?.negativePrompt || "",
      textOverlays: prompt.textOverlays ?? existing?.textOverlays ?? {},
    });
  }

  const composition = root.composition
    ? parseJson<{ compositionPlan?: CompositionItem[] }>(root.composition, "composition")
    : { compositionPlan: [] };
  const compositionByScene = new Map<number, CompositionItem>();
  for (const item of composition.compositionPlan ?? []) {
    const id = Number(item.sceneId ?? item.scene);
    if (Number.isInteger(id)) compositionByScene.set(id, item);
  }

  const storyboardByScene = new Map<number, any>();
  for (const [index, scene] of storyboard.scenes.entries()) {
    const id = Number(scene.sceneId ?? index + 1);
    if (id !== index + 1) {
      throw new Error(`Storyboard scene IDs must be sequential; expected ${index + 1}, received ${id}.`);
    }
    storyboardByScene.set(id, scene);
  }

  const imagesByScene = new Map<number, GeneratedImage>();
  for (const image of root.generatedImages ?? []) {
    if (Number.isInteger(image.sceneId)) imagesByScene.set(image.sceneId, image);
  }

  await fs.mkdir(outputDir, { recursive: true });
  let currentTime = 0;
  const scenes: ProductionScene[] = [];

  for (const [index, beat] of beats.entries()) {
    const sceneNo = sceneNumber(beat, index);
    if (!Number.isInteger(sceneNo) || sceneNo !== index + 1) {
      throw new Error(`Script scene IDs must be sequential; expected ${index + 1}, received ${sceneNo}.`);
    }
    if (!beat.narration?.trim()) throw new Error(`Scene ${sceneNo} is missing narration.`);

    const storyboardScene = storyboardByScene.get(sceneNo);
    if (!storyboardScene) throw new Error(`No storyboard scene found for scene ${sceneNo}.`);
    const imagePrompt = promptByScene.get(sceneNo);
    if (!imagePrompt?.prompt?.trim()) throw new Error(`Scene ${sceneNo} is missing its image-generation prompt.`);

    const duration = Number(resolveDurationSeconds(beat, storyboardScene).toFixed(1));
    const legacyRange = beat.estimatedDurationSeconds === undefined && Boolean(beat.time);
    const minDuration = legacyRange ? 0.5 : 3;
    const maxDuration = legacyRange ? 10 : 4;
    if (!Number.isFinite(duration) || duration < minDuration || duration > maxDuration) {
      throw new Error(`Scene ${sceneNo} duration must be ${minDuration}–${maxDuration} seconds (received ${beat.estimatedDurationSeconds ?? beat.time ?? "missing"}).`);
    }

    const startTime = Number(currentTime.toFixed(1));
    const endTime = Number((startTime + duration).toFixed(1));
    currentTime = endTime;

    const image = imagesByScene.get(sceneNo);
    scenes.push({
      sceneNo,
      narration: beat.narration.trim(),
      startTime,
      endTime,
      imagePrompt: imagePrompt.prompt.trim(),
      negativePrompt: imagePrompt.negativePrompt ?? "",
      requiredElements: imagePrompt.requiredElements ?? [],
      mustNotInclude: imagePrompt.mustNotInclude ?? [],
      textOverlays: imagePrompt.textOverlays ?? {},
      compositionPlan: compositionByScene.get(sceneNo) ?? null,
      imageGenerated: Boolean(image?.imageUrl || image?.base64),
      ...(image?.imageUrl ? { imageUrl: image.imageUrl } : {}),
      ...(image?.mimeType ? { imageMimeType: image.mimeType } : {}),
      plannedImageFile: `images/scene_${String(sceneNo).padStart(2, "0")}.png`,
    });
  }

  if (currentTime < 50 || currentTime > 52) {
    throw new Error(`Estimated runtime must be 50–52 seconds (received ${currentTime.toFixed(1)}s).`);
  }

  const generatedCount = scenes.filter((scene) => scene.imageGenerated).length;
  const production: ProductionOutput = {
    projectTitle: root.topic ?? "Untitled Production",
    aspectRatio: "1:1",
    resolution: { width: 1080, height: 1080 },
    estimatedTotalDuration: Number(currentTime.toFixed(1)),
    assetStatus: generatedCount === 0
      ? "prompts_ready_images_not_generated"
      : generatedCount === scenes.length
        ? "images_generated"
        : "images_partially_generated",
    scenes,
  };

  const productionPath = path.join(outputDir, "production.json");
  await fs.writeFile(productionPath, JSON.stringify(production, null, 2), "utf-8");
  console.log(`Production JSON created: ${productionPath}`);
  console.log(`Scenes: ${scenes.length}`);
  console.log(`Estimated duration: ${currentTime.toFixed(1)} seconds`);
  console.log(`Image status: ${production.assetStatus}`);
  return production;
}
