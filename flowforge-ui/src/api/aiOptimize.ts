import api from './axios'
import { unwrap } from './utils'

export type OptimizationSuggestion = {
  type:
    | 'RETRY_TUNING'
    | 'TIMEOUT_TUNING'
    | 'PARALLELIZATION'
    | 'DEAD_BRANCH'
    | 'RATE_LIMIT_RISK'
    | 'SCHEMA_MISMATCH'
  severity: 'INFO' | 'WARN' | 'CRITICAL'
  stepId?: string
  description: string
  rationale: string
}

export type OptimizationResult = {
  workflowId: string
  sampleSize: number
  analyzedAt: string
  summary: string
  suggestions: OptimizationSuggestion[]
}

export async function optimizeWorkflow(workflowId: string): Promise<OptimizationResult> {
  const res = await api.post(`/workflows/${workflowId}/optimize`)
  return unwrap<OptimizationResult>(res.data)
}
