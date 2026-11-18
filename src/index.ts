import fs from "node:fs/promises";
import path from "node:path";

import { productionGraph } from "./graphs/workflow.graph.js";
import { createProductionJson } from "./agents/createProductionJson.js";

async function writeJsonAtomically(filePath: string, value: unknown): Promise<void> {
  const tempPath = `${filePath}.tmp`;
  await fs.writeFile(tempPath, JSON.stringify(value, null, 2), "utf-8");
  await fs.rename(tempPath, filePath);
}

async function generateExplainer(topic: string) {
  const slug = topic
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "") || "video_title";

  const outputDir = path.resolve(process.cwd(), "src", "result", slug);
  await fs.mkdir(outputDir, { recursive: true });

  let latestState: Record<string, unknown> | undefined;
  try {
    const stream = await productionGraph.stream(
      { topic },
      { streamMode: "values", recursionLimit: 50 },
    );
    for await (const state of stream) {
      latestState = state as Record<string, unknown>;
      // Persist after every completed graph step, so process-level failures
      // still leave the latest known state on disk.
      await writeJsonAtomically(path.join(outputDir, `${slug}.progress.json`), latestState);
    }

    const result = latestState;
    if (!result) throw new Error("Production graph completed without yielding state.");

    console.log("\n========== FINAL SCRIPT ==========\n");
    console.log(result.script);
    console.log("\n========== FINAL PRODUCTION ==========\n");
    console.log(result.finalOutput);

    await writeJsonAtomically(path.join(outputDir, `${slug}.json`), result);
    const outputContent = typeof result.finalOutput === "string"
      ? result.finalOutput
      : JSON.stringify(result.finalOutput, null, 2);
    await fs.writeFile(path.join(outputDir, `${slug}.md`), outputContent, "utf-8");

    const finalProduction = typeof result.finalOutput === "string"
      ? JSON.parse(result.finalOutput)
      : result.finalOutput;
    await createProductionJson(finalProduction, outputDir);
    await fs.rm(path.join(outputDir, `${slug}.progress.json`), { force: true });

    console.log(`\nAll production files saved to ${outputDir}`);
  } catch (error) {
    const failure = {
      failed: true,
      topic,
      error: error instanceof Error ? error.message : String(error),
      savedAt: new Date().toISOString(),
      state: latestState ?? { topic },
    };
    await writeJsonAtomically(path.join(outputDir, `${slug}.failed.json`), failure);
    await fs.writeFile(
      path.join(outputDir, `${slug}.failed.md`),
      `# Production run failed\n\n${failure.error}\n\nLatest workflow state is saved in \`${slug}.failed.json\`.`,
      "utf-8",
    );
    console.error(`Production failed; latest progress saved to ${path.join(outputDir, `${slug}.failed.json`)}`);
    throw error;
  }
}

generateExplainer("The Paradox of Progress").catch(console.error);
