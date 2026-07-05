import { enforceRateLimit, getClientIp } from '../../_utils/rateLimit';
import { createSupabaseAdmin } from '../../_utils/supabaseAdmin';
import { getAppResendMailer } from '../../_utils/appResend';
import { resolveServerPasswordResetUrl } from '../../_utils/siteUrl';
import { forgotPasswordSchema } from '../../_utils/validation';
function escapeHtml(value) {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }
    const parsed = forgotPasswordSchema.safeParse(req.body || {});
    if (!parsed.success) {
        res.status(400).json({ error: 'Valid email is required.' });
        return;
    }
    const ip = getClientIp(req);
    const email = parsed.data.email.toLowerCase().trim();
    const ipLimit = enforceRateLimit(`forgot-password:ip:${ip}`, 10, 15 * 60 * 1000);
    if (!ipLimit.ok) {
        res.setHeader('Retry-After', String(ipLimit.retryAfterSeconds));
        res.status(429).json({
            error: 'Too many reset requests. Please wait a few minutes and try again.',
            retryAfterSeconds: ipLimit.retryAfterSeconds,
        });
        return;
    }
    const emailLimit = enforceRateLimit(`forgot-password:email:${email}`, 5, 60 * 60 * 1000);
    if (!emailLimit.ok) {
        res.setHeader('Retry-After', String(emailLimit.retryAfterSeconds));
        res.status(429).json({
            error: 'Too many reset requests for this email. Please wait before trying again.',
            retryAfterSeconds: emailLimit.retryAfterSeconds,
        });
        return;
    }
    const mailer = getAppResendMailer();
    if (!mailer) {
        res.status(503).json({
            error: 'Password reset email is not configured. Set RESEND_API_KEY and RESEND_FROM.',
        });
        return;
    }
    try {
        const supabase = createSupabaseAdmin();
        const redirectTo = resolveServerPasswordResetUrl(req.headers?.origin);
        const { data, error } = await supabase.auth.admin.generateLink({
            type: 'recovery',
            email,
            options: { redirectTo },
        });
        if (error || !data?.properties?.action_link) {
            // Avoid account enumeration — always respond success when the user is missing.
            res.json({ ok: true });
            return;
        }
        const resetLink = data.properties.action_link;
        const subject = 'Reset your AwardX password';
        const { error: sendError } = await mailer.resend.emails.send({
            from: mailer.from,
            to: email,
            subject,
            text: `Reset your AwardX password using this link:\n${resetLink}\n\nIf you did not request this, you can ignore this email.`,
            html: `<!doctype html>
<html>
  <body style="margin:0;padding:0;background-color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;padding:40px 20px;">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:100%;background:#ffffff;border-radius:12px;padding:40px;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
            <tr>
              <td>
                <h1 style="margin:0 0 16px;font-size:24px;color:#0f172a;">Reset your password</h1>
                <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#475569;">
                  We received a request to reset the password for your AwardX account. Click the button below to choose a new password.
                </p>
                <a href="${escapeHtml(resetLink)}" style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;padding:14px 24px;border-radius:10px;font-weight:700;">
                  Reset password
                </a>
                <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#64748b;">
                  If you did not request this, you can safely ignore this email.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`,
        });
        if (sendError) {
            console.error('Resend error (forgot password):', sendError);
            res.status(500).json({ error: sendError.message || 'Failed to send reset email.' });
            return;
        }
        res.json({ ok: true });
    }
    catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ error: error?.message || 'Internal server error' });
    }
}
