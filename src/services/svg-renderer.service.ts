/**
 * SVG artwork contract validator. Rasterization/video assembly is intentionally
 * separate; this module does not invent artwork or add typography.
 */
const SVG_ALLOWED_TAGS = new Set([
  "svg", "g", "path", "circle", "ellipse", "rect", "line", "polyline", "polygon",
]);

/** Remove model-added labels; the production renderer writes approved text separately. */
export function removeSvgTextElements(svg: string): string {
  return svg.replace(/<text\b[^>]*\/>|<text\b[^>]*>[\s\S]*?<\/text\s*>/gi, "");
}

export function validateSvgArtwork(svg: unknown, sceneId: number): string {
  if (typeof svg !== "string" || !svg.trim() || svg.length > 150_000) {
    throw new Error(`SVG illustration for scene ${sceneId} is missing or exceeds 150 KB.`);
  }
  const source = svg.trim();
  if (!/^<svg\b/i.test(source) || !/<\/svg>\s*$/i.test(source)) {
    throw new Error(`Scene ${sceneId} must contain one complete SVG root element.`);
  }
  const forbiddenDeclaration = source.match(/<!DOCTYPE|<!ENTITY|<\?xml|<!--/i)?.[0];
  if (forbiddenDeclaration) {
    throw new Error(`Scene ${sceneId} SVG contains forbidden declaration ${JSON.stringify(forbiddenDeclaration)}.`);
  }
  const forbiddenElement = source.match(/<(script|foreignObject|text|image|use|style|animate|set)\b/i)?.[1];
  if (forbiddenElement) {
    throw new Error(`Scene ${sceneId} SVG contains forbidden <${forbiddenElement}> element.`);
  }
  const withoutSvgNamespace = source.replace(
    /xmlns\s*=\s*["']http:\/\/www\.w3\.org\/2000\/svg["']/i,
    "",
  );
  const forbiddenAttribute = withoutSvgNamespace.match(/\bon[a-z]+\s*=|(?:href|xlink:href)\s*=|url\s*\(|https?:\/\/|style\s*=|class\s*=/i)?.[0];
  if (forbiddenAttribute) {
    throw new Error(`Scene ${sceneId} SVG contains forbidden attribute or reference ${JSON.stringify(forbiddenAttribute)}.`);
  }
  if (!/xmlns\s*=\s*["']http:\/\/www\.w3\.org\/2000\/svg["']/i.test(source)) {
    throw new Error(`Scene ${sceneId} SVG must declare the standard SVG namespace.`);
  }
  const tags = [...source.matchAll(/<\/?([a-zA-Z][\w:-]*)\b/g)].map((match) => match[1]!.toLowerCase());
  if (tags.some((tag) => !SVG_ALLOWED_TAGS.has(tag))) {
    throw new Error(`Scene ${sceneId} SVG uses an element outside the approved SVG subset.`);
  }
  if (!tags.some((tag) => !["svg", "g"].includes(tag))) {
    throw new Error(`Scene ${sceneId} SVG has no drawable shapes.`);
  }
  const viewBox = source.match(/\bviewBox\s*=\s*["']([^"']+)["']/i)?.[1];
  if (!viewBox || !/^0\s+0\s+1080\s+1130$/.test(viewBox.trim())) {
    throw new Error(`Scene ${sceneId} SVG must use viewBox="0 0 1080 1130".`);
  }
  const withoutTags = source.replace(/<[^>]*>/g, "").trim();
  if (withoutTags.length > 0) {
    throw new Error(`Scene ${sceneId} SVG contains text nodes; artwork must be text-free.`);
  }
  return source;
}
