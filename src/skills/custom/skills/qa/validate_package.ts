/** Deterministic validator for an explainer production package.
 *
- Library use:   import { validatePackage } from ".../validate_package.js";
-                const report = validatePackage(pkg);   // pkg fields may be objects or JSON strings
- CLI use:       npx tsx validate_package.ts package.json [--images-provided]
-                Exit code: 0 = pass, 1 = blocking issues, 2 = usage/input error.
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
  const scenes: Obj[] = Array.isArray(pkg.scenes)
    ? pkg.scenes
    : Array.isArray(sb.scenes)
      ? sb.scenes
      : [];
  const comp: Obj[] = Array.isArray(pkg.compositionPlan)
    ? pkg.compositionPlan
    : [];
  const vp: Obj[] = Array.isArray(pkg.visualPrompts)
    ? pkg.visualPrompts
    : Array.isArray(pkg.visualCompositions?.imagePrompts)
      ? pkg.visualCompositions.imagePrompts
      : [];
  const bibleWrap = parse(pkg.productionBible) || {},
    bible = bibleWrap.productionBible || bibleWrap;
  const hasBeatArray = Array.isArray(script.beats);
  const beats: Obj[] = hasBeatArray
    ? script.beats.map((beat: any) =>
        beat && typeof beat === "object" ? beat : {},
      )
    : [];

  // 1. Script arithmetic
  if (!hasBeatArray)
    R.block(
      "schema",
      null,
      `script.beats is missing or is not an array (received ${script.beats === undefined ? "no field" : typeof script.beats}). Return the canonical script.beats array; do not substitute scenes/cards or narration-only output.`,
    );
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
    scriptBeatArrayPresent: hasBeatArray,
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
  if (beats.length < 12 || beats.length > 16)
    R.block("timing", null, `${beats.length} beats; required 12-16.`);
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
  if (durSum < 45 || durSum > 75)
    R.block("timing", null, `Beat durations sum to ${durSum}s; this format requires 45-75s.`);
  if (
    typeof script.durationSumCheck === "number" &&
    Math.abs(script.durationSumCheck - durSum) > 0.05
  )
    R.block(
      "timing",
      null,
      `durationSumCheck claims ${script.durationSumCheck} but actual sum is ${durSum}.`,
    );

  const distinctBeatDurations = new Set(
    beats.map((b) => b.estimatedDurationSeconds),
  ).size;
  const distinctSceneDurations = new Set(
    scenes.map((s) => s.estimatedDurationSeconds),
  ).size;
  if (distinctBeatDurations < 3 || distinctSceneDurations < 3)
    R.warn(
      "pacing",
      null,
      "Fewer than 3 distinct scene/beat durations; consider varying pacing if rhythm feels monotone.",
    );

  for (let i = 0; i < beats.length; i++) {
    const b = beats[i]!,
      sid = b.cardNumber ?? i + 1,
      w = words(b.narration),
      d = Number(b.estimatedDurationSeconds || 0);
    if (!script.beats[i] || typeof script.beats[i] !== "object")
      R.block("schema", i + 1, `script.beats[${i}] must be an object.`);
    const expectedBeatId = `B${String(i + 1).padStart(2, "0")}`;
    if (b.beatId !== expectedBeatId)
      R.block(
        "schema",
        sid,
        `Beat ${i + 1} must use stable beatId '${expectedBeatId}' (received '${b.beatId ?? "missing"}').`,
      );
    if (b.cardNumber !== i + 1)
      R.block(
        "schema",
        sid,
        `Beat ${expectedBeatId} must have cardNumber ${i + 1}.`,
      );
    if (d < 3 || d > 4)
      R.block("timing", sid, `Duration ${d}s outside 3-4s.`);
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
    if (cwords.size > 0 && overlap === 0)
      R.block(
        "caption",
        sid,
        "Caption has no thematic or lexical overlap with narration; meanings must align.",
      );
  }

  // 2. Brief -> script contract & Storyboard validation
  const bm = brief.beatMap;
  if (!Array.isArray(bm))
    R.block(
      "briefContract",
      null,
      "creativeBrief.beatMap is missing or not an array (old or malformed Director output).",
    );
  else {
    if (bm.length !== beats.length)
      R.block(
        "briefContract",
        null,
        `beatMap has ${bm.length} cards; script has ${beats.length} beats.`,
      );
    for (let i = 0; i < Math.min(bm.length, beats.length); i++) {
      if (!bm[i] || typeof bm[i] !== "object") {
        R.block("briefContract", i + 1, `beatMap[${i}] must be an object.`);
        continue;
      }
      if (
        bm[i].stage !== beats[i]!.stage ||
        bm[i].connector !== beats[i]!.connector
      )
        R.block(
          "briefContract",
          beats[i]!.cardNumber,
          "Stage/connector differs from beatMap.",
        );
    }
    if (
      !beats.some((b) => b.isAhaCard) &&
      !scenes.some((s) => s.isAhaScene || s.isAhaCard)
    )
      R.block(
        "storyCraft",
        null,
        "No beat or scene marked as an Aha moment (isAhaCard / isAhaScene). At least one meaningful aha scene is required.",
      );
  }

  const hasAnalogyMap = Array.isArray(brief.analogyMap);
  const analogyMap = hasAnalogyMap ? brief.analogyMap : [];
  const explicitlyNoAnalogy =
    analogyMap.length === 0 &&
    /no analogy/i.test(String(brief.whereAnalogyBreaks ?? ""));
  if (!hasAnalogyMap) {
    R.block(
      "briefContract",
      null,
      "creativeBrief.analogyMap field is missing or is not an array.",
    );
  } else if (analogyMap.length === 0 && !explicitlyNoAnalogy) {
    R.block(
      "briefContract",
      null,
      "creativeBrief.analogyMap is empty without explicitly declaring that no analogy is suitable.",
    );
  }

  const props = new Set(
    analogyMap
      .filter((m: Obj) => m && typeof m === "object")
      .map((m: Obj) => m.sourceElement)
      .filter((v: unknown) => typeof v === "string" && v.trim().length > 0),
  );
  if (!props.size && analogyMap.length > 0)
    R.block(
      "briefContract",
      null,
      "creativeBrief has no valid analogyMap source elements.",
    );
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
  if (!(script.oneIdea || script.centralIdea))
    R.block(
      "schema",
      null,
      "script is missing oneIdea (or the supported centralIdea alias).",
    );
  if (!(sb.oneIdea || sb.centralIdea))
    R.block(
      "schema",
      null,
      "storyboard is missing oneIdea (or the supported centralIdea alias).",
    );
  if (!brief.whereAnalogyBreaks)
    R.block(
      "briefContract",
      null,
      "creativeBrief.whereAnalogyBreaks is missing; state the analogy's limits explicitly.",
    );

  // Consistent central idea across artifacts check
  const centralIdeas: Obj = {
    brief: brief.oneIdea || brief.centralIdea,
    script: script.oneIdea || script.centralIdea,
    storyboard: sb.oneIdea || sb.centralIdea,
  };
  const primaryIdea = centralIdeas.brief;
  if (primaryIdea) {
    for (const [k, v] of Object.entries(centralIdeas)) {
      if (v != null && norm(v) !== norm(primaryIdea)) {
        R.block(
          "schema",
          null,
          `Central idea / oneIdea mismatch: ${k} differs from brief.`,
        );
      }
    }
  }

  // 3. Storyboard mapping & Scene validation
  if (!scenes || scenes.length === 0) {
    R.block("schema", null, "Storyboard or scenes array is missing or empty.");
  }

  const sceneIds = scenes.map((s) => s?.sceneId);
  if (sceneIds.some((id) => id == null || String(id).trim() === "")) {
    R.block(
      "schema",
      null,
      "One or more scenes have missing or null sceneId values.",
    );
  }
  if (new Set(sceneIds).size !== sceneIds.length)
    R.block("schema", null, "Duplicate sceneIds detected in scenes.");
  if (scenes.length !== beats.length)
    R.block(
      "sceneMapping",
      null,
      `Scene count mismatch: ${scenes.length} scenes vs ${beats.length} beats. Every script beat must have a matching scene.`,
    );

  const title = script.title;
  const titles: Obj = {
    brief: brief.videoTitle,
    script: title,
    storyboard: sb.videoTitle,
    bible: bible.videoTitle,
  };
  for (const [k, v] of Object.entries(titles))
    if (typeof v !== "string" || !v.trim())
      R.block("schema", null, `Missing required videoTitle/title in ${k}.`);
  for (const [k, v] of Object.entries(titles))
    if (v != null && v !== title)
      R.block(
        "schema",
        null,
        `videoTitle mismatch: ${k}='${v}' vs script='${title}'.`,
      );

  // Factual provenance: a beat can cite only a claim in the Director ledger;
  // each ledger claim must either resolve to a real source in the Research dossier
  // or be explicitly marked unverified with needsVerification: true.
  const dossier = parse(pkg.researchDossier) || {};
  const sourceList: Obj[] = Array.isArray(dossier.sourceList)
    ? dossier.sourceList
    : [];
  const sourceIds = new Set(
    sourceList
      .map((source) => source?.id)
      .filter((id) => typeof id === "string" && id.trim().length > 0),
  );
  const claimLedger: Obj[] = Array.isArray(brief.claimLedger)
    ? brief.claimLedger
    : [];
  const claimIds = new Set<string>();
  if (claimLedger.length === 0)
    R.block(
      "epistemic",
      null,
      "creativeBrief.claimLedger is missing or empty; material factual claims cannot be traced.",
    );
  for (const claim of claimLedger) {
    const id = String(claim?.id ?? claim?.claimId ?? "").trim();
    if (!id) {
      R.block("epistemic", null, "A claimLedger entry has no stable id.");
      continue;
    }
    claimIds.add(id);
    const refs = Array.isArray(claim.sourceIds)
      ? claim.sourceIds
      : claim.sourceId != null
        ? [claim.sourceId]
        : [];
    if (refs.length === 0) {
      const isExplicitlyUnverified =
        claim.needsVerification === true &&
        /unverified/i.test(
          String(claim.epistemicStatus ?? claim.confidence ?? ""),
        );
      if (!isExplicitlyUnverified) {
        R.block(
          "epistemic",
          null,
          `Claim ${id} has no sourceId/sourceIds and is not explicitly marked unverified with needsVerification: true.`,
        );
      } else {
        R.warn(
          "epistemic",
          null,
          `Claim ${id} has no source reference and requires verification.`,
        );
      }
    }
    for (const sourceId of refs)
      if (!sourceIds.has(sourceId))
        R.block(
          "epistemic",
          null,
          `Claim ${id} references source '${sourceId}', which is absent from researchDossier.sourceList.`,
        );
  }
  for (let i = 0; i < beats.length; i++) {
    const refs = beats[i]!.claimIds;
    if (!Array.isArray(refs)) {
      R.block(
        "epistemic",
        beats[i]!.cardNumber ?? i + 1,
        "Beat claimIds must be an array (use [] only when the beat has no material factual claim).",
      );
      continue;
    }
    for (const claimId of refs)
      if (!claimIds.has(String(claimId)))
        R.block(
          "epistemic",
          beats[i]!.cardNumber ?? i + 1,
          `Beat references claim '${claimId}' that is missing from creativeBrief.claimLedger.`,
        );
  }

  for (let i = 0; i < Math.min(scenes.length, beats.length); i++) {
    const s = scenes[i] && typeof scenes[i] === "object" ? scenes[i]! : {},
      b = beats[i]!,
      sid = s.sceneId;
    if (!scenes[i] || typeof scenes[i] !== "object")
      R.block("schema", sid ?? i + 1, `scenes[${i}] must be an object.`);
    if (s.sceneId !== b.cardNumber)
      R.block(
        "sceneMapping",
        sid ?? i + 1,
        `sceneId ${s.sceneId ?? "missing"} must equal source beat cardNumber ${b.cardNumber ?? i + 1}.`,
      );
    if (String(s.narration || "").trim() !== String(b.narration || "").trim())
      R.block(
        "sceneMapping",
        sid,
        "Scene narration differs from its corresponding beat narration.",
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
    if (
      !(s.sourceBeatIds || []).includes(b.beatId) &&
      !(s.sourceBeatIds || []).includes(b.cardNumber)
    )
      R.block(
        "sceneMapping",
        sid,
        `sourceBeatIds does not include beat reference ${b.beatId ?? b.cardNumber}.`,
      );
    if (HTML_RE.test(JSON.stringify(s.caption || {})))
      R.block("schema", sid, "HTML tag in scene caption.");
  }

  const requiresProtagonist =
    brief.requiresProtagonist === true ||
    (Array.isArray(brief.characters) && brief.characters.length > 0);

  if (requiresProtagonist) {
    for (let i = 0; i <= scenes.length - 3; i++)
      if (scenes.slice(i, i + 3).every((s) => !s?.characters)) {
        R.block(
          "storyCraft",
          scenes[i]?.sceneId ?? i + 1,
          "3 consecutive scenes without the protagonist (max 2).",
        );
        break;
      }
  }

  // 4. Composition plan
  if (comp.length !== scenes.length)
    R.block(
      "composition",
      null,
      `compositionPlan has ${comp.length} items vs ${scenes.length} scenes. All required composition plans must be present.`,
    );
  for (const c of comp) {
    if (!c || typeof c !== "object") {
      R.block(
        "composition",
        null,
        "Every compositionPlan entry must be an object.",
      );
      continue;
    }
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
  const compIds = new Set(comp.map((c) => c?.sceneId)),
    visualIds = new Set(vp.map((v) => v?.sceneId));
  if (vp.length !== scenes.length)
    R.block(
      "visualPrompts",
      null,
      `${vp.length} visual prompts vs ${scenes.length} scenes. All required visual prompts must be present.`,
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
  const byId = new Map(scenes.map((s) => [s?.sceneId, s]));
  for (const v of vp) {
    if (!v || typeof v !== "object") {
      R.block(
        "visualPrompts",
        null,
        "Every visual prompt entry must be an object.",
      );
      continue;
    }
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
    const hasStructuredZone =
      v.artworkZone != null ||
      v.safeZones != null ||
      (v.layout && typeof v.layout === "object");
    const hasTextZone = /15\s*[-–]\s*74/.test(p);
    if (!hasStructuredZone && !hasTextZone)
      R.warn(
        "visualPrompts",
        sid,
        "Visual prompt has neither structured artworkZone/safeZones metadata nor an explicit 15-74% zone note.",
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
  const hasSceneCharacters = scenes.some(
    (s) => Array.isArray(s?.characters) && s.characters.length > 0,
  );
  if (
    (requiresProtagonist || hasSceneCharacters) &&
    !(bible.characters || []).some((c: Obj) => c.characterId === "C01")
  )
    R.block(
      "continuity",
      null,
      "productionBible has no C01 despite recurring protagonist requirement or scene character references.",
    );
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
