import test from "node:test";
import assert from "node:assert/strict";
import { deriveBeatTiming } from "../src/agents/script-timing.ts";

test("derives duration from narration words and includes the transition pause", () => {
  const timing = deriveBeatTiming("one two three four five six seven eight nine ten", true);
  assert.equal(timing.wordCount, 10);
  assert.equal(timing.estimatedDurationSeconds, 3.9);
});

test("does not add a pause after the final beat", () => {
  const timing = deriveBeatTiming("one two three four five six seven eight nine ten", false);
  assert.equal(timing.estimatedDurationSeconds, 3.7);
});
