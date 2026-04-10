import { create } from 'zustand'
import type { SubscriptionStatus, PlanUsage } from '../types'
import { getSubscription, getPlanUsage } from '../api/billing'

interface BillingState {
  subscription: SubscriptionStatus | null
  usage: PlanUsage | null
  isLoading: boolean
  error: string | null
  fetchSubscription: () => Promise<void>
  fetchUsage: () => Promise<void>
  fetchAll: () => Promise<void>
}

export const useBillingStore = create<BillingState>()((set) => ({
  subscription: null,
  usage: null,
  isLoading: false,
  error: null,

  fetchSubscription: async () => {
    set({ isLoading: true, error: null })
    try {
      const subscription = await getSubscription()
      set({ subscription, isLoading: false })
    } catch (err: unknown) {
      const message = (err as Error)?.message || 'Failed to fetch subscription'
      set({ error: message, isLoading: false })
    }
  },

  fetchUsage: async () => {
    set({ isLoading: true, error: null })
    try {
      const usage = await getPlanUsage()
      set({ usage, isLoading: false })
    } catch (err: unknown) {
      const message = (err as Error)?.message || 'Failed to fetch usage'
      set({ error: message, isLoading: false })
    }
  },

  fetchAll: async () => {
    set({ isLoading: true, error: null })
    try {
      const [subscription, usage] = await Promise.all([getSubscription(), getPlanUsage()])
      set({ subscription, usage, isLoading: false })
    } catch (err: unknown) {
      const message = (err as Error)?.message || 'Failed to fetch billing data'
      set({ error: message, isLoading: false })
    }
  },
}))
