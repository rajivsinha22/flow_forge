import { useBillingStore } from '../store/billingStore'
import { PLAN_LIMITS } from '../config/planLimits'

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

export function useChatMessageLimit() {
  const usage = useBillingStore((s) => s.usage)
  const plan = usage?.plan ?? 'FREE'
  const limit = PLAN_LIMITS[plan].maxAiChatMessagesPerDay

  function canSendChatMessage(usedToday: number): { allowed: boolean; reason?: string } {
    if (limit === -1) return { allowed: true }
    if (usedToday >= limit) {
      return {
        allowed: false,
        reason: `Daily AI chat limit reached (${usedToday}/${limit}). Upgrade your plan for more.`,
      }
    }
    return { allowed: true }
  }

  return { canSendChatMessage, limit, plan }
}
