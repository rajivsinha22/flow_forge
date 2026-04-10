import { useBillingStore } from '../store/billingStore'

type Resource = 'workflows' | 'models' | 'executions' | 'teamMembers' | 'webhooks'

export function usePlanEnforcement(resource: Resource) {
  const usage = useBillingStore((s) => s.usage)
  if (!usage) return { isAtLimit: false, isNearLimit: false, used: 0, limit: -1, percentUsed: 0, isUnlimited: true }

  const { used, limit } = usage[resource]
  const isUnlimited = limit === -1
  const percentUsed = isUnlimited ? 0 : Math.round((used / limit) * 100)

  return {
    isAtLimit: !isUnlimited && used >= limit,
    isNearLimit: !isUnlimited && percentUsed >= 80,
    used,
    limit,
    percentUsed,
    isUnlimited,
  }
}
