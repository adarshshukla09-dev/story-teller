import fs from "node:fs/promises";
import path from "node:path";

interface ScriptBeat {
  cardNumber?: number;
  scene?: number;
  sceneId?: number;
  beat?: number;
  directorBeatMap?: string;
  estimatedDurationSeconds?: number;
  time?: string;
  narration: string;
  imageDetails?: string;
  visualPrompt?: string;
  caption?: string;
  onScreenText?: string;
}

interface SvgAsset {
  scene?: number;
  sceneId?: number;
  svgCode: string;
}

interface CompositionItem {
  sceneId?: number;
  scene?: number;
  [key: string]: unknown;
}

interface ExtractionInput {
  topic?: string;
  script?: string | { beats?: ScriptBeat[] };
  storyboard?: string | { videoTitle?: string; scenes?: any[] };
  svgIllustrations?: string | { svgAssets?: SvgAsset[] };
  composition?: string | { compositionPlan?: CompositionItem[] };
  visualPrompts?: string;
  finalOutput?: string | ExtractionInput;
}

interface ProductionScene {
  sceneNo: number;
  narration: string;
  /** Prompt for creating a vertical 9:16 SVG illustration. */
  svg: string;
  startTime: number;
  endTime: number;
  /** Actual SVG markup, normalized to a 1080 x 1920 canvas. */
  svgCode: string;
  visualPrompt: string;
  compositionPlan: CompositionItem | null;
  svgFile: string;
  audioFile: string;
  imageFile: string;
  videoFile: string;
}

interface ProductionOutput {
  projectTitle: string;
  aspectRatio: "9:16";
  resolution: { width: 1080; height: 1920 };
  estimatedTotalDuration: number;
  scenes: ProductionScene[];
}

function parseJsonString<T>(value: string | T | undefined, label: string): T {
  if (value === undefined) {
    throw new Error(`Missing ${label}.`);
  }

  if (typeof value !== "string") {
    return value as T;
  }

  // Supports JSON stored as a string and JSON wrapped in markdown fences.
  const cleaned = value
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");

  try {
    return JSON.parse(cleaned) as T;
  } catch (error) {
    throw new Error(
      `Could not parse ${label} JSON: ${(error as Error).message}`,
    );
  }
}

function getRoot(input: ExtractionInput): ExtractionInput {
  if (!input.finalOutput) {
    return input;
  }

  return parseJsonString<ExtractionInput>(input.finalOutput, "finalOutput");
}

function escapeXml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function emphasizedText(line: string, emphasis: string | undefined): string {
  if (!emphasis) return escapeXml(line);
  const index = line.indexOf(emphasis);
  if (index < 0) return escapeXml(line);
  return [
    escapeXml(line.slice(0, index)),
    `<tspan fill="#E63946">${escapeXml(emphasis)}</tspan>`,
    escapeXml(line.slice(index + emphasis.length)),
  ].join("");
}

function toVerticalSvg(
  source: string,
  headerText: string,
  caption: { line1?: string; line2?: string; redEmphasis?: string } = {},
): string {
  const match = source.match(/<svg\b([^>]*)>([\s\S]*?)<\/svg>/i);

  if (!match) {
    throw new Error("SVG asset does not contain a valid <svg> root element.");
  }

  const attributes = match[1] ?? "";
  const body = match[2] ?? "";

  const viewBoxMatch = attributes.match(/\bviewBox\s*=\s*["']([^"']+)["']/i);
  const viewBox = viewBoxMatch?.[1] ?? "";
  if (!viewBox) {
    throw new Error("Artwork SVG must declare viewBox=\"0 0 1080 1130\".");
  }

  const viewBoxParts = viewBox.match(
    /^\s*([\d.-]+)\s+([\d.-]+)\s+([\d.-]+)\s+([\d.-]+)\s*$/,
  );

  const originalWidth = viewBoxParts?.[3] ?? "1080";
  const originalHeight = viewBoxParts?.[4] ?? "1080";

  const width = Number(originalWidth);
  const height = Number(originalHeight);

  if (
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width <= 0 ||
    height <= 0
  ) {
    throw new Error(`Invalid SVG viewBox: ${viewBox}`);
  }

  if (width !== 1080 || height !== 1130) {
    throw new Error(`Artwork SVG must use viewBox="0 0 1080 1130" (received "${viewBox}").`);
  }
  const title = escapeXml(headerText.trim().toUpperCase());
  const line1 = String(caption.line1 ?? "").trim().toUpperCase();
  const line2 = String(caption.line2 ?? "").trim().toUpperCase();
  const emphasis = caption.redEmphasis?.trim().toUpperCase();
  if (!title) throw new Error("Storyboard scene is missing its canonical headerText.");
  if (!line1 && !line2) throw new Error("Storyboard scene is missing its bottom caption phrase.");
  const firstBaseline = line2 ? 1585 : 1625;
  const secondBaseline = 1680;

  return [
    '<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920">',
    '<rect width="1080" height="1920" fill="#FDFBF7"/>',
    `<text x="540" y="128" text-anchor="middle" fill="#1A1A1A" font-family="Comic Neue, Trebuchet MS, sans-serif" font-size="54" font-weight="700">${title}</text>`,
    `<svg x="0" y="288" width="1080" height="1130" viewBox="${viewBox}" preserveAspectRatio="xMidYMid meet">`,
    body,
    "</svg>",
    line1 ? `<text x="540" y="${firstBaseline}" text-anchor="middle" fill="#1A1A1A" font-family="Comic Neue, Trebuchet MS, sans-serif" font-size="52" font-weight="700">${escapeXml(line1)}</text>` : "",
    line2 ? `<text x="540" y="${secondBaseline}" text-anchor="middle" fill="#1A1A1A" font-family="Comic Neue, Trebuchet MS, sans-serif" font-size="52" font-weight="700">${emphasizedText(line2, emphasis)}</text>` : "",
    "</svg>",
  ].join("");
}

