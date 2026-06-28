/** Extract applicant email/name from submission row, including form responses. */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function extractFromResponses(data: Record<string, unknown> | null | undefined): {
  email: string | null;
  name: string | null;
} {
  if (!data) return { email: null, name: null };

  const responses =
    data.responses && typeof data.responses === 'object' && !Array.isArray(data.responses)
      ? (data.responses as Record<string, unknown>)
      : data;

  let email: string | null = null;
  let name: string | null = null;

  for (const [key, value] of Object.entries(responses)) {
    if (typeof value !== 'string') continue;
    const trimmed = value.trim();
    if (!email && (/email/i.test(key) || EMAIL_RE.test(trimmed))) {
      if (EMAIL_RE.test(trimmed)) email = trimmed;
    }
    if (!name && /(full.?name|name|applicant)/i.test(key) && trimmed.length > 1) {
      name = trimmed;
    }
  }

  return { email, name };
}

export function resolveApplicantIdentity(submission: {
  applicant_email?: string | null;
  applicant_name?: string | null;
  submission_data?: Record<string, unknown> | null;
}): { email: string | null; name: string | null } {
  const fromResponses = extractFromResponses(
    (submission.submission_data as Record<string, unknown>) || null,
  );

  return {
    email: submission.applicant_email?.trim() || fromResponses.email,
    name: submission.applicant_name?.trim() || fromResponses.name,
  };
}
