/**
 * Central plan limits configuration — single source of truth for the frontend.
 * Must stay in sync with PlanLimits.java in flowforge-common.
 *
 * A value of -1 means "unlimited".
 */

export type Plan = 'FREE' | 'PRO' | 'ENTERPRISE'

export interface PlanLimitsConfig {
  maxWorkflows: number
  maxModels: number
  maxExecutionsPerMonth: number
  maxTeamMembers: number
  reqPerMinute: number
  burstCapacity: number
  maxWebhooksPerDay: number
  priceMonthly: number // cents (0 = free, -1 = custom)
}

export const PLAN_LIMITS: Record<Plan, PlanLimitsConfig> = {
  FREE: {
    maxWorkflows: 3,
    maxModels: 5,
    maxExecutionsPerMonth: 1_000,
    maxTeamMembers: 2,
    reqPerMinute: 10,
    burstCapacity: 20,
    maxWebhooksPerDay: 100,
    priceMonthly: 0,
  },
  PRO: {
    maxWorkflows: 25,
    maxModels: 50,
    maxExecutionsPerMonth: 100_000,
    maxTeamMembers: 10,
    reqPerMinute: 60,
    burstCapacity: 100,
    maxWebhooksPerDay: 10_000,
    priceMonthly: 4_900,
  },
  ENTERPRISE: {
    maxWorkflows: -1,
    maxModels: -1,
    maxExecutionsPerMonth: -1,
    maxTeamMembers: -1,
    reqPerMinute: 600,
    burstCapacity: 1_000,
    maxWebhooksPerDay: -1,
    priceMonthly: -1,
  },
}

/** Human-readable plan metadata for UI cards, comparison grids, etc. */
export const PLAN_META: Record<Plan, { label: string; price: string; tagline: string }> = {
  FREE: { label: 'Free', price: '$0/mo', tagline: 'For personal projects and exploration' },
  PRO: { label: 'Pro', price: '$49/mo', tagline: 'For growing teams and production workloads' },
  ENTERPRISE: { label: 'Enterprise', price: 'Custom', tagline: 'Dedicated infra, SLA guarantee, priority support' },
}

/** Format a limit value for display — returns "Unlimited" for -1 */
export function formatLimit(value: number): string {
  if (value === -1) return 'Unlimited'
  return value.toLocaleString()
}

/** Check if a usage count has hit the limit (false when unlimited) */
export function isAtLimit(used: number, limit: number): boolean {
  return limit !== -1 && used >= limit
}

/** Check if usage is near the limit (>= 80%) */
export function isNearLimit(used: number, limit: number): boolean {
  if (limit === -1) return false
  return used >= limit * 0.8
}

/** Get the list of feature rows for plan comparison grids */
export function getPlanFeatureRows(): Array<{ label: string; key: keyof PlanLimitsConfig; unit?: string }> {
  return [
    { label: 'Workflows', key: 'maxWorkflows' },
    { label: 'Data Models', key: 'maxModels' },
    { label: 'Executions / month', key: 'maxExecutionsPerMonth' },
    { label: 'Team Members', key: 'maxTeamMembers' },
    { label: 'API Rate Limit', key: 'reqPerMinute', unit: 'req/min' },
    { label: 'Webhooks / day', key: 'maxWebhooksPerDay' },
  ]
}
