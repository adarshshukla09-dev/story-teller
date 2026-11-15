import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { validatePackage } from "./validate_package.ts";

const basePackage = {
  researchDossier: {
    sourceList: [{ id: "SRC01", title: "User-supplied source" }],
    claims: [],
  },
  creativeBrief: {
    videoTitle: "CLEAR IDEA",
    oneIdea: "A short central idea.",
    mechanism: "A causal mechanism.",
    beatMap: [],
    analogyMap: [{ sourceElement: "A paper map" }],
    claimLedger: [{ id: "CL01", claim: "Supported claim", sourceIds: ["SRC01"] }],
  },
  script: {
    title: "CLEAR IDEA",
    oneIdea: "A short central idea.",
    beats: [
      {
        beatId: "B01",
        cardNumber: 1,
        narration: "A supported claim appears.",
        estimatedDurationSeconds: 4,
        connector: "START",
        stage: "HOOK",
        claimIds: ["CL01"],
      },
    ],
  },
  storyboard: { videoTitle: "CLEAR IDEA", oneIdea: "A short central idea.", scenes: [] },
  scenes: [],
  compositionPlan: [],
  visualPrompts: [],
  productionBible: { videoTitle: "CLEAR IDEA", characters: [{ characterId: "C01" }] },
};

const issues = (pkg) => validatePackage(pkg).blockingIssues;

 test("missing script.beats is reported as an explicit structural error", () => {
  const pkg = structuredClone(basePackage);
  delete pkg.script.beats;
  const found = issues(pkg).find((issue) => issue.problem.includes("script.beats is missing"));
  assert.ok(found, "expected explicit script.beats contract diagnostic");
});

test("a scenes/cards alias does not hide a missing script.beats array", () => {
  const pkg = structuredClone(basePackage);
  pkg.script = { ...pkg.script, cards: [{ narration: "Not the canonical field." }] };
  delete pkg.script.beats;
  assert.ok(issues(pkg).some((issue) => issue.problem.includes("script.beats is missing")));
});

test("claim references must resolve through the research dossier source list", () => {
  const pkg = structuredClone(basePackage);
  pkg.creativeBrief.claimLedger[0].sourceIds = ["MISSING_SOURCE"];
  assert.ok(issues(pkg).some((issue) => issue.problem.includes("absent from researchDossier.sourceList")));
});

test("script beats must cite claim IDs from the Director ledger", () => {
  const pkg = structuredClone(basePackage);
  pkg.script.beats[0].claimIds = ["CL99"];
  assert.ok(issues(pkg).some((issue) => issue.problem.includes("missing from creativeBrief.claimLedger")));
});

test("canonical claim-to-source references pass the provenance-specific checks", () => {
  const pkg = structuredClone(basePackage);
  const provenanceIssues = issues(pkg).filter((issue) => issue.gate === "epistemic");
  assert.deepEqual(provenanceIssues, []);
});

test("required title fields are not silently accepted when missing", () => {
  const pkg = structuredClone(basePackage);
  delete pkg.storyboard.videoTitle;
  assert.ok(issues(pkg).some((issue) => issue.problem.includes("Missing required videoTitle/title in storyboard")));
});

test("an explicit no-analogy choice is accepted when the mapping field is present", () => {
  const pkg = structuredClone(basePackage);
  pkg.creativeBrief.analogyMap = [];
  pkg.creativeBrief.whereAnalogyBreaks = "No analogy; direct depiction / diagram is clearer.";
  assert.ok(!issues(pkg).some((issue) => issue.problem.includes("analogyMap is empty")));
});

test("an absent analogyMap field is still a contract failure", () => {
  const pkg = structuredClone(basePackage);
  delete pkg.creativeBrief.analogyMap;
  assert.ok(issues(pkg).some((issue) => issue.problem.includes("analogyMap field is missing")));
});

test("the evaluation fixture covers science, psychology, history, economics and technology", () => {
  const suite = JSON.parse(readFileSync(new URL("./evaluation-cases.json", import.meta.url), "utf8"));
  assert.ok(suite.cases.length >= 5, "the evaluation suite must contain at least five representative topics");
  const domains = new Set(suite.cases.map((entry) => entry.domain));
  for (const required of ["scientific explainer", "psychology", "historical explainer", "economics", "technology"])
    assert.ok(domains.has(required), `missing required evaluation domain: ${required}`);
});

test("the evaluation fixture scores all ten creative dimensions separately", () => {
  const suite = JSON.parse(readFileSync(new URL("./evaluation-cases.json", import.meta.url), "utf8"));
  assert.equal(suite.requiredCreativeDimensions.length, 10);
  assert.equal(suite.scoring.dimensionScale, "1-10");
  assert.match(suite.comparison.baseline, /^not_run:/);
  assert.match(suite.comparison.afterChange, /^not_run:/);
});
