import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8'
import { Resend } from 'https://esm.sh/resend@3.2.0'
import { qrcode } from 'https://deno.land/x/qrcode@v0.0.1/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { recordId } = await req.json()
    if (!recordId) {
      return new Response(JSON.stringify({ error: 'recordId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey)

    const { data: record, error: recordError } = await supabaseClient
      .from('program_attendance')
      .select('*, programs(id, title, organization_id)')
      .eq('id', recordId)
      .maybeSingle()

    if (recordError || !record) {
      return new Response(JSON.stringify({ error: 'Record not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const program = record.programs as any
    if (!program) {
      return new Response(JSON.stringify({ error: 'Associated program not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ponytail: never trust localhost SITE_URL in outbound email
    const siteUrl = (() => {
      for (const raw of [Deno.env.get('SITE_URL'), Deno.env.get('VITE_SITE_URL')]) {
        const configured = (raw || '').trim().replace(/\/$/, '')
        if (configured && !/localhost|127\.0\.0\.1|\[::1\]/i.test(configured)) {
          try {
            const parsed = new URL(configured)
            if (parsed.protocol === 'http:') parsed.protocol = 'https:'
            return parsed.origin
          } catch {
            return configured
          }
        }
      }
      return 'https://www.awardx.one'
    })()
    const scanUrl = `${siteUrl}/attendance/scan?token=${record.qr_code_token}`

    const qrDataUrl = await qrcode(scanUrl, { size: 300 })
    const qrBase64 = String(qrDataUrl).includes(',')
      ? String(qrDataUrl).split(',')[1]
      : String(qrDataUrl)

    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    if (!resendApiKey) {
      return new Response(JSON.stringify({ error: 'RESEND_API_KEY environment variable is not set.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const resend = new Resend(resendApiKey)
    const fromEmail = Deno.env.get('RESEND_FROM') || 'onboarding@resend.dev'
    const subject = `Your Attendance Pass for ${program.title}`
    const previewText = `Your attendance pass for ${program.title} is ready.`
    const safeName = escapeHtml(String(record.name || ''))
    const safeEmail = escapeHtml(String(record.email || ''))
    const safeTitle = escapeHtml(String(program.title || ''))
    const safeScanUrl = escapeHtml(scanUrl)

    const html = `<!doctype html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <title>${escapeHtml(subject)}</title>
  </head>
  <body style="margin:0;padding:0;background-color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
    <span style="display:none;visibility:hidden;opacity:0;color:transparent;height:0;width:0;">${escapeHtml(previewText)}</span>
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f8fafc;">
      <tr>
        <td align="center" style="padding:40px 20px;">
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="560" style="width:560px;max-width:100%;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
            <tr>
              <td style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:32px 40px;text-align:center;">
                <img src="https://www.awardx.one/logo.png" alt="AwardX" height="44" style="height:44px;width:auto;display:block;margin:0 auto 8px;" />
              </td>
            </tr>
            <tr>
              <td style="padding:40px;">
                <h2 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#1e293b;line-height:1.3;">Attendance Check-In Pass</h2>
                <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#334155;">Hi ${safeName},</p>
                <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#334155;">
                  Here is your attendance check-in pass for <strong>${safeTitle}</strong>. Please display the QR code below at the reception desk to check in:
                </p>
                <div style="text-align:center;margin:0 0 24px;background-color:#f8fafc;padding:16px;border-radius:12px;border:1px solid #f1f5f9;">
                  <img src="cid:attendance-qr" alt="Check-in Pass QR Code" style="display:block;width:220px;height:220px;margin:0 auto;" />
                </div>
                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 24px;">
                  <tr>
                    <td align="center">
                      <a href="${safeScanUrl}" style="display:inline-block;background-color:#4f46e5;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;padding:12px 28px;border-radius:10px;">Open Digital Pass</a>
                    </td>
                  </tr>
                </table>
                <p style="margin:0 0 24px;font-size:12px;line-height:1.5;color:#64748b;text-align:center;">
                  If the button above does not work, copy and paste this URL into your browser:<br />
                  <a href="${safeScanUrl}" style="color:#4f46e5;word-break:break-all;">${safeScanUrl}</a>
                </p>
                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin:24px 0;background-color:#f1f5f9;border-radius:8px;border-left:4px solid #4f46e5;">
                  <tr>
                    <td style="padding:16px 20px;">
                      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                        <tr>
                          <td style="padding:6px 0;font-size:14px;color:#475569;width:100px;vertical-align:top;"><strong>Event:</strong></td>
                          <td style="padding:6px 0;font-size:14px;color:#1e293b;font-weight:600;vertical-align:top;">${safeTitle}</td>
                        </tr>
                        <tr>
                          <td style="padding:6px 0;font-size:14px;color:#475569;vertical-align:top;"><strong>Participant:</strong></td>
                          <td style="padding:6px 0;font-size:14px;color:#1e293b;font-weight:600;vertical-align:top;">${safeName}</td>
                        </tr>
                        <tr>
                          <td style="padding:6px 0;font-size:14px;color:#475569;vertical-align:top;"><strong>Email:</strong></td>
                          <td style="padding:6px 0;font-size:14px;color:#1e293b;font-weight:600;vertical-align:top;">${safeEmail}</td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
                <p style="margin:24px 0 0;font-size:15px;line-height:1.6;color:#334155;">Best regards,<br /><strong>AwardX</strong></p>
              </td>
            </tr>
            <tr>
              <td style="background:#f8fafc;padding:24px 40px;border-top:1px solid #e2e8f0;">
                <p style="margin:0;font-size:12px;line-height:1.5;color:#94a3b8;text-align:center;">
                  Sent via AwardX. Please do not reply directly to this email.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`

    const { data: resData, error: resError } = await resend.emails.send({
      from: fromEmail,
      to: record.email,
      subject,
      html,
      attachments: [
        {
          filename: 'qr.png',
          content: qrBase64,
          contentId: 'attendance-qr',
        },
      ],
    })

    if (resError) {
      return new Response(JSON.stringify({ error: resError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ ok: true, data: resData }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
