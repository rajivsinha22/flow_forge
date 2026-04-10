import api from './axios'
import { unwrap } from './utils'
import type { SubscriptionStatus, PlanUsage, PaymentEvent, Invoice } from '../types'

export const getSubscription = async (): Promise<SubscriptionStatus> => {
  const res = await api.get('/billing/subscription')
  return unwrap<SubscriptionStatus>(res.data)
}

export const getPlanUsage = async (): Promise<PlanUsage> => {
  const res = await api.get('/billing/usage')
  return unwrap<PlanUsage>(res.data)
}

export const createCheckoutSession = async (plan: string, successUrl: string, cancelUrl: string): Promise<{ url: string }> => {
  const res = await api.post('/billing/checkout', { plan, successUrl, cancelUrl })
  return unwrap<{ url: string }>(res.data)
}

export const changePlan = async (plan: string): Promise<SubscriptionStatus> => {
  const res = await api.post('/billing/change-plan', { plan })
  return unwrap<SubscriptionStatus>(res.data)
}

export const cancelSubscription = async (): Promise<void> => {
  await api.post('/billing/cancel')
}

export const getPaymentHistory = async (page = 0, size = 20): Promise<PaymentEvent[]> => {
  const res = await api.get('/billing/payments', { params: { page, size } })
  return unwrap<PaymentEvent[]>(res.data)
}

export const getInvoices = async (): Promise<Invoice[]> => {
  const res = await api.get('/billing/invoices')
  return unwrap<Invoice[]>(res.data)
}
