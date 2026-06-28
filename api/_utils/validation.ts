import { z } from 'zod';

export {
  teamInviteSchema,
  judgeInviteSchema,
  resendInviteSchema,
} from '../../lib/inviteSchemas.js';

export const verifyJudgeSchema = z.object({
  token: z.string().uuid(),
});

export const verifyTeamSchema = z.object({
  token: z.string().uuid(),
});

export const resendWebhookSchema = z.object({
  type: z.string().trim().min(1),
  created_at: z.string().optional(),
  data: z.object({
    email_id: z.string().trim().min(1).optional(),
    to: z.union([z.string(), z.array(z.string())]).optional(),
    from: z.string().optional(),
    subject: z.string().optional(),
  }).passthrough().optional(),
}).passthrough();

export const newSubmissionNotificationSchema = z.object({
  organizationId: z.string().uuid(),
  programId: z.string().uuid(),
  submissionId: z.string().uuid(),
  submissionTitle: z.string().trim().min(1).max(200),
  applicantName: z.string().trim().min(1).max(160).optional(),
});

export const judgeAssignedNotificationSchema = z.object({
  organizationId: z.string().uuid(),
  programId: z.string().uuid(),
  submissionId: z.string().uuid(),
  judgeId: z.string().uuid(),
  judgeName: z.string().trim().min(1).max(160),
  submissionTitle: z.string().trim().min(1).max(200),
});

export const deadlineApproachingNotificationSchema = z.object({
  organizationId: z.string().uuid(),
  programId: z.string().uuid(),
  programTitle: z.string().trim().min(1).max(200),
  deadlineIso: z.string().datetime(),
});

export const createCheckoutSchema = z.object({
  submissionId: z.string().uuid(),
  programId: z.string().uuid(),
  formId: z.string().uuid().optional(),
  currency: z.string().trim().min(3).max(3).optional(),
});

export const stripeWebhookFallbackSchema = z.object({
  type: z.string().trim().min(1),
  data: z.object({
    object: z.record(z.string(), z.any()),
  }),
});

export const stripeConnectStartSchema = z.object({
  programId: z.string().uuid(),
});

export const stripeConnectStatusSchema = z.object({
  programId: z.string().uuid(),
});

export const withdrawSubmissionSchema = z.object({
  submissionId: z.string().uuid(),
  reason: z.string().trim().min(1).max(500).optional(),
});

export const judgeSubmitScoresSchema = z.object({
  token: z.string().uuid(),
  submissionJudgeId: z.string().uuid(),
  criteriaScores: z.array(z.object({
    criterionId: z.string().uuid(),
    score: z.number().finite(),
    comment: z.string().max(2000).optional(),
  })).min(1),
  overallComment: z.string().max(5000).optional(),
});

export const razorpayVerifySchema = z.object({
  submissionId: z.string().uuid(),
  razorpayOrderId: z.string().trim().min(1),
  razorpayPaymentId: z.string().trim().min(1),
  razorpaySignature: z.string().trim().min(1),
});

export const stripeVerifySchema = z.object({
  sessionId: z.string().trim().min(1),
  submissionId: z.string().uuid(),
});
