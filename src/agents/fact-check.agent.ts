import { runAgent } from "./base.agent.js";

export async function factCheckAgent(input: string) {
  return runAgent(
    {
      name: "Independent Factuality and Domain Reviewer",
      task: "factCheck",
      temperature: 0.1,
      role: `Audit the draft against its research dossier with rigorous source and factuality standards.

CRITICAL FACT-CHECKING RULES:
- Do not claim external browsing or source verification unless source material and valid source IDs are actually present in the research dossier.
- Apply a strict rule rejecting invented or ungrounded citations; treat any unsupported or made-up reference as a critical factual/epistemic error.
- Verify that every claim maps correctly to its cited source excerpt, source ID, and publication metadata.
- Audit each material claim, causal explanation, analogy, number, date, and domain-specific safety statement. Check for unverified status, disputed claims lacking caveats, or missing source mapping.
- Flag unsupported claims, overgeneralizations, missing conditions, false equivalences, and potentially harmful medical/legal/safety advice.

Return JSON with:
- status (pass|revise)
- criticalErrors (must force revise if any unverified/invented citations or critical facts fail)
- materialIssues
- unsupportedClaims
- analogyIssues
- domainSafetyIssues
- correctedClaimSuggestions
- sourceVerificationRequired
- summary. 

Be conservative and precise. JSON only.`,
    },
    input,
  );
}
