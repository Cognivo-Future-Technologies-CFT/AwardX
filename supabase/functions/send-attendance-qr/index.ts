import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8'
import { Resend } from 'https://esm.sh/resend@3.2.0'
import { qrcode } from 'https://deno.land/x/qrcode@v0.0.1/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS
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

    // Initialize Supabase admin client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey)

    // Fetch the attendance record and program title
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

    const siteUrl = (Deno.env.get('SITE_URL') || Deno.env.get('VITE_SITE_URL') || 'http://localhost:3000').replace(/\/$/, '')
    const scanUrl = `${siteUrl}/attendance/scan?token=${record.qr_code_token}`

    // Generate QR base64 data URL using Deno QR library (returns PNG data url)
    const qrDataUrl = await qrcode(scanUrl, { size: 300 })

    // Setup Resend
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
    const html = `
      <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; padding: 24px; margin: 0; }
            .card { background-color: #ffffff; border-radius: 16px; padding: 32px; max-width: 480px; margin: 0 auto; text-align: center; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); }
            .title { font-size: 20px; font-weight: bold; color: #0f172a; margin-bottom: 8px; }
            .subtitle { font-size: 14px; color: #64748b; margin-bottom: 24px; }
            .qr-container { background-color: #f8fafc; padding: 16px; border-radius: 12px; display: inline-block; margin-bottom: 24px; border: 1px solid #f1f5f9; }
            .qr-image { display: block; width: 220px; height: 220px; margin: 0 auto; }
            .details { text-align: left; background-color: #f8fafc; padding: 16px; border-radius: 12px; margin-bottom: 24px; border: 1px solid #f1f5f9; }
            .detail-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px; }
            .detail-row:last-child { margin-bottom: 0; }
            .label { color: #64748b; font-weight: 500; }
            .value { color: #0f172a; font-weight: 600; }
            .footer { font-size: 12px; color: #94a3b8; margin-top: 16px; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="title">Attendance Pass</div>
            <div class="subtitle">Present this QR code to the event organizers to check in.</div>
            <div class="qr-container">
              <img src="${qrDataUrl}" class="qr-image" alt="Check-in Pass QR Code" />
            </div>
            <div class="details">
              <div class="detail-row">
                <span class="label">Event:</span>
                <span class="value">${program.title}</span>
              </div>
              <div class="detail-row">
                <span class="label">Participant:</span>
                <span class="value">${record.name}</span>
              </div>
              <div class="detail-row">
                <span class="label">Email:</span>
                <span class="value">${record.email}</span>
              </div>
            </div>
            <div class="footer">Sent via AwardX system. Please do not reply directly to this email.</div>
          </div>
        </body>
      </html>
    `

    const { data: resData, error: resError } = await resend.emails.send({
      from: fromEmail,
      to: record.email,
      subject,
      html
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
