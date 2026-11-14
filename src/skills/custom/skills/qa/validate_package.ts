/** Deterministic validator for an explainer production package.
 *
 * Library use:   import { validatePackage } from ".../validate_package.js";
 *                const report = validatePackage(pkg);   // pkg fields may be objects or JSON strings
 * CLI use:       npx tsx validate_package.ts package.json [--images-provided]
 *                Exit code: 0 = pass, 1 = blocking issues, 2 = usage/input error.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

export type Obj = Record<string, any>;
export type Issue = { gate: string; sceneId: any; problem: string };
export type ValidatorReport = {
  status: "pass" | "revise";
  computed: Obj;
  blockingIssues: Issue[];
  reviewItems: Issue[];
};

const WORD_RE = /[A-Za-z0-9]+(?:['’\-][A-Za-z0-9]+)*/g;
const ALLOWED = new Set(["START", "BUT", "THEREFORE"]);
const DETERMINISM_RE =
  /\b(wired|hard-?wired|built to|designed to|programmed to|evolved to)\b/gi;
const ABSOLUTE_RE =
  /\b(always|never|everyone|everybody|everywhere|every time|perfectly|guarantee[sd]?|completely|any (?:ship|machine|server|host))\b/gi;
const QUOTED_RE =
  /(?<![A-Za-z])['"“‘][A-Za-z0-9][^'"“”‘’]{0,30}['"”’](?![A-Za-z])/g;
const YEAR_RE = /\b(1[0-9]{3}|20[0-9]{2})\b/g;
const HTML_RE = /<[^>]+>/;
const OLD_COMP_KEYS = new Set([
  "imagePrompt",
  "imagePrompts",
  "prompt",
  "caption",
  "captionPlacement",
  "colorPalette",
  "layout",
  "mainSubject",
]);
const REQ_COMP_KEYS = new Set([
  "sceneId",
  "compositionType",
  "primarySubject",
  "elements",
  "visualHierarchy",
  "negativeSpace",
  "safeZones",
]);
const TOL_DURATION = 1.0,
  WPS = 2.4,
  MAX_WPS = 3.0,
  WORD_TOL = 0.04,
  DECLARED_WORD_TOL = 3;

