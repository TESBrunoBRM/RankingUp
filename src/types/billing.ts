export interface BillingStatus {
  mode: 'disabled' | 'test' | 'live';
  plan: 'free' | 'pro';
  remaining: number | null;
  monthlyAllowance: number;
  used: number;
  rewards: number;
  period: string;
  resetsAt: string | null;
  proUntil: string | null;
  purchasesReady: boolean;
  rewardsReady: boolean;
}
