import {
  FactCheckGenerationSchema,
  FactCheckResultSchema,
  type FactCheckResultOutput,
} from "../schema/factCheck.schema.js";

import { runStructuredAgent } from "./base.agent.js";

export async function factCheckAgent(
  input: string,
): Promise<FactCheckResultOutput> {
  const result = await runStructuredAgent(
    {
      name: "Independent Factuality and Domain Reviewer",
      task: "factCheck",
      temperature: 0.1,
    },
    `
You are performing an independent factuality audit of the supplied research dossier.

STRICT EVIDENCE REQUIREMENTS:

- sourceId must be a string.
- sourceExcerpt must be a string.
- If no traceable source supports the claim, return "" for both fields.
- Use a sourceId only when it exactly matches a source record supplied in the input.
- Use a sourceExcerpt only when copied verbatim from that source record.
- Never invent source IDs, URLs, citations, quotations, or evidence.
- An empty string means no supporting evidence.
- A traceable excerpt does not establish that a publication is authentic or reliable.
- Do not claim independent verification unless external retrieval was actually performed.
- Distinguish unsupported claims from false claims.
- Do not infer that a claim is verified merely because it appears in the dossier.
- Do not invent an overall score.
- Any unresolved blocking issue requires status "revise".

AUDIT INPUT:

${input}
`,
    FactCheckGenerationSchema,
  );

  return FactCheckResultSchema.parse({
    ...result,
    claimAudits: result.claimAudits.map((claim) => ({
      ...claim,
      sourceId: claim.sourceId.trim() || null,
      sourceExcerpt: claim.sourceExcerpt.trim() || null,
    })),
  });
}