class Report {
  blocking: Issue[] = [];
  review: Issue[] = [];
  computed: Obj = {};
  block(gate: string, sceneId: any, problem: string) {
    this.blocking.push({ gate, sceneId, problem });
  }
  warn(gate: string, sceneId: any, problem: string) {
    this.review.push({ gate, sceneId, problem });
  }
}
function parse(v: any): any {
  if (typeof v !== "string") return v;
  const s = v.replace(/^```(?:json)?\s*|\s*```$/g, "").trim();
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}
function norm(v: any): string {
  return String(v ?? "")
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}
function words(v: any): number {
  return (String(v ?? "").match(WORD_RE) ?? []).length;
}
function walkCoords(node: any, out: Array<[number, number]>): void {
  if (Array.isArray(node)) {
    for (const v of node) walkCoords(v, out);
    return;
  }
  if (node && typeof node === "object") {
    if (
      "x" in node &&
      "y" in node &&
      typeof node.x === "number" &&
      typeof node.y === "number"
    )
      out.push([node.x, node.y]);
    for (const v of Object.values(node)) walkCoords(v, out);
  }
}
function sameSet<T>(a: Set<T>, b: Set<T>): boolean {
  return a.size === b.size && [...a].every((x) => b.has(x));
}
function jsonEqual(a: any, b: any): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function validatePackage(
  pkg: Obj,
  imagesProvided = false,
): ValidatorReport {
  const R = new Report();
  const brief = parse(pkg.creativeBrief) || {},
    script = parse(pkg.script) || {},
    sb = parse(pkg.storyboard) || {};
  const scenes: Obj[] = pkg.scenes || sb.scenes || [],
    comp: Obj[] = pkg.compositionPlan || [];
  const vp: Obj[] =
    pkg.visualPrompts || pkg.visualCompositions?.imagePrompts || [];
  const bibleWrap = parse(pkg.productionBible) || {},
    bible = bibleWrap.productionBible || bibleWrap;
  const beats: Obj[] = script.beats || [];

  // 1. Script arithmetic
  const target = Number(
    script.estimatedDurationSeconds || brief.durationTargetSeconds || 0,
  );
  const joined = beats.map((b) => String(b.narration || "").trim()).join(" ");
  const mainWords = words(script.narration),
    beatWords = words(joined);
  const durSum = Number(
    beats
      .reduce((n, b) => n + Number(b.estimatedDurationSeconds || 0), 0)
      .toFixed(2),
  );
  const sceneDur = Number(
    scenes
      .reduce((n, s) => n + Number(s.estimatedDurationSeconds || 0), 0)
      .toFixed(2),
  );
  const targetWordRange = [
    Math.round(target * WPS * (1 - WORD_TOL)),
    Math.round(target * WPS * (1 + WORD_TOL)),
  ];
  R.computed = {
    beatCount: beats.length,
    sceneCount: scenes.length,
    targetDurationSeconds: target,
    sumOfBeatDurations: durSum,
    sumOfSceneDurations: sceneDur,
    mainNarrationWords: mainWords,
    beatNarrationWords: beatWords,
    declaredTotalWordCount: script.totalWordCount,
    targetWordRange,
    narrationFingerprint: createHash("sha1")
      .update(norm(joined), "utf8")
      .digest("hex")
      .slice(0, 12),
  };
  if (beats.length < 14 || beats.length > 16)
    R.block("timing", null, `${beats.length} beats; required 14-16.`);
  if (norm(joined) !== norm(script.narration))
    R.block(
      "narrationConsistency",
      null,
      `script.narration (${mainWords} words) differs from joined beat narration (${beatWords} words). Beats are the source of truth.`,
    );
  const declared = script.totalWordCount;
  if (
    typeof declared === "number" &&
    Math.abs(declared - beatWords) > DECLARED_WORD_TOL
  )
    R.block(
      "wordCount",
      null,
      `Declared totalWordCount ${declared} vs actual ${beatWords}.`,
    );
  const [lo, hi] = targetWordRange as [number, number];
  if (beatWords < lo || beatWords > hi)
    R.block(
      "wordCount",
      null,
      `${beatWords} spoken words; need ${lo}-${hi} for a ${target}s video.`,
    );
  if (Math.abs(durSum - target) > TOL_DURATION)
    R.block(
      "timing",
      null,
      `Beat durations sum to ${durSum}s vs target ${target}s (tolerance +/-${TOL_DURATION}s).`,
    );
  if (
    typeof script.durationSumCheck === "number" &&
    Math.abs(script.durationSumCheck - durSum) > 0.05
  )
    R.block(
      "timing",
      null,
      `durationSumCheck claims ${script.durationSumCheck} but actual sum is ${durSum}.`,
    );
  if (new Set(beats.map((b) => b.estimatedDurationSeconds)).size < 3)
    R.warn(
      "pacing",
      null,
      "Fewer than 3 distinct card durations; rhythm is monotone.",
    );

  for (let i = 0; i < beats.length; i++) {
    const b = beats[i]!,
      sid = b.cardNumber ?? i + 1,
      w = words(b.narration),
      d = Number(b.estimatedDurationSeconds || 0);
    if (d < 3.5 || d > 5.5)
      R.block("timing", sid, `Duration ${d}s outside 3.5-5.5s.`);
    if (d && w / d > MAX_WPS)
      R.block(
        "timing",
        sid,
        `${w} words in ${d}s = ${(w / d).toFixed(1)} words/s; cannot be spoken (limit ${MAX_WPS}).`,
      );
    if (Number.isInteger(b.wordCount) && Math.abs(b.wordCount - w) > 1)
      R.block(
        "wordCount",
        sid,
        `Declared wordCount ${b.wordCount} vs actual ${w}.`,
      );
    const conn = b.connector;
    if (!ALLOWED.has(conn))
      R.block(
        "storyChain",
        sid,
        `Connector '${conn}' not in START/BUT/THEREFORE.`,
      );
    if ((i === 0) !== (conn === "START"))
      R.block("storyChain", sid, "START must be used on beat 1 only.");
    const cap = b.suggestedCaption || {},
      text = `${b.narration || ""} ${cap.line1 || ""} ${cap.line2 || ""}`;
    for (const m of text.matchAll(DETERMINISM_RE))
      R.block("epistemic", sid, `Deterministic phrasing: '${m[0]}'.`);
    for (const m of text.matchAll(ABSOLUTE_RE))
      R.warn(
        "epistemic",
        sid,
        `Absolute wording to justify or soften: '${m[0]}'.`,
      );
    const cw = words(`${cap.line1 || ""} ${cap.line2 || ""}`);
    if (cw > 7) R.block("caption", sid, `Caption has ${cw} words; max 7.`);
    if (cap.redEmphasis && !(cap.line2 || "").includes(cap.redEmphasis))
      R.block("caption", sid, "redEmphasis is not a substring of line2.");
    if (HTML_RE.test(JSON.stringify(cap)))
      R.block("caption", sid, "HTML tag in caption.");
    const cwords = new Set(
      (`${cap.line1 || ""} ${cap.line2 || ""}`.match(WORD_RE) || []).map(
        (x: string) => x.toLowerCase(),
      ),
    );
    const nwords = new Set(
      (String(b.narration || "").match(WORD_RE) || []).map((x: string) =>
        x.toLowerCase(),
      ),
    );
    const overlap = [...cwords].filter((x) => nwords.has(x)).length;
    if (cwords.size && overlap / cwords.size >= 0.75)
      R.warn(
        "caption",
        sid,
        "Caption mostly repeats the narration (subtitle, not punchline).",
      );
  }

  // 2. Brief -> script contract
  const bm = brief.beatMap;
  if (!bm)
    R.block(
      "briefContract",
      null,
      "creativeBrief has no beatMap (old Director output).",
    );
  else {
    if (bm.length !== beats.length)
      R.block(
        "briefContract",
        null,
        `beatMap has ${bm.length} cards; script has ${beats.length} beats.`,
      );
    for (let i = 0; i < Math.min(bm.length, beats.length); i++)
      if (
        bm[i].stage !== beats[i]!.stage ||
        bm[i].connector !== beats[i]!.connector
      )
        R.block(
          "briefContract",
          beats[i]!.cardNumber,
          "Stage/connector differs from beatMap.",
        );
    if (!beats.some((b) => b.isAhaCard))
      R.block(
        "storyCraft",
        null,
        "No beat marked isAhaCard (inside-the-mechanism card).",
      );
  }
  const props = new Set(
    (brief.analogyMap || []).map((m: Obj) => m.sourceElement),
  );
  if (!props.size)
    R.block("briefContract", null, "creativeBrief has no analogyMap.");
  else if (props.size > 4)
    R.warn(
      "storyCraft",
      null,
      `analogyMap has ${props.size} source elements; keep recurring props <= 4.`,
    );
  if (!brief.mechanism || !brief.oneIdea)
    R.block(
      "briefContract",
      null,
      "creativeBrief missing mechanism or oneIdea.",
    );

  // 3. Storyboard mapping
  const sceneIds = scenes.map((s) => s.sceneId);
  if (new Set(sceneIds).size !== sceneIds.length)
    R.block("schema", null, "Duplicate sceneIds in scenes.");
  if (scenes.length !== beats.length)
    R.block(
      "sceneMapping",
      null,
      `${scenes.length} scenes vs ${beats.length} beats.`,
    );
  const title = script.title;
  const titles: Obj = {
    brief: brief.videoTitle,
    script: title,
    storyboard: sb.videoTitle,
    bible: bible.videoTitle,
  };
  for (const [k, v] of Object.entries(titles))
    if (v != null && v !== title)
      R.block(
        "schema",
        null,
        `videoTitle mismatch: ${k}='${v}' vs script='${title}'.`,
      );
  for (let i = 0; i < Math.min(scenes.length, beats.length); i++) {
    const s = scenes[i]!,
      b = beats[i]!,
      sid = s.sceneId;
    if (String(s.narration || "").trim() !== String(b.narration || "").trim())
      R.block(
        "sceneMapping",
        sid,
        "Scene narration differs from its beat narration.",
      );
    if (
      Number(s.estimatedDurationSeconds || 0) !==
      Number(b.estimatedDurationSeconds || 0)
    )
      R.block(
        "sceneMapping",
        sid,
        "Scene duration differs from beat duration.",
      );
    if (!jsonEqual(s.caption, b.suggestedCaption))
      R.block("sceneMapping", sid, "Scene caption differs from beat caption.");
    if (s.headerText !== title)
      R.block("schema", sid, "headerText differs from video title.");
    if (!(s.sourceBeatIds || []).includes(b.beatId))
      R.block(
        "sceneMapping",
        sid,
        `sourceBeatIds does not include ${b.beatId}.`,
      );
    if (HTML_RE.test(JSON.stringify(s.caption || {})))
      R.block("schema", sid, "HTML tag in scene caption.");
  }
  for (let i = 0; i <= scenes.length - 3; i++)
    if (scenes.slice(i, i + 3).every((s) => !s.characters)) {
      R.block(
        "storyCraft",
        scenes[i]!.sceneId,
        "3 consecutive scenes without the protagonist (max 2).",
      );
      break;
    }

  // 4. Composition plan
  if (comp.length !== scenes.length)
    R.block(
      "composition",
      null,
      `compositionPlan has ${comp.length} items vs ${scenes.length} scenes.`,
    );
  for (const c of comp) {
    const keys = new Set(Object.keys(c)),
      bad = [...OLD_COMP_KEYS].filter((k) => keys.has(k)),
      missing = [...REQ_COMP_KEYS].filter((k) => !keys.has(k));
    if (bad.length)
      R.block(
        "composition",
        c.sceneId,
        `Old/forbidden schema keys: ${JSON.stringify(bad.sort())}.`,
      );
    if (missing.length)
      R.block(
        "composition",
        c.sceneId,
        `Missing required keys: ${JSON.stringify(missing.sort())}.`,
      );
    const pts: Array<[number, number]> = [];
    walkCoords({ primarySubject: c.primarySubject, elements: c.elements }, pts);
    for (const [x, y] of pts)
      if (!(x >= 8 && x <= 92 && y >= 16 && y <= 72)) {
        R.block(
          "composition",
          c.sceneId,
          `Coordinate (${x},${y}) outside X 8-92, Y 16-72.`,
        );
        break;
      }
  }

  // 5. Visual prompts
  const compIds = new Set(comp.map((c) => c.sceneId)),
    visualIds = new Set(vp.map((v) => v.sceneId));
  if (vp.length !== scenes.length)
    R.block(
      "visualPrompts",
      null,
      `${vp.length} prompts vs ${scenes.length} scenes.`,
    );
  if (
    (comp.length > 0 && !sameSet(compIds, new Set(sceneIds))) ||
    (vp.length > 0 && !sameSet(visualIds, new Set(sceneIds)))
  )
    R.block(
      "schema",
      null,
      "sceneId sets/types differ across scenes, compositionPlan, visualPrompts.",
    );
  const byId = new Map(scenes.map((s) => [s.sceneId, s]));
  for (const v of vp) {
    const sid = v.sceneId,
      p = String(v.prompt || "");
    for (const m of p.matchAll(QUOTED_RE))
      R.block("visualPrompts", sid, `Quoted text in prompt: ${m[0]}`);
    for (const m of p.matchAll(YEAR_RE))
      R.block("visualPrompts", sid, `Year/number in prompt: ${m[0]}`);
    if (/\blabel(?:l)?ed\b/i.test(p))
      R.warn(
        "visualPrompts",
        sid,
        "Prompt mentions a label; labels belong in diagramLabels.",
      );
    if (!/15\s*[-–]\s*74/.test(p))
      R.block(
        "visualPrompts",
        sid,
        "Prompt does not state the 15-74% artwork zone.",
      );
    if (!/\b(left|right|center|centre|upper|lower|middle)\b/i.test(p))
      R.warn(
        "visualPrompts",
        sid,
        "Prompt has no spatial language from compositionPlan.",
      );
    const s: Obj = byId.get(sid) || {},
      to = v.textOverlays || {},
      cap = s.caption || {};
    const pairs: Array<[string, any, any]> = [
      ["header", to.header, s.headerText],
      ["captionLine1", to.captionLine1, cap.line1],
      ["captionLine2", to.captionLine2, cap.line2],
      ["redEmphasis", to.redEmphasis, cap.redEmphasis],
    ];
    for (const [name, actual, expected] of pairs)
      if (s.sceneId !== undefined && actual !== expected)
        R.block("schema", sid, `textOverlays.${name} differs from storyboard.`);
    const want = s.programmaticOverlays?.diagramLabels || [];
    if (s.sceneId !== undefined && !jsonEqual(to.diagramLabels || [], want))
      R.block(
        "schema",
        sid,
        "diagramLabels differ from storyboard programmaticOverlays.",
      );
  }

  // 6. Bible / continuity
  if (!(bible.characters || []).some((c: Obj) => c.characterId === "C01"))
    R.block("continuity", null, "productionBible has no C01.");
  for (const c of bibleWrap.continuityChecks || []) {
    if (
      c.checkType === "image-level" &&
      c.status !== "not_verified" &&
      !imagesProvided
    )
      R.block(
        "continuity",
        c.sceneId,
        "image-level status is not 'not_verified' but no images were inspected.",
      );
    if (/-/.test(String(c.sceneId ?? "")))
      R.warn(
        "continuity",
        c.sceneId,
        "Checks should be per scene, not a range.",
      );
  }

  const status: "pass" | "revise" = R.blocking.length ? "revise" : "pass";
  R.computed.status = status;
  return {
    status,
    computed: R.computed,
    blockingIssues: R.blocking,
    reviewItems: R.review,
  };
}

// ---- CLI (runs only when executed directly, never on import) ----
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const args = process.argv.slice(2);
  if (!args.length) {
    console.error(
      "Usage: npx tsx validate_package.ts package.json [--images-provided]",
    );
    process.exit(2);
  }
  try {
    const report = validatePackage(
      JSON.parse(readFileSync(args[0]!, "utf8")),
      args.includes("--images-provided"),
    );
    console.log(JSON.stringify(report, null, 2));
    process.exit(report.blockingIssues.length ? 1 : 0);
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(2);
  }
}
