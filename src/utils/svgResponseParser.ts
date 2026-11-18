export function extractSvgResponse(response: string): string {
  if (!response || typeof response !== "string") {
    throw new Error("SVG Illustrator returned an empty response.");
  }

  let svg = response.trim();

  // Remove Markdown code fences.
  svg = svg.replace(/^```(?:xml|svg|html)?\s*/i, "");
  svg = svg.replace(/\s*```$/, "");

  // Find SVG root, allowing an XML declaration before it.
  const svgStart = svg.search(/<svg(?:\s|>)/i);

  if (svgStart === -1) {
    throw new Error(
      `SVG root not found in Illustrator response:\n${svg.slice(0, 300)}`,
    );
  }

  svg = svg.slice(svgStart).trim();

  // Remove anything after the closing SVG tag.
  const svgEnd = svg.toLowerCase().lastIndexOf("</svg>");

  if (svgEnd === -1) {
    throw new Error("SVG response is incomplete: missing closing </svg>.");
  }

  svg = svg.slice(0, svgEnd + 6);

  return svg;
}
