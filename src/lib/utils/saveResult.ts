import fs from "node:fs/promises";
import path from "node:path";

const RESULT_DIR = path.resolve(process.cwd(), "result");

/**
 * Saves a run to result/result<N>.json. Pass tag "failed" to save the last known state of a crashed run
 * as result<N>.failed.json, so an expensive run is never lost completely.
 */
export async function saveResult(data: unknown, tag?: string) {
  await fs.mkdir(RESULT_DIR, { recursive: true });

  const files = await fs.readdir(RESULT_DIR);

  const numbers = files
    .map((file) => {
      const match = file.match(/^result(\d+)(?:\.[a-z]+)?\.json$/);
      return match ? Number(match[1]) : 0;
    })
    .filter((num) => num > 0);

  const nextNumber = Math.max(0, ...numbers) + 1;

  const filePath = path.join(
    RESULT_DIR,
    tag ? `result${nextNumber}.${tag}.json` : `result${nextNumber}.json`,
  );

  // Write to a temp file first so a crash mid-write never leaves a truncated result.
  const tmpPath = `${filePath}.tmp`;
  await fs.writeFile(tmpPath, JSON.stringify(data, null, 2), "utf-8");
  await fs.rename(tmpPath, filePath);

  console.log(`Final result saved: ${filePath}`);

  return filePath;
}
