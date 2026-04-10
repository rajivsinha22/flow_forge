import React, { useEffect, useState } from 'react'
import { Crown, CreditCard, TrendingUp, ArrowUpRight, ArrowDownRight, XCircle, CheckCircle2, BarChart3 } from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import { PLAN_LIMITS, PLAN_META, formatLimit, getPlanFeatureRows, type Plan } from '../config/planLimits'
import { useBillingStore } from '../store/billingStore'
import { createCheckoutSession, changePlan, cancelSubscription, getPaymentHistory } from '../api/billing'
import Spinner from '../components/shared/Spinner'
import StatusBadge from '../components/shared/StatusBadge'
import type { PaymentEvent } from '../types'

const PLAN_BADGE_COLORS: Record<Plan, string> = {
  FREE: 'bg-gray-100 text-gray-700',
  PRO: 'bg-blue-100 text-blue-700',
  ENTERPRISE: 'bg-purple-100 text-purple-700',
}

function progressBarColor(percent: number): string {
  if (percent >= 90) return 'bg-red-500'
  if (percent >= 70) return 'bg-yellow-500'
  return 'bg-green-500'
}

function formatCents(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency.toUpperCase() }).format(amount / 100)
}

const USAGE_ROWS: Array<{ label: string; key: 'workflows' | 'models' | 'executions' | 'teamMembers' | 'webhooks'; suffix?: string }> = [
  { label: 'Workflows', key: 'workflows' },
  { label: 'Data Models', key: 'models' },
  { label: 'Executions / month', key: 'executions' },
  { label: 'Team Members', key: 'teamMembers' },
  { label: 'Webhooks / day', key: 'webhooks' },
]

