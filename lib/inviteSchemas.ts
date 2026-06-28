import { z } from 'zod';

export const teamInviteSchema = z.object({
  email: z.string().email(),
  roleId: z.string().uuid().optional(),
  roleName: z.string().trim().min(1).max(100).optional(),
  programTitle: z.string().trim().min(1).max(200),
  organizationId: z.string().uuid().optional(),
  programId: z.string().uuid().optional(),
  inviteUrl: z.string().trim().url().optional(),
});

export const judgeInviteSchema = z.object({
  email: z.string().email(),
  name: z.string().trim().min(1).max(120).optional(),
  programTitle: z.string().trim().min(1).max(200),
  organizationId: z.string().uuid().optional(),
  programId: z.string().uuid().optional(),
  inviteId: z.string().uuid().optional(),
  inviteUrl: z.string().trim().url().optional(),
});

export const resendInviteSchema = z.object({
  inviteType: z.enum(['judge', 'team']),
  recordId: z.string().uuid(),
  programTitleFallback: z.string().trim().min(1).max(200).optional(),
});
