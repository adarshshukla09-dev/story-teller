import { z } from "zod";

/**
 * Fact-check schemas.
 *
 * Two shapes, on purpose:
 *  - FactCheckGenerationSchema: what the model must return. Source fields are
 *    plain strings ("" = no supporting evidence) because structured-output
 *    JSON schemas handle required strings far more reliably than nullables.
 *  - FactCheckResultSchema: the normalized shape stored in graph state, where
 *    empty source fields become null. Matches the fact-check SKILL.md contract.
 */

export const FactCheckVerdictSchema = z.enum([
  "verified",
  "unsupported",
  "false",
  "disputed",
  "misleading",
  "unverifiable",
]);

export const IssueSeveritySchema = z.enum(["blocking", "major", "minor"]);

export const AnalogyVerdictSchema = z.enum([
  "acceptable",
  "oversimplified",
  "misleading",
  "incorrect",
]);

const VerificationLimitationsSchema = z.object({
  externalRetrievalAvailable: z.boolean(),
  independentVerificationPerformed: z.boolean(),
  limitations: z.array(z.string()),
});

const CausalAuditSchema = z.object({
  relationship: z.string(),
  verdict: FactCheckVerdictSchema,
  reason: z.string(),
  missingSteps: z.array(z.string()),
  correctionSuggestion: z.string(),
});

const AnalogyAuditSchema = z.object({
  analogy: z.string(),
  verdict: AnalogyVerdictSchema,
  reason: z.string(),
  limitationsToExplain: z.array(z.string()),
  correctionSuggestion: z.string(),
});

const DomainSafetyAuditSchema = z.object({
  issue: z.string(),
  severity: IssueSeveritySchema,
  reason: z.string(),
  requiredAction: z.string(),
});

const claimAuditBase = {
  claim: z.string(),
  verdict: FactCheckVerdictSchema,
  severity: IssueSeveritySchema,
  reason: z.string(),
  evidenceAssessment: z.string(),
  correctionSuggestion: z.string(),
};

const sharedFields = {
  status: z.enum(["pass", "revise"]),
  overallScore: z.number().min(0).max(100),
  auditSummary: z.string(),
  verificationLimitations: VerificationLimitationsSchema,
  causalAudits: z.array(CausalAuditSchema),
  analogyAudits: z.array(AnalogyAuditSchema),
  domainSafetyAudits: z.array(DomainSafetyAuditSchema),
  blockingIssues: z.array(z.string()),
  majorIssues: z.array(z.string()),
  minorIssues: z.array(z.string()),
  correctionInstructions: z.array(z.string()),
  approvedClaims: z.array(z.string()),
  claimsRequiringVerification: z.array(z.string()),
  summary: z.string(),
};

/** Model-facing schema: sourceId / sourceExcerpt are strings, "" when absent. */
export const FactCheckGenerationSchema = z.object({
  ...sharedFields,
  claimAudits: z.array(
    z.object({
      ...claimAuditBase,
      sourceId: z.string(),
      sourceExcerpt: z.string(),
    }),
  ),
});

/** State-facing schema: absent evidence is null. */
export const FactCheckResultSchema = z.object({
  ...sharedFields,
  claimAudits: z.array(
    z.object({
      ...claimAuditBase,
      sourceId: z.string().nullable(),
      sourceExcerpt: z.string().nullable(),
    }),
  ),
});

export type FactCheckGenerationOutput = z.infer<
  typeof FactCheckGenerationSchema
>;
export type FactCheckResultOutput = z.infer<typeof FactCheckResultSchema>;
