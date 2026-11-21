import test from "node:test";
import assert from "node:assert/strict";
import { validateScript } from "../src/agents/validate-script.ts";

const plan = { centralQuestion: "Why?", thesis: "Because.", keyConcepts: ["A"], character: "Mina, a student", recurringMotif: "A red umbrella", emotionalArc: "curiosity to insight" };
const valid = () => {
  const beats = Array.from({ length: 15 }, (_, i) => ({
    narration: i === 0
      ? "Mina notices rain gathering beside her red umbrella before the evening walk begins."
      : "But the old umbrella seam starts leaking as steady rain reaches the path.",
    estimatedDurationSeconds: 4.5,
    header: `CHAPTER ${i + 1}`,
    suggestedCaption: { line1: i === 0 ? "RAIN GATHERS" : "THE OLD SEAM LEAKS" },
  }));
  return { storyPlan: plan, estimatedDurationSeconds: 67.5, beats };
};

test("accepts a connected script", () => assert.deepEqual(validateScript(valid()).errors, []));
test("rejects a too-fast beat", () => {
  const script = valid(); script.beats[0]!.narration = "One two three four five six seven eight nine ten"; script.beats[0]!.estimatedDurationSeconds = 3;
  assert.match(validateScript(script).errors.join(" "), /too fast/);
});
test("rejects a missing bridge", () => {
  const script = valid(); script.beats[1]!.narration = "The umbrella leaks at its oldest seam.";
  assert.match(validateScript(script).errors.join(" "), /bridge/);
});
test("rejects more than three key concepts", () => {
  const script = valid(); script.storyPlan.keyConcepts = ["A", "B", "C", "D", "E"];
  assert.match(validateScript(script).errors.join(" "), /more than 3/);
});
