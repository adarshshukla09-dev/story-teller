/** Extract common named-theory forms from narration for the deterministic QA gate. */
export function extractNamedConcepts(scriptText: string): string[] {
  const suffix = String.raw`(?:Paradox|Effect|Treadmill|Trap|Law|Bias)`;
  const patterns = [
    new RegExp(String.raw`\b((?:[A-Z][a-zA-Z’'-]*\s+){1,3}${suffix})\b`, "g"),
    new RegExp(String.raw`\b(${suffix}\s+of\s+(?:the\s+)?[A-Z][a-zA-Z’'-]*(?:\s+[A-Z][a-zA-Z’'-]*){0,2})\b`, "g"),
  ];
  const matches = patterns.flatMap((pattern) =>
    [...scriptText.matchAll(pattern)]
      .map((match) => (match[1] ?? "").replace(/\s+/g, " ").trim())
      .filter((name) => name && !/^(?:The|A|An)\s+(?:Paradox|Effect|Treadmill|Trap|Law|Bias)$/i.test(name)),
  );
  return [...new Set(matches)].sort((left, right) => scriptText.indexOf(left) - scriptText.indexOf(right));
}

function isCoreConceptMatch(found: string, coreConcept: string): boolean {
  const normalize = (value: string) => value.toLowerCase().replace(/\bthe\b/g, "").replace(/[^a-z0-9]+/g, " ").trim().split(/\s+/).filter(Boolean);
  const foundTokens = normalize(found);
  const coreTokens = normalize(coreConcept);
  if (foundTokens.join(" ") === coreTokens.join(" ")) return true;
  const family = ["paradox", "effect", "treadmill", "trap", "law", "bias"];
  const foundFamily = foundTokens.find((token) => family.includes(token));
  const coreFamily = coreTokens.find((token) => family.includes(token));
  const coreContent = coreTokens.filter((token) => !family.includes(token) && token !== "of");
  return Boolean(foundFamily && foundFamily === coreFamily && coreContent.length && coreContent.every((token) => foundTokens.includes(token)));
}

export function findDisallowedNamedConcepts(scriptText: string, coreConcept: string): string[] {
  return extractNamedConcepts(scriptText).filter((concept) => !isCoreConceptMatch(concept, coreConcept));
}
