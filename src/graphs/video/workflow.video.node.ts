import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import type { RunnableConfig } from "@langchain/core/runnables";
import type { videoState } from "./workflow.video.state.js";
import { createImagePrompt } from "../../agents/prompt.agent.js";
import { createSVGCode } from "../../agents/svg.agent.js";
import { checkSvgStructure, renderCheck } from "./svg.validate.js";

interface Scene {
  sceneNo: number;
  narration: string;
  startTime: number;
  endTime: number;
  imagePrompt: string;
  negativePrompt: string;
  requiredElements: string[];
  mustNotInclude: string[];
  textOverlays: import("../../agents/prompt.agent.js").PromptAgentInput["textOverlays"];
  compositionPlan: unknown;
  plannedImageFile?: string;
}

interface VideoScript {
  scenes: Scene[];
}

const SVG_OUTPUT_DIR = path.resolve("generated/svg");
const SVG_CODE_DIR = path.join(SVG_OUTPUT_DIR, "scripts");
const SVG_IMAGE_DIR = path.join(SVG_OUTPUT_DIR, "images");

export const loadScenesNode = async (
  _state: typeof videoState.State,
  config: RunnableConfig,
) => {
  const filePath = config.configurable?.["filePath"];

  if (typeof filePath !== "string" || !filePath.trim()) {
    throw new Error("Missing filePath in graph configuration.");
  }

  const fileContent = await readFile(filePath, "utf-8");
  const videoData: VideoScript = JSON.parse(fileContent);

  const mappedImages = videoData.scenes.map((scene) => ({
    filePath: "",
    sceneId: scene.sceneNo,
    prompt: "",
    rawImagePrompt: scene.imagePrompt,
    requiredElements: scene.requiredElements ?? [],
    mustNotInclude: scene.mustNotInclude ?? [],
    textOverlays: scene.textOverlays,
    compositionPlan: scene.compositionPlan,
    negativePrompt: scene.negativePrompt,
    imageLocation: scene.plannedImageFile ?? "",
    svgCodePath: "",
  }));

  const mappedNarrations = videoData.scenes.map((scene) => ({
    filePath: "",
    sceneId: scene.sceneNo,
    narration: scene.narration,
    fileLocation: "",
  }));

  const mappedTimestamps = videoData.scenes.map((scene) => ({
    sceneId: scene.sceneNo,
    startTime: String(scene.startTime),
    endTime: String(scene.endTime),
  }));

  console.log(`[Load Scenes] Loaded ${videoData.scenes.length} scenes.`);

  return {
    Image: mappedImages,
    narration: mappedNarrations,
    timeStamp: mappedTimestamps,
  };
};

export const promptAgentNode = async (state: typeof videoState.State) => {
  console.log("\n[Prompt Agent] Generating image prompts...");

  const updatedImages = [];

  for (const image of state.Image) {
    console.log(`[Prompt Agent] Processing scene ${image.sceneId}...`);

    const prompt = await createImagePrompt({
      sceneId: image.sceneId,
      rawImagePrompt: image.rawImagePrompt,
      negativePrompt: image.negativePrompt,
      requiredElements: image.requiredElements,
      mustNotInclude: image.mustNotInclude,
      textOverlays: image.textOverlays,
      compositionPlan: image.compositionPlan,
    });

    updatedImages.push({
      ...image,
      prompt,
    });

    console.log(`[Prompt Agent] Scene ${image.sceneId} prompt generated.`);
  }

  return {
    Image: updatedImages,
  };
};

/**
 * Normalizes Gemini-generated JavaScript so `renderSvg` can run in a script VM context.
 */
