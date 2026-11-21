import test from "node:test";
import assert from "node:assert/strict";
import { extractNamedConcepts, findDisallowedNamedConcepts } from "../src/graphs/named-concepts.ts";

test("allows a script naming only its core concept", () => {
  const narration = "This is the Paradox of Choice: more options can make a decision harder.";
  assert.deepEqual(extractNamedConcepts(narration), ["Paradox of Choice"]);
  assert.deepEqual(findDisallowedNamedConcepts(narration, "Paradox of Choice"), []);
});

test("reports a second named theory alongside the core concept", () => {
  const narration = "The Paradox of Choice gets harder to explain through Jevons Paradox.";
  assert.deepEqual(extractNamedConcepts(narration), ["Paradox of Choice", "Jevons Paradox"]);
  assert.deepEqual(findDisallowedNamedConcepts(narration, "Paradox of Choice"), ["Jevons Paradox"]);
});

test("allows a plain-language explanation of another mechanism", () => {
  const narration = "The Paradox of Choice feels worse because people adapt quickly and compare themselves with others.";
  assert.deepEqual(findDisallowedNamedConcepts(narration, "Paradox of Choice"), []);
});
