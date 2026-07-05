import { Resend } from 'resend';

export function getAppResendMailer(): { resend: Resend; from: string } | null {
  const apiKey = (process.env.RESEND_API_KEY || '').trim();
  const from = (process.env.RESEND_FROM || 'AwardX <no-reply@awardx.one>').trim();
  if (!apiKey || !from) return null;
  return { resend: new Resend(apiKey), from };
}
