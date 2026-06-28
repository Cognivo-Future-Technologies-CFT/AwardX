type EmailStatus = 'pending' | 'sent' | 'delivered' | 'bounced' | 'complained' | 'failed';

type CreateEmailLogInput = {
  organizationId?: string | null;
  programId?: string | null;
  inviteId?: string | null;
  recipientEmail: string;
  templateKey: string;
  templateVersion?: string;
  context?: Record<string, unknown>;
};

export async function createEmailLog(supabase: any, payload: CreateEmailLogInput) {
  const { data, error } = await supabase
    .from('email_logs')
    .insert({
      organization_id: payload.organizationId || null,
      program_id: payload.programId || null,
      invite_id: payload.inviteId || null,
      recipient_email: payload.recipientEmail.toLowerCase().trim(),
      template_key: payload.templateKey,
      template_version: payload.templateVersion || 'v1',
      context_json: payload.context || {},
      status: 'pending',
    })
    .select('id')
    .single();

  return { id: (data?.id as string | null) || null, error };
}

export async function updateEmailLog(
  supabase: any,
  id: string,
  payload: {
    status: EmailStatus;
    resendMessageId?: string | null;
    errorMessage?: string | null;
  },
) {
  const update: Record<string, unknown> = {
    status: payload.status,
    resend_message_id: payload.resendMessageId || null,
    error_message: payload.errorMessage || null,
    updated_at: new Date().toISOString(),
  };

  if (payload.status === 'sent') {
    update.sent_at = new Date().toISOString();
  }
  if (payload.status === 'delivered') {
    update.delivered_at = new Date().toISOString();
  }

  const { error } = await supabase.from('email_logs').update(update).eq('id', id);
  return { error };
}
