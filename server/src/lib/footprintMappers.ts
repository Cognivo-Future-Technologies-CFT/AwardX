/** Map person_digital_footprints DB rows to API camelCase. */
export function mapFootprintRow(row: Record<string, unknown>) {
  return {
    id: row.id,
    personProfileId: row.person_profile_id,
    sourceType: row.source_type,
    sourceName: row.source_name,
    sourceUrl: row.source_url,
    title: row.title,
    snippet: row.snippet,
    confidence: Number(row.confidence || 0),
    collectedAt: row.collected_at,
    data: (row.data as Record<string, unknown>) || {},
  };
}

/** Map submission_claims + nested verifications to API camelCase. */
export function mapClaimRow(row: Record<string, unknown>) {
  const verifications = (row.claim_verifications as Record<string, unknown>[]) || [];
  return {
    id: row.id,
    submissionId: row.submission_id,
    claimText: row.claim_text,
    claimType: row.claim_type,
    claimSubject: row.claim_subject,
    verificationStatus: row.verification_status,
    verificationConfidence:
      row.verification_confidence != null ? Number(row.verification_confidence) : null,
    verificationSummary: row.verification_summary,
    claimVerifications: verifications.map(mapVerificationRow),
  };
}

function mapVerificationRow(row: Record<string, unknown>) {
  return {
    id: row.id,
    claimId: row.claim_id,
    sourceUrl: row.source_url,
    sourceTitle: row.source_title,
    sourceSnippet: row.source_snippet,
    extractedEvidence: row.extracted_evidence,
    supportsClaim: row.supports_claim,
    verificationMethod: row.verification_method,
    relevanceScore: Number(row.relevance_score || 0),
    authorityScore: Number(row.authority_score || 0),
    confidence: Number(row.confidence || 0),
    createdAt: row.created_at,
  };
}
