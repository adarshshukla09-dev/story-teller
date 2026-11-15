// Run: npx tsx --test tests/workflow.routing.test.ts
// No API key or network needed: the Gemini call is replaced through setModelInvoker.
import test from "node:test";
import assert from "node:assert/strict";

process.env.GEMINI_MIN_DELAY_MS = "0";
process.env.GEMINI_RPM = "100000";
process.env.MAX_REVISIONS = "3";

const { setModelInvoker } = await import("../src/agents/base.agent.js");
const { filmGraph, RECURSION_LIMIT } =
  await import("../src/graphs/workflow.graph.js");

// Base valid canned package for routing tests
const getBaseCanned = () => ({
  "Topic Research and Evidence Analyst": {
    claims: [
      {
        id: "C1",
        claim: "Test claim",
        verificationStatus: "verified",
        sourceId: "S1",
      },
    ],
    sourceList: [
      {
        id: "S1",
        title: "Test Source",
        publicationDate: "2026-01-01",
        reliabilityRating: "high",
      },
    ],
  },
  "Explanation Strategy Designer": {
    mechanism: "Test mechanism",
    oneIdea: "Test central idea",
    analogyMap: [{ sourceElement: "Prop1" }],
  },
  "Universal Explainer Story Architect": {
    videoTitle: "Test Video",
    oneIdea: "Test central idea",
    beatMap: Array.from({ length: 14 }, (_, i) => ({
      cardNumber: i + 1,
      stage: "script",
      connector: i === 0 ? "START" : "THEREFORE",
    })),
  },
  "Universal Explainer Scriptwriter": {
    title: "Test Video",
    oneIdea: "Test central idea",
    totalWordCount: 100,
    estimatedDurationSeconds: 60,
    beats: Array.from({ length: 14 }, (_, i) => ({
      beatId: `B${i + 1}`,
      cardNumber: i + 1,
      stage: "script",
      connector: i === 0 ? "START" : "THEREFORE",
      narration: "This is test narration word count sentence check.",
      estimatedDurationSeconds: i === 0 ? 5.0 : 4.23,
      isAhaCard: i === 7,
      suggestedCaption: { line1: "Test", line2: "Caption line" },
    })),
  },
  "Independent Factuality and Domain Reviewer": {
    status: "pass",
    criticalErrors: [],
    materialIssues: [],
    sourceVerificationRequired: [],
  },
  "Viewer Comprehension Evaluator": {
    status: "pass",
    score: 90,
    blockingGaps: [],
  },
  "Illustrated Explainer Storyboard Artist": {
    videoTitle: "Test Video",
    oneIdea: "Test central idea",
    scenes: Array.from({ length: 14 }, (_, i) => ({
      sceneId: i + 1,
      headerText: "Test Video",
      narration: "This is test narration word count sentence check.",
      estimatedDurationSeconds: i === 0 ? 5.0 : 4.23,
      sourceBeatIds: [`B${i + 1}`],
      caption: { line1: "Test", line2: "Caption line" },
      characters: [{ characterId: "C01" }],
    })),
  },
  "Illustrated Visual Composition Designer": {
    compositionPlan: Array.from({ length: 14 }, (_, i) => ({
      sceneId: i + 1,
      compositionType: "centered",
      primarySubject: { x: 50, y: 50, label: "Subject" },
      elements: [{ x: 30, y: 30, label: "Elem" }],
      visualHierarchy: ["Subject"],
      negativeSpace: "balanced",
      safeZones: "compliant",
    })),
  },
  "Continuity Supervisor": {
    productionBible: {
      videoTitle: "Test Video",
      characters: [{ characterId: "C01" }],
    },
    continuityChecks: [],
  },
  "Visual Director": {
    imagePrompts: Array.from({ length: 14 }, (_, i) => ({
      sceneId: i + 1,
      prompt: "Illustration in the 15-74% artwork zone, center composition",
      textOverlays: {
        header: "Test Video",
        captionLine1: "Test",
        captionLine2: "Caption line",
        redEmphasis: null,
        diagramLabels: [],
      },
    })),
  },
  "Explainer QA Gatekeeper": {
    status: "pass",
    creativeScores: { average: 95 },
  },
  "Film Art Director": { visualCompositions: {} },
});

const calls: string[] = [];
setModelInvoker(async (_messages, { agent }) => {
  calls.push(agent);
  const canned = getBaseCanned();
  if (!(agent in canned)) throw new Error(`unexpected agent ${agent}`);
  return "```json\n" + JSON.stringify((canned as any)[agent]) + "\n```";
});

test("persistent QA failure ends after MAX_REVISIONS QA runs instead of crashing", async () => {
  calls.length = 0;
  const canned = getBaseCanned();
  (canned["Explainer QA Gatekeeper"] as any).status = "revise";
  setModelInvoker(async (_m, { agent }) => {
    calls.push(agent);
    return "```json\n" + JSON.stringify((canned as any)[agent]) + "\n```";
  });

  const result = await filmGraph.invoke(
    { topic: "t" },
    { recursionLimit: RECURSION_LIMIT },
  );

  assert.equal(
    result.qualityStatus,
    "revise",
    "an unapproved package must never be reported as passed",
  );
  assert.equal(result.revisionCount, 3);
  assert.equal(calls.filter((c) => c === "Explainer QA Gatekeeper").length, 3);
  assert.equal(
    calls.includes("Film Art Director"),
    false,
    "art direction must not run for an unapproved package",
  );
});

