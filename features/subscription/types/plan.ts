export type PlanTier = 'FREE' | 'PRO' | 'BUSINESS' | 'ENTERPRISE';
export type PlanStatus = 'ACTIVE' | 'INACTIVE' | 'HIDDEN';

export interface Plan {
  id: string;
  tier: PlanTier;
  name: string;
  description: string;
  status: PlanStatus;
  color: string;
  icon: string;
  isPopular: boolean;
  isRecommended: boolean;
  displayOrder: number;
}
