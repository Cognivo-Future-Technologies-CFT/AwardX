import { PlanTier } from './plan';

export type SubscriptionStatus = 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'TRIALING';
export type BillingCycle = 'MONTHLY' | 'ANNUALLY';

export interface Subscription {
  id: string;
  organizationId: string;
  planId: string;
  tier: PlanTier;
  status: SubscriptionStatus;
  billingCycle: BillingCycle;
  currentPeriodStart: string; // ISO Date String
  currentPeriodEnd: string;   // ISO Date String
  cancelAtPeriodEnd: boolean;
  paymentMethod: {
    brand: string; // e.g., 'Visa'
    last4: string;
    expMonth: number;
    expYear: number;
  } | null;
}
