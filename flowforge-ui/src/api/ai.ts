import api from './axios'
import { unwrap } from './utils'

export interface AiAnalysisResult {
  summary: string
  rootCause: string
  suggestions: string[]
}

/**
 * Analyze a FAILED workflow execution using Claude AI.
 * Returns a structured diagnosis with summary, root cause, and fix suggestions.
 * Only available for executions with status === 'FAILED'.
 */
export const analyzeExecution = async (id: string): Promise<AiAnalysisResult> => {
  const res = await api.post(`/executions/${id}/analyze`)
  return unwrap<AiAnalysisResult>(res.data)
}
