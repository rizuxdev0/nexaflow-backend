export enum SubscriptionPlan {
  STARTER = 'starter',
  PRO = 'pro',
  BUSINESS = 'business',
  ENTERPRISE = 'enterprise',
}

export interface PlanQuotas {
  maxProducts: number;
  maxUsers: number;
  maxOrdersPerMonth: number;
  maxWarehouses: number;
  hasPos: boolean;
  hasChat: boolean;
  hasAnalytics: boolean;
  hasCustomReports: boolean;
  supportType: 'email' | 'whatsapp' | 'priority';
}

export const PLAN_QUOTAS: Record<SubscriptionPlan, PlanQuotas> = {
  [SubscriptionPlan.STARTER]: {
    maxProducts: 50,
    maxUsers: 1,
    maxOrdersPerMonth: 100,
    maxWarehouses: 1,
    hasPos: true,
    hasChat: false,
    hasAnalytics: false,
    hasCustomReports: false,
    supportType: 'email',
  },
  [SubscriptionPlan.PRO]: {
    maxProducts: 1000,
    maxUsers: 3,
    maxOrdersPerMonth: 5000,
    maxWarehouses: 2,
    hasPos: true,
    hasChat: true,
    hasAnalytics: true,
    hasCustomReports: false,
    supportType: 'whatsapp',
  },
  [SubscriptionPlan.BUSINESS]: {
    maxProducts: Infinity,
    maxUsers: 10,
    maxOrdersPerMonth: Infinity,
    maxWarehouses: 5,
    hasPos: true,
    hasChat: true,
    hasAnalytics: true,
    hasCustomReports: true,
    supportType: 'priority',
  },
  [SubscriptionPlan.ENTERPRISE]: {
    maxProducts: Infinity,
    maxUsers: Infinity,
    maxOrdersPerMonth: Infinity,
    maxWarehouses: Infinity,
    hasPos: true,
    hasChat: true,
    hasAnalytics: true,
    hasCustomReports: true,
    supportType: 'priority',
  },
};
