import { runFilmWorkflow } from "../index.js";

// Supply real text excerpts from material you have actually read or retrieved.
// The pipeline does not browse. A citation is marked verified only when the
// research agent quotes an exact excerpt found in content/keyExcerpts below.
const sourceMaterials = [
  {
    id: "SRC01",
    title: "Full title of the paper, report, or article",
    authorOrPublisher: "Author name or publishing organization",
    publicationDate: "2024-01-15",
    reliabilityRating: "high", // high | medium | low | not-assessed
    reference: "https://example.org/source", // replace with the real reference
    content: `Paste the relevant source text here. Include enough context for
      the research agent to assess the claim and its limitations.`,
    keyExcerpts: [
      "Paste an exact sentence or passage from the source here.",
    ],
  },
];

const result = await runFilmWorkflow("Your explainer topic", {
  audience: "curious beginner",
  sourceMaterials,
});

console.log("Approved:", result.approved);
console.log("Research grounding:", result.result.researchDossier?.sourceGrounding);
