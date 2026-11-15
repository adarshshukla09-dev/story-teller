/**
 * Deterministic source ingestion and citation validation.
 *
 * Accepted source material shape:
 * {
 *   id: "SRC01", title: "...", authorOrPublisher: "...",
 *   publicationDate: "YYYY-MM-DD" | "unknown",
 *   reliabilityRating: "high" | "medium" | "low" | "not-assessed",
 *   reference: "https://..." | "DOI/..." | "user-provided",
 *   content: "Full supplied text or notes",
 *   keyExcerpts: ["Exact excerpt from content"]
 * }
 *
 * This module does not browse or authenticate sources. It only verifies that
 * claim excerpts exactly match text the caller supplied.
 */

export type SourceMaterial = {
  id: string;
  title: string;
  authorOrPublisher: string;
  publicationDate: string;
  reliabilityRating: "high" | "medium" | "low" | "not-assessed";
  reference: string;
  content: string;
  keyExcerpts: string[];
};

const asText = (value: unknown): string =>
  typeof value === "string" ? value.trim() : "";

export function normalizeSourceMaterials(input: unknown[]): SourceMaterial[] {
  const seen = new Set<string>();
  const output: SourceMaterial[] = [];

  for (const [index, raw] of input.entries()) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
    const item = raw as Record<string, unknown>;
    const id = asText(item.id) || `SRC${String(index + 1).padStart(2, "0")}`;
    if (seen.has(id)) throw new Error(`Duplicate source id: ${id}`);
    seen.add(id);

    const content = asText(item.content ?? item.text ?? item.fullText);
    const excerpts = Array.isArray(item.keyExcerpts)
      ? item.keyExcerpts.map(asText).filter(Boolean)
      : [];
    const reliability = asText(item.reliabilityRating).toLowerCase();

    output.push({
      id,
      title: asText(item.title) || `Untitled supplied source ${index + 1}`,
      authorOrPublisher: asText(item.authorOrPublisher ?? item.author ?? item.publisher) || "Not supplied",
      publicationDate: asText(item.publicationDate ?? item.date) || "unknown",
      reliabilityRating: (["high", "medium", "low"].includes(reliability)
        ? reliability
        : "not-assessed") as SourceMaterial["reliabilityRating"],
      reference: asText(item.reference ?? item.url ?? item.doi) || "user-provided",
      content,
      keyExcerpts: excerpts,
    });
  }

  return output;
}

/**
 * Constrain the model-produced dossier to caller-supplied source records.
 * A claim is marked verified only when its source ID resolves and its excerpt
 * is an exact substring of supplied content or a supplied key excerpt.
 */
export function groundResearchDossier<T extends Record<string, any>>(
  dossier: T,
  supplied: SourceMaterial[],
): T {
  const byId = new Map(supplied.map((source) => [source.id, source]));
  const claims = Array.isArray(dossier.claims) ? dossier.claims : [];

  const groundedClaims = claims.map((raw: any, index: number) => {
    const claim = raw && typeof raw === "object" ? raw : {};
    const source = typeof claim.sourceId === "string" ? byId.get(claim.sourceId) : undefined;
    const excerpt = asText(claim.sourceExcerpt);
    const searchable = source
      ? [source.content, ...source.keyExcerpts].filter(Boolean)
      : [];
    const exactMatch = Boolean(excerpt && searchable.some((text) => text.includes(excerpt)));

    return {
      ...claim,
      id: asText(claim.id) || `CL${String(index + 1).padStart(2, "0")}`,
      sourceId: source && exactMatch ? source.id : null,
      sourceExcerpt: source && exactMatch ? excerpt : null,
      verificationStatus: source && exactMatch ? "verified" : "unverified",
      ...(source && exactMatch ? {} : {
        groundingNote: !source
          ? "No matching caller-supplied source ID."
          : "Excerpt does not exactly match supplied source text or key excerpts.",
      }),
    };
  });

  // Never allow model-invented source entries into the final dossier.
  const sourceList = supplied.map(({ content, ...metadata }) => ({
    ...metadata,
    keyExcerpts: metadata.keyExcerpts,
  }));

  return {
    ...dossier,
    claims: groundedClaims,
    sourceList,
    sourceGrounding: {
      suppliedSourceCount: supplied.length,
      verifiedClaimCount: groundedClaims.filter((claim: any) => claim.verificationStatus === "verified").length,
      unverifiedClaimCount: groundedClaims.filter((claim: any) => claim.verificationStatus !== "verified").length,
      note: "Verification means excerpt-matched to caller-supplied text; it does not independently authenticate the publication.",
    },
  };
}
