// Ensure env vars are loaded when running inside the Express server.
// In Vercel serverless, env vars are injected automatically.
import { config as dotenvConfig } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
const __registryDir = dirname(fileURLToPath(import.meta.url));
dotenvConfig({ path: resolve(__registryDir, '../../.env') });

export type ApiHandler = (req: any, res: any) => Promise<void> | void;

type RouteEntry = {
  GET?: ApiHandler;
  POST?: ApiHandler;
  PUT?: ApiHandler;
  PATCH?: ApiHandler;
  DELETE?: ApiHandler;
};

import health from './health';
import submissionsMy from './submissions/my';
import submissionsWithdraw from './submissions/withdraw';
import webhooksStripe from './webhooks/stripe';
import webhooksResend from './webhooks/resend';
import paymentsCreateCheckout from './payments/create-checkout';
import paymentsRazorpayVerify from './payments/razorpay-verify';
import paymentsStripeVerify from './payments/stripe-verify';
import paymentsStripeConnectStart from './payments/stripe-connect-start';
import paymentsStripeConnectStatus from './payments/stripe-connect-status';
import notificationsDeadlineApproaching from './notifications/deadline-approaching';
import notificationsJudgeAssigned from './notifications/judge-assigned';
import notificationsNewSubmission from './notifications/new-submission';
import invitesJudge from './invites/judge';
import invitesResend from './invites/resend';
import invitesTeam from './invites/team';
import invitesVerifyJudge from './invites/verify-judge';
import invitesVerifyTeam from './invites/verify-team';
import scoresJudgeSubmit from './scores/judge-submit';
import authForgotPassword from './auth/forgot-password';

const routes: Record<string, RouteEntry> = {
  health: { GET: health },
  'submissions/my': { GET: submissionsMy },
  'submissions/withdraw': { POST: submissionsWithdraw },
  'webhooks/stripe': { POST: webhooksStripe },
  'webhooks/resend': { POST: webhooksResend },
  'payments/create-checkout': { POST: paymentsCreateCheckout },
  'payments/razorpay-verify': { POST: paymentsRazorpayVerify },
  'payments/stripe-verify': { POST: paymentsStripeVerify },
  'payments/stripe-connect-start': { GET: paymentsStripeConnectStart },
  'payments/stripe-connect-status': { GET: paymentsStripeConnectStatus },
  'notifications/deadline-approaching': { POST: notificationsDeadlineApproaching },
  'notifications/judge-assigned': { POST: notificationsJudgeAssigned },
  'notifications/new-submission': { POST: notificationsNewSubmission },
  'invites/judge': { POST: invitesJudge },
  'invites/resend': { POST: invitesResend },
  'invites/team': { POST: invitesTeam },
  'invites/verify-judge': { GET: invitesVerifyJudge, POST: invitesVerifyJudge },
  'invites/verify-team': { GET: invitesVerifyTeam, POST: invitesVerifyTeam },
  'scores/judge-submit': { POST: scoresJudgeSubmit },
  'auth/forgot-password': { POST: authForgotPassword },
};

export function resolveHandler(path: string, method: string): ApiHandler | null {
  const normalizedPath = path.replace(/^\/+|\/+$/g, '') || 'health';
  const route = routes[normalizedPath];
  if (!route) return null;

  const handler = route[method as keyof RouteEntry];
  return handler || null;
}