test("missing source verification is a caveat, not a blocking issue", async () => {
  const canned = getBaseCanned();
  (
    canned["Independent Factuality and Domain Reviewer"] as any
  ).sourceVerificationRequired = ["claim needing a source"];
  setModelInvoker(async (_m, { agent }) =>
    JSON.stringify((canned as any)[agent]),
  );

  const result = await filmGraph.invoke(
    { topic: "t" },
    { recursionLimit: RECURSION_LIMIT },
  );
  const report = JSON.parse(result.qualityReport as string);
  assert.deepEqual(report.publicationCaveats, ["claim needing a source"]);
  assert.equal(
    report.blockingIssues.some((i: any) =>
      /Source verification/.test(i.problem),
    ),
    false,
  );
});

test("missing reviewer reports block publication", async () => {
  const canned = getBaseCanned();
  delete (canned as any)["Independent Factuality and Domain Reviewer"];
  delete (canned as any)["Viewer Comprehension Evaluator"];
  setModelInvoker(async (_m, { agent }) => {
    if (!(agent in canned)) return "{}";
    return JSON.stringify((canned as any)[agent]);
  });

  const result = await filmGraph.invoke(
    { topic: "t" },
    { recursionLimit: RECURSION_LIMIT },
  );
  assert.equal(result.qualityStatus, "revise");
  const report = JSON.parse(result.qualityReport as string);
  assert.ok(
    report.blockingIssues.some((i: any) =>
      /Missing fact-check report/.test(i.problem),
    ),
  );
  assert.ok(
    report.blockingIssues.some((i: any) =>
      /Missing comprehension report/.test(i.problem),
    ),
  );
});

test("conflicting factual sources and unsupported claims trigger blocking issues", async () => {
  const canned = getBaseCanned();
  (canned["Independent Factuality and Domain Reviewer"] as any) = {
    status: "revise",
    criticalErrors: [
      {
        sceneId: 1,
        problem: "Conflicting source data between dossier and script.",
      },
    ],
    materialIssues: [
      {
        sceneId: 2,
        problem: "Unsupported central claim regarding thermodynamics.",
        resolved: false,
      },
    ],
  };
  setModelInvoker(async (_m, { agent }) =>
    JSON.stringify((canned as any)[agent] || {}),
  );

  const result = await filmGraph.invoke(
    { topic: "t" },
    { recursionLimit: RECURSION_LIMIT },
  );
  assert.equal(result.qualityStatus, "revise");
  const report = JSON.parse(result.qualityReport as string);
  assert.ok(
    report.blockingIssues.some((i: any) =>
      /Conflicting source data/.test(i.problem),
    ),
  );
  assert.ok(
    report.blockingIssues.some((i: any) =>
      /Unsupported central claim/.test(i.problem),
    ),
  );
});

test("missing storyboard scenes and broken beat-to-scene mappings block validation", async () => {
  const canned = getBaseCanned();
  (canned["Illustrated Explainer Storyboard Artist"] as any).scenes = [
    { sceneId: 99, narration: "Mismatch" },
  ];
  setModelInvoker(async (_m, { agent }) =>
    JSON.stringify((canned as any)[agent]),
  );

  const result = await filmGraph.invoke(
    { topic: "t" },
    { recursionLimit: RECURSION_LIMIT },
  );
  assert.equal(result.qualityStatus, "revise");
  const report = JSON.parse(result.qualityReport as string);
  assert.ok(
    report.blockingIssues.some((i: any) =>
      /Scene count mismatch|sourceBeatIds/.test(i.problem),
    ),
  );
});

test("incorrect timing and monotone pacing block validation", async () => {
  const canned = getBaseCanned();
  // Make all beat durations identical (violates distinct duration requirement)
  (canned["Universal Explainer Scriptwriter"] as any).beats.forEach(
    (b: any) => (b.estimatedDurationSeconds = 4.0),
  );
  setModelInvoker(async (_m, { agent }) =>
    JSON.stringify((canned as any)[agent]),
  );

  const result = await filmGraph.invoke(
    { topic: "t" },
    { recursionLimit: RECURSION_LIMIT },
  );
  assert.equal(result.qualityStatus, "revise");
  const report = JSON.parse(result.qualityReport as string);
  assert.ok(
    report.blockingIssues.some((i: any) =>
      /distinct scene\/beat durations/.test(i.problem),
    ),
  );
});

test("missing aha moments block validation", async () => {
  const canned = getBaseCanned();
  (canned["Universal Explainer Scriptwriter"] as any).beats.forEach(
    (b: any) => (b.isAhaCard = false),
  );
  (canned["Illustrated Explainer Storyboard Artist"] as any).scenes.forEach(
    (s: any) => (s.isAhaScene = false),
  );
  setModelInvoker(async (_m, { agent }) =>
    JSON.stringify((canned as any)[agent]),
  );

  const result = await filmGraph.invoke(
    { topic: "t" },
    { recursionLimit: RECURSION_LIMIT },
  );
  assert.equal(result.qualityStatus, "revise");
  const report = JSON.parse(result.qualityReport as string);
  assert.ok(
    report.blockingIssues.some((i: any) =>
      /No beat or scene marked as an Aha moment/.test(i.problem),
    ),
  );
});

test("the old limit of 25 really does crash (regression guard for the original bug)", async () => {
  await assert.rejects(
    filmGraph.invoke({ topic: "t" }, { recursionLimit: 25 }),
    /Recursion limit/,
  );
});