const Billing: React.FC = () => {
  const { subscription, usage, isLoading, error, fetchAll } = useBillingStore()
  const [payments, setPayments] = useState<PaymentEvent[]>([])
  const [isChangingPlan, setIsChangingPlan] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)
  const [actionMsg, setActionMsg] = useState<string | null>(null)

  useEffect(() => {
    fetchAll()
    getPaymentHistory().then(setPayments).catch(() => {})
  }, [fetchAll])

  const currentPlan: Plan = (subscription?.plan as Plan) || 'FREE'

  const handleUpgradeOrDowngrade = async (targetPlan: Plan) => {
    if (targetPlan === currentPlan) return
    setIsChangingPlan(true)
    setActionMsg(null)
    try {
      if (currentPlan === 'FREE' && targetPlan !== 'FREE') {
        const { url } = await createCheckoutSession(targetPlan, window.location.href, window.location.href)
        window.open(url, '_blank')
        setActionMsg('Checkout session opened in new tab')
      } else {
        await changePlan(targetPlan)
        await fetchAll()
        setActionMsg(`Plan changed to ${PLAN_META[targetPlan].label}`)
      }
    } catch {
      setActionMsg('Failed to change plan. Please try again.')
    } finally {
      setIsChangingPlan(false)
      setTimeout(() => setActionMsg(null), 4000)
    }
  }

  const handleCancel = async () => {
    setIsCancelling(true)
    setActionMsg(null)
    try {
      await cancelSubscription()
      await fetchAll()
      setActionMsg('Subscription cancelled')
    } catch {
      setActionMsg('Failed to cancel subscription')
    } finally {
      setIsCancelling(false)
      setTimeout(() => setActionMsg(null), 4000)
    }
  }

  if (isLoading && !subscription) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner size="lg" label="Loading billing..." />
      </div>
    )
  }

  if (error && !subscription) {
    return (
      <div className="p-8 max-w-6xl mx-auto">
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl px-4 py-3 text-sm">
          {error}
        </div>
      </div>
    )
  }

  const featureRows = getPlanFeatureRows()
  const allPlans: Plan[] = ['FREE', 'PRO', 'ENTERPRISE']

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Billing</h1>
        <p className="text-gray-500 text-sm mt-1">Manage your subscription, usage, and payment history</p>
      </div>

      {actionMsg && (
        <div className="bg-green-50 border border-green-200 text-green-800 rounded-xl px-4 py-3 text-sm mb-6">
          {actionMsg}
        </div>
      )}

      {/* ── A) Current Plan ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Crown size={18} className="text-blue-600" />
          <h2 className="font-semibold text-gray-900">Current Plan</h2>
        </div>

        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="text-xl font-bold text-gray-900">{PLAN_META[currentPlan].label}</span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${PLAN_BADGE_COLORS[currentPlan]}`}>
                {currentPlan}
              </span>
              {subscription?.subscriptionStatus && (
                <StatusBadge status={subscription.subscriptionStatus.toUpperCase()} />
              )}
            </div>
            <p className="text-sm text-gray-500">{PLAN_META[currentPlan].tagline}</p>
            <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
              <div className="flex items-center gap-1">
                <CreditCard size={14} className="text-gray-400" />
                <span className="font-medium">{PLAN_META[currentPlan].price}</span>
              </div>
              {subscription?.currentPeriodEnd && (
                <div className="flex items-center gap-1">
                  <TrendingUp size={14} className="text-gray-400" />
                  <span>Renews {formatDistanceToNow(new Date(subscription.currentPeriodEnd), { addSuffix: true })}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {currentPlan === 'FREE' ? (
              <button
                onClick={() => handleUpgradeOrDowngrade('PRO')}
                disabled={isChangingPlan}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium rounded-xl transition-colors"
              >
                <ArrowUpRight size={14} /> Upgrade to Pro
              </button>
            ) : (
              <>
                {currentPlan === 'PRO' && (
                  <button
                    onClick={() => handleUpgradeOrDowngrade('ENTERPRISE')}
                    disabled={isChangingPlan}
                    className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white text-sm font-medium rounded-xl transition-colors"
                  >
                    <ArrowUpRight size={14} /> Upgrade
                  </button>
                )}
                <button
                  onClick={handleCancel}
                  disabled={isCancelling}
                  className="flex items-center gap-1.5 px-4 py-2 border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 text-sm font-medium rounded-xl transition-colors"
                >
                  <XCircle size={14} /> Cancel Subscription
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── B) Usage Dashboard ──────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 size={18} className="text-blue-600" />
          <h2 className="font-semibold text-gray-900">Usage</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {USAGE_ROWS.map((row) => {
            const item = usage?.[row.key]
            const used = item?.used ?? 0
            const limit = item?.limit ?? -1
            const isUnlimited = limit === -1
            const percent = isUnlimited ? 0 : Math.min(Math.round((used / limit) * 100), 100)

            return (
              <div key={row.key} className="p-3 bg-gray-50 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">{row.label}</span>
                  <span className="text-sm text-gray-500">
                    {used.toLocaleString()} / {isUnlimited ? 'Unlimited' : limit.toLocaleString()}
                  </span>
                </div>
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${isUnlimited ? 'bg-green-500' : progressBarColor(percent)}`}
                    style={{ width: `${isUnlimited ? 0 : percent}%` }}
                  />
                </div>
                {!isUnlimited && (
                  <p className="text-xs text-gray-400 mt-1">{percent}% used</p>
                )}
              </div>
            )
          })}

          {/* API Rate Limit */}
          <div className="p-3 bg-gray-50 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">API Rate Limit</span>
              <span className="text-sm text-gray-500">
                {PLAN_LIMITS[currentPlan].reqPerMinute} req/min
              </span>
            </div>
            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-green-500" style={{ width: '0%' }} />
            </div>
            <p className="text-xs text-gray-400 mt-1">Burst: {PLAN_LIMITS[currentPlan].burstCapacity}</p>
          </div>
        </div>
      </div>

      {/* ── C) Plan Comparison ──────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={18} className="text-blue-600" />
          <h2 className="font-semibold text-gray-900">Plan Comparison</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {allPlans.map((plan) => {
            const meta = PLAN_META[plan]
            const limits = PLAN_LIMITS[plan]
            const isCurrent = plan === currentPlan
            const isUpgrade = allPlans.indexOf(plan) > allPlans.indexOf(currentPlan)

            return (
              <div
                key={plan}
                className={`rounded-xl border-2 p-5 flex flex-col ${
                  isCurrent ? 'border-blue-500 bg-blue-50/30' : 'border-gray-200'
                }`}
              >
                <div className="mb-3">
                  <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium mb-2 ${PLAN_BADGE_COLORS[plan]}`}>
                    {plan}
                  </span>
                  <h3 className="text-lg font-bold text-gray-900">{meta.label}</h3>
                  <p className="text-xl font-bold text-blue-600 mt-1">{meta.price}</p>
                  <p className="text-xs text-gray-500 mt-1">{meta.tagline}</p>
                </div>

                <div className="flex-1 space-y-2 mb-4">
                  {featureRows.map((row) => (
                    <div key={row.key} className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">{row.label}</span>
                      <span className="font-medium text-gray-900">
                        {formatLimit(limits[row.key])}
                        {row.unit && limits[row.key] !== -1 ? ` ${row.unit}` : ''}
                      </span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => !isCurrent && handleUpgradeOrDowngrade(plan)}
                  disabled={isCurrent || isChangingPlan || plan === 'ENTERPRISE'}
                  className={`w-full py-2 rounded-xl text-sm font-medium transition-colors ${
                    isCurrent
                      ? 'bg-blue-100 text-blue-700 cursor-default'
                      : plan === 'ENTERPRISE'
                        ? 'bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50'
                        : isUpgrade
                          ? 'bg-blue-600 hover:bg-blue-700 text-white disabled:bg-blue-400'
                          : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {isCurrent ? (
                    <span className="flex items-center justify-center gap-1.5">
                      <CheckCircle2 size={14} /> Current Plan
                    </span>
                  ) : plan === 'ENTERPRISE' ? (
                    'Contact Sales'
                  ) : isUpgrade ? (
                    <span className="flex items-center justify-center gap-1.5">
                      <ArrowUpRight size={14} /> Upgrade
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-1.5">
                      <ArrowDownRight size={14} /> Downgrade
                    </span>
                  )}
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── D) Payment History ──────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-100">
          <CreditCard size={18} className="text-blue-600" />
          <h2 className="font-semibold text-gray-900">Payment History</h2>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
              <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Description</th>
              <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Amount</th>
              <th className="text-left px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {payments.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-14 text-center">
                  <CreditCard size={28} className="mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-400 font-medium">No payment history</p>
                  <p className="text-gray-300 text-xs mt-1">Payment records will appear here after your first transaction.</p>
                </td>
              </tr>
            ) : (
              payments.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-gray-700">{format(new Date(p.createdAt), 'MMM d, yyyy')}</td>
                  <td className="px-4 py-4 text-gray-700">{p.description}</td>
                  <td className="px-4 py-4 font-medium text-gray-900">{formatCents(p.amount, p.currency)}</td>
                  <td className="px-6 py-4">
                    <StatusBadge status={p.status.toUpperCase()} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default Billing