function normalizeSVGCode(code: string): string {
  code = code.trim();

  // Remove Markdown fences.
  code = code
    .replace(/^```(?:javascript|js|xml|svg)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

  // Remove XML declaration if present.
  code = code.replace(/^<\?xml[^?]*\?>\s*/i, "");

  // CASE 1: Gemini returned raw SVG instead of JavaScript.
  if (/^<svg[\s>]/i.test(code)) {
    console.warn(
      "[SVG Normalizer] Gemini returned raw SVG. Wrapping it in renderSvg().",
    );

    return `
      function renderSvg(width = 1024, height = 1024) {
        return ${JSON.stringify(code)};
      }
    `;
  }

  // CASE 2: Gemini returned JavaScript.
  code = code.replace(
    /^[ \t]*export\s+(?:default\s+)?(?=(?:async\s+)?function\s+renderSvg\b)/gm,
    "",
  );

  if (/^\s*(?:import|export)\b/m.test(code)) {
    throw new Error("Generated code contains unsupported imports/exports.");
  }

  if (!/function\s+renderSvg\s*\(/.test(code)) {
    throw new Error(
      `renderSvg() function missing. Output preview: ${code.slice(0, 200)}`,
    );
  }

  return code.trim();
}

/**
 * Executes generated JavaScript inside a restricted VM context
 * and returns the SVG markup.
 */
async function executeSVGCode(code: string, filename: string): Promise<string> {
  const sandbox = vm.createContext(Object.create(null), {
    codeGeneration: {
      strings: false,
      wasm: false,
    },
  });

  const wrappedCode = `
    "use strict";

    ${code}

    if (typeof renderSvg !== "function") {
      throw new Error("renderSvg function not found.");
    }

    renderSvg(1024, 1024);
  `;

  const script = new vm.Script(wrappedCode, {
    filename,
  });

  const result = script.runInContext(sandbox, {
    timeout: 5000,
  });

  if (typeof result !== "string") {
    throw new Error("SVG generator did not return a string.");
  }

  if (!result.includes("<svg") || !result.includes("</svg>")) {
    throw new Error("Generated SVG markup is invalid.");
  }

  return result;
}

export const svgAgentNode = async (state: typeof videoState.State) => {
  console.log("\n[SVG Node] Starting SVG generation...");

  await mkdir(SVG_CODE_DIR, { recursive: true });
  await mkdir(SVG_IMAGE_DIR, { recursive: true });

  const updatedImages = [];

  for (const image of state.Image) {
    console.log(`\n[SVG Node] Processing scene ${image.sceneId}...`);

    if (!image.prompt?.trim()) {
      throw new Error(`Missing prompt for scene ${image.sceneId}`);
    }

    const codeFilePath = path.join(SVG_CODE_DIR, `scene-${image.sceneId}.js`);
    const svgFilePath = path.join(SVG_IMAGE_DIR, `scene-${image.sceneId}.svg`);

    const MAX_ATTEMPTS = 2;
    let svgMarkup = "";
    let lastError = "Unknown SVG generation error";
    let succeeded = false;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        const generatedCode = await createSVGCode({
          sceneId: image.sceneId,
          prompt: `${image.prompt}${attempt > 1 ? `\n\nPREVIOUS ATTEMPT FAILED: ${lastError}` : ""}`,
        });
        const code = normalizeSVGCode(generatedCode);
        await writeFile(codeFilePath, code, "utf-8");
        const savedCode = await readFile(codeFilePath, "utf-8");
        svgMarkup = await executeSVGCode(
          savedCode,
          `scene-${image.sceneId}.js`,
        );
        const structure = checkSvgStructure(svgMarkup);
        if (!structure.ok) throw new Error(structure.error);
        const rendered = await renderCheck(svgMarkup);
        if (!rendered.ok) throw new Error(rendered.error);
        succeeded = true;
        break;
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
        console.warn(
          `[SVG Node] Scene ${image.sceneId} attempt ${attempt} failed: ${lastError}`,
        );
      }
    }
    if (!succeeded)
      throw new Error(
        `Scene ${image.sceneId} SVG generation failed: ${lastError}`,
      );
    await writeFile(svgFilePath, svgMarkup, "utf-8");
    console.log(`[SVG Node] SVG saved: ${svgFilePath}`);

    // 5. Update graph state.
    updatedImages.push({
      ...image,
      filePath: svgFilePath,
      svgCodePath: codeFilePath,
    });
  }

  console.log("\n[SVG Node] All scenes completed.");

  return {
    Image: updatedImages,
  };
};