function makeSvgPrompt(visualPrompt: string): string {
  return [
    "Create only the central 2D hand-drawn editorial illustration as an SVG using viewBox 0 0 1080 1130.",
    "Do not draw any text; the final card renderer adds the canonical title and caption in programmatically rendered text bands.",
    `Scene direction: ${visualPrompt}`,
  ].join(" ");
}

function resolveDurationSeconds(beat: ScriptBeat, scene: any): number {
  const explicit = Number(beat.estimatedDurationSeconds ?? scene.estimatedDurationSeconds);
  if (Number.isFinite(explicit) && explicit > 0) return explicit;

  // Accept the legacy script time range format (for example "0-3s") while
  // preserving the explicit duration as the preferred canonical field.
  const range = String(beat.time ?? scene.time ?? "").match(/([\d.]+)\s*[-–]\s*([\d.]+)/);
  if (range) {
    const start = Number(range[1]);
    const end = Number(range[2]);
    if (Number.isFinite(start) && Number.isFinite(end) && end > start) {
      return end - start;
    }
  }
  return Number.NaN;
}

export async function createProductionJson(
  input: ExtractionInput,
  outputDir: string,
): Promise<ProductionOutput> {
  if (!input || typeof input !== "object") {
    throw new Error("Input must be a valid extraction JSON object.");
  }

  const root = getRoot(input);

  const parsedScriptData = parseJsonString<{ beats?: ScriptBeat[]; script?: ScriptBeat[] }>(
    root.script,
    "script",
  );
  // Older scriptwriter output used { script: [...] } instead of { beats: [...] }.
  const scriptData = {
    ...parsedScriptData,
    beats: Array.isArray(parsedScriptData.beats)
      ? parsedScriptData.beats
      : Array.isArray(parsedScriptData.script)
        ? parsedScriptData.script
        : undefined,
  };
  const storyboardData = root.storyboard
    ? parseJsonString<{ videoTitle?: string; scenes?: any[] }>(
        root.storyboard,
        "storyboard",
      )
    : { scenes: [] };

  const svgData = parseJsonString<{ svgAssets?: SvgAsset[] }>(
    root.svgIllustrations,
    "svgIllustrations",
  );

  const compositionData = root.composition
    ? parseJsonString<{ compositionPlan?: CompositionItem[] }>(
        root.composition,
        "composition",
      )
    : { compositionPlan: [] };

  if (!Array.isArray(scriptData.beats) || scriptData.beats.length === 0) {
    throw new Error("script must contain a non-empty beats array (or legacy script array).");
  }
  if (scriptData.beats.length < 14 || scriptData.beats.length > 16) {
    throw new Error(`The final card package requires 14–16 scenes (received ${scriptData.beats.length}).`);
  }

  if (!Array.isArray(storyboardData.scenes) || storyboardData.scenes.length === 0) {
    throw new Error("storyboard.scenes must be a non-empty array to compose card titles and captions.");
  }
  if (storyboardData.scenes.length !== scriptData.beats.length) {
    throw new Error(`Storyboard scene count (${storyboardData.scenes.length}) must match script beat count (${scriptData.beats.length}).`);
  }

  const svgByScene = new Map<number, string>();

  for (const asset of svgData.svgAssets ?? []) {
    const id = asset.sceneId ?? asset.scene;

    if (id !== undefined && asset.svgCode) {
      if (svgByScene.has(id)) throw new Error(`Duplicate SVG asset for scene ${id}.`);
      svgByScene.set(id, asset.svgCode);
    }
  }
  if (svgByScene.size !== scriptData.beats.length) {
    throw new Error(`SVG asset count (${svgByScene.size}) must match script beat count (${scriptData.beats.length}).`);
  }

  const compositionByScene = new Map<number, CompositionItem>();

  for (const item of compositionData.compositionPlan ?? []) {
    const id = item.sceneId ?? item.scene;

    if (id !== undefined) {
      compositionByScene.set(id, item);
    }
  }

  const storyboardByScene = new Map<number, any>();
  for (const [index, scene] of storyboardData.scenes.entries()) {
    const sceneId = Number(scene.sceneId);
    if (sceneId !== index + 1) {
      throw new Error(`Storyboard scenes must have sequential sceneId values; expected ${index + 1}, received ${scene.sceneId}.`);
    }
    storyboardByScene.set(sceneId, scene);
  }

  await fs.mkdir(outputDir, { recursive: true });

  let currentTime = 0;
  const scenes: ProductionScene[] = [];

  for (let index = 0; index < scriptData.beats.length; index++) {
    const beat = scriptData.beats[index];

    if (!beat) {
      throw new Error(`Script beat at index ${index} is undefined.`);
    }

    const sceneNo = beat.sceneId ?? beat.scene ?? beat.cardNumber ?? beat.beat ?? index + 1;

    if (!beat.narration?.trim()) {
      throw new Error(`Scene ${sceneNo} is missing narration.`);
    }

    const storyboardScene = storyboardByScene.get(sceneNo);
    if (!storyboardScene) {
      throw new Error(`No storyboard scene found for scene ${sceneNo}.`);
    }
    const visualPrompt = [
      beat.imageDetails,
      beat.visualPrompt,
      storyboardScene.visualPurpose,
      storyboardScene.visualAction,
      storyboardScene.visualDescription,
      storyboardScene.visualMetaphor,
      storyboardScene.primarySubject,
      storyboardScene.centralIdea,
      beat.narration,
    ].find((value) => typeof value === "string" && value.trim()) ?? "";
    const rawSvg = svgByScene.get(sceneNo);

    if (!rawSvg) {
      throw new Error(`No SVG code found for scene ${sceneNo}.`);
    }

    if (!visualPrompt.trim()) {
      throw new Error(`Scene ${sceneNo} is missing its storyboard visualPurpose.`);
    }

    const duration = Number(resolveDurationSeconds(beat, storyboardScene).toFixed(1));
    const isLegacyTimedBeat = beat.estimatedDurationSeconds === undefined && Boolean(beat.time);
    const maximumDuration = isLegacyTimedBeat ? 5 : 4;
    if (!Number.isFinite(duration) || duration < 3 || duration > maximumDuration) {
      throw new Error(`Scene ${sceneNo} duration must be 3–${maximumDuration} seconds (received ${beat.estimatedDurationSeconds ?? beat.time ?? storyboardScene.estimatedDurationSeconds ?? "missing"}).`);
    }

    const startTime = Number(currentTime.toFixed(1));
    const endTime = Number((startTime + duration).toFixed(1));
    currentTime = endTime;

    const paddedId = String(sceneNo).padStart(2, "0");

    const svgCode = toVerticalSvg(
      rawSvg,
      storyboardScene.headerText ?? storyboardScene.headerTitle ?? storyboardScene.header ?? storyboardData.videoTitle ?? root.topic ?? "",
      normalizeCaption(storyboardScene, beat),
    );
    const svgFile = `assets/scene_${paddedId}.svg`;

    const svgPath = path.join(outputDir, svgFile);

    await fs.mkdir(path.dirname(svgPath), { recursive: true });
    await fs.writeFile(svgPath, svgCode, "utf-8");

    scenes.push({
      sceneNo,
      narration: beat.narration,
      svg: makeSvgPrompt(visualPrompt),
      startTime,
      endTime,
      svgCode,
      visualPrompt,
      compositionPlan: compositionByScene.get(sceneNo) ?? null,
      svgFile,
      audioFile: `audio/scene_${paddedId}.mp3`,
      imageFile: `images/scene_${paddedId}.png`,
      videoFile: `clips/scene_${paddedId}.mp4`,
    });
  }

  const production: ProductionOutput = {
    projectTitle: root.topic ?? "Untitled Production",
    aspectRatio: "9:16",
    resolution: { width: 1080, height: 1920 },
    estimatedTotalDuration: Number(currentTime.toFixed(1)),
    scenes,
  };

  if (currentTime < 50 || currentTime > 52) {
    throw new Error(`Estimated runtime must be 50–52 seconds (received ${currentTime.toFixed(1)}s).`);
  }

  const productionPath = path.join(outputDir, "production.json");

  await fs.writeFile(
    productionPath,
    JSON.stringify(production, null, 2),
    "utf-8",
  );

  console.log(`Production JSON created: ${productionPath}`);
  console.log(`Scenes: ${scenes.length}`);
  console.log(`Estimated duration: ${currentTime.toFixed(1)} seconds`);

  return production;
}

function normalizeCaption(
  scene: any,
  beat: ScriptBeat,
): { line1?: string; line2?: string; redEmphasis?: string } {
  if (scene.caption && typeof scene.caption === "object") return scene.caption;
  const phrase = [scene.keyPhrase, scene.bottomKeyPhrase, scene.caption, beat.caption, beat.onScreenText]
    .find((value) => typeof value === "string" && value.trim());
  return phrase ? { line1: phrase } : {};
}
