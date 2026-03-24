import MockAdapter from 'axios-mock-adapter'
import type { AxiosInstance } from 'axios'
import {
  DUMMY_ME, DUMMY_CLIENT, DUMMY_USERS, DUMMY_ROLES,
  DUMMY_WORKFLOWS, DUMMY_EXECUTIONS,
  DUMMY_STEP_EXECUTIONS_001, DUMMY_STEP_EXECUTIONS_003, DUMMY_STEP_EXECUTIONS_009,
  DUMMY_STEP_EXECUTIONS_002, DUMMY_STEP_EXECUTIONS_004,
  DUMMY_STEP_EXECUTIONS_005, DUMMY_STEP_EXECUTIONS_006,
  DUMMY_WAIT_TOKENS, DUMMY_DLQ, DUMMY_TRIGGERS,
  DUMMY_WEBHOOK_DELIVERIES, DUMMY_API_KEYS, DUMMY_AUDIT_LOGS,
  DUMMY_RATE_LIMITS, DUMMY_ANALYTICS_SUMMARY, DUMMY_EXECUTION_TREND,
  DUMMY_ENV_VARS, DUMMY_WORKFLOW_VERSIONS,
} from './data'

// Wraps data in backend's ApiResponse envelope
const ok = (data: unknown, message = 'OK') => [200, { success: true, data, message }]
const created = (data: unknown, message = 'Created') => [201, { success: true, data, message }]
const notFound = (msg = 'Not found') => [404, { success: false, message: msg }]

// Simulated network delay (ms)
const DELAY = 300

// Helper: paginate an array
function paginate<T>(items: T[], page = 0, size = 20) {
  const start = page * size
  const content = items.slice(start, start + size)
  return {
    content,
    totalElements: items.length,
    totalPages: Math.ceil(items.length / size),
    number: page,
    size,
    first: page === 0,
    last: start + size >= items.length,
  }
}

// Map execution ID → step executions array (centralised so /steps and /trace stay in sync)
function getStepsForExecution(executionId: string) {
  switch (executionId) {
    case 'exec_001': return DUMMY_STEP_EXECUTIONS_001
    case 'exec_002': return DUMMY_STEP_EXECUTIONS_002
    case 'exec_003': return DUMMY_STEP_EXECUTIONS_003
    case 'exec_004': return DUMMY_STEP_EXECUTIONS_004
    case 'exec_005': return DUMMY_STEP_EXECUTIONS_005
    case 'exec_006': return DUMMY_STEP_EXECUTIONS_006
    case 'exec_009': return DUMMY_STEP_EXECUTIONS_009
    default:         return []
  }
}

export function setupMockHandlers(axiosInstance: AxiosInstance) {
  const mock = new MockAdapter(axiosInstance, { delayResponse: DELAY, onNoMatch: 'throwException' })

  // ── AUTH ─────────────────────────────────────────────────────────────────────
  mock.onPost('/clients/login').reply(() => ok({
    token: 'dummy_jwt_token_eyJhbGciOiJIUzI1NiJ9.demo',
    expiresIn: 86400000,
    user: DUMMY_ME,
    ...DUMMY_ME,
  }))

  // Register is disabled in dummy mode — always return an error
  mock.onPost('/clients/register').reply(400, {
    success: false,
    message: 'Registration is disabled in demo mode. Use admin@acme.com / any password to log in.',
  })

  mock.onPost('/auth/logout').reply(ok(null, 'Logged out'))
  mock.onPost('/auth/refresh').reply(ok({
    token: 'dummy_jwt_token_refreshed',
    expiresIn: 86400000,
    user: DUMMY_ME,
  }))

  // ── CLIENT / ME ────────────────────────────────────────────────────────────
  mock.onGet('/clients/me').reply(ok({ ...DUMMY_CLIENT, ...DUMMY_ME }))
  mock.onPut('/clients/me').reply((config) => ok({ ...DUMMY_CLIENT, ...JSON.parse(config.data || '{}') }))
  mock.onPut('/clients/me/webhook').reply(ok(DUMMY_CLIENT, 'Webhook updated'))
  mock.onGet('/clients/me/env-vars').reply(ok(DUMMY_ENV_VARS))
  mock.onPut('/clients/me/env-vars').reply(ok(null, 'Env var saved'))
  mock.onGet('/clients/me/rate-limits').reply(ok(DUMMY_RATE_LIMITS))
  mock.onPut('/clients/me/rate-limits').reply((config) => ok({ ...DUMMY_RATE_LIMITS, ...JSON.parse(config.data || '{}') }))

  // ── USERS ──────────────────────────────────────────────────────────────────
  mock.onGet('/users').reply(ok(DUMMY_USERS))
  mock.onPost('/users/invite').reply((config) => {
    const body = JSON.parse(config.data || '{}')
    const newUser = { id: `user_${Date.now()}`, name: body.name || body.email, email: body.email, roles: [body.role || 'WORKFLOW_VIEWER'], status: 'ACTIVE', createdAt: new Date().toISOString() }
    return created(newUser, 'User invited')
  })
  mock.onPut(new RegExp('/users/.*/roles')).reply(ok(null, 'Role updated'))
  mock.onDelete(new RegExp('/users/.*')).reply(ok(null, 'User deactivated'))

  // ── ROLES ──────────────────────────────────────────────────────────────────
  mock.onGet('/roles').reply(ok(DUMMY_ROLES))
  mock.onPost('/roles').reply((config) => {
    const body = JSON.parse(config.data || '{}')
    return created({ id: `role_${Date.now()}`, ...body, userCount: 0 }, 'Role created')
  })
  mock.onPut(new RegExp('/roles/.*')).reply((config) => ok(JSON.parse(config.data || '{}')))
  mock.onDelete(new RegExp('/roles/.*')).reply(ok(null, 'Role deleted'))

  // ── API KEYS ───────────────────────────────────────────────────────────────
  mock.onGet('/api-keys').reply(ok(DUMMY_API_KEYS))
  mock.onPost('/api-keys').reply((config) => {
    const body = JSON.parse(config.data || '{}')
    const key = { id: `key_${Date.now()}`, name: body.name, prefix: `ff_live_${Math.random().toString(36).slice(2,6)}`, fullKey: `ff_live_${Math.random().toString(36).slice(2,32)}`, createdAt: new Date().toISOString(), lastUsedAt: null }
    return created(key, 'API key created — copy the full key now, it will not be shown again')
  })
  mock.onDelete(new RegExp('/api-keys/.*')).reply(ok(null, 'API key revoked'))

  // ── WORKFLOWS ──────────────────────────────────────────────────────────────
  mock.onGet('/workflows').reply((config) => {
    const params = config.params || {}
    let workflows = [...DUMMY_WORKFLOWS]
    if (params.status) workflows = workflows.filter(w => w.status === params.status)
    if (params.search) {
      const q = params.search.toLowerCase()
      workflows = workflows.filter(w =>
        w.name.toLowerCase().includes(q) ||
        w.displayName.toLowerCase().includes(q)
      )
    }
    return ok(paginate(workflows, params.page, params.size))
  })

  mock.onPost('/workflows').reply((config) => {
    const body = JSON.parse(config.data || '{}')
    const wf = { id: `wf_${Date.now()}`, version: 1, status: 'DRAFT', steps: [], edges: [], createdAt: new Date().toISOString(), ...body }
    return created(wf, 'Workflow created')
  })

  // GET single workflow — match /workflows/:id
  mock.onGet(new RegExp('^/workflows/[^/]+$')).reply((config) => {
    const id = config.url!.split('/').pop()!
    const wf = DUMMY_WORKFLOWS.find(w => w.id === id || w.name === id)
    return wf ? ok(wf) : notFound('Workflow not found')
  })

  mock.onPut(new RegExp('^/workflows/[^/]+$')).reply((config) => {
    const id = config.url!.split('/').pop()!
    const wf = DUMMY_WORKFLOWS.find(w => w.id === id || w.name === id)
    return wf ? ok({ ...wf, ...JSON.parse(config.data || '{}') }) : notFound()
  })

  mock.onDelete(new RegExp('^/workflows/[^/]+$')).reply(ok(null, 'Workflow deleted'))

  mock.onPost(new RegExp('/workflows/.*/publish')).reply((config) => {
    const id = config.url!.split('/')[2]
    const wf = DUMMY_WORKFLOWS.find(w => w.id === id)
    return wf ? ok({ ...wf, status: 'PUBLISHED', version: wf.version + 1 }) : notFound()
  })

  mock.onPost(new RegExp('/workflows/.*/rollback')).reply((config) => {
    const id = config.url!.split('/')[2]
    const wf = DUMMY_WORKFLOWS.find(w => w.id === id)
    return wf ? ok({ ...wf, status: 'PUBLISHED' }, 'Rolled back successfully') : notFound()
  })

  mock.onPost(new RegExp('/workflows/.*/clone')).reply((config) => {
    const id = config.url!.split('/')[2]
    const wf = DUMMY_WORKFLOWS.find(w => w.id === id)
    return wf ? created({ ...wf, id: `wf_clone_${Date.now()}`, name: `${wf.name}-copy`, status: 'DRAFT', version: 1 }) : notFound()
  })

  mock.onPost(new RegExp('/workflows/.*/validate')).reply(ok({ valid: true, issues: [] }))

  // Version history — /workflows/:name/versions
  mock.onGet(new RegExp('/workflows/.*/versions')).reply((config) => {
    const name = config.url!.split('/')[2]
    const wf = DUMMY_WORKFLOWS.find(w => w.name === name || w.id === name)
    const versions = wf
      ? (DUMMY_WORKFLOW_VERSIONS[wf.id] || [{
          version:     wf.version,
          status:      wf.status,
          createdBy:   'admin@acme.com',
          createdAt:   wf.publishedAt || new Date().toISOString(),
          publishedAt: wf.publishedAt || null,
          changeNote:  'Initial version',
        }])
      : []
    return ok(versions)
  })

  // ── TRIGGER WORKFLOW (Execution Engine) ────────────────────────────────────
  mock.onPost(new RegExp('/workflows/.*/trigger')).reply((config) => {
    const wfName = config.url!.split('/')[2]                          // URL: /workflows/:name/trigger
    const wf = DUMMY_WORKFLOWS.find(w => w.name === wfName || w.id === wfName)
    const execId = `exec_${Date.now()}`
    const execution = {
      id: execId,
      executionId: execId,                                            // surface both shapes
      workflowName: wf?.name || wfName,
      workflowVersion: wf?.version || 1,
      status: 'RUNNING',
      triggerType: 'API',
      triggeredBy: 'admin@acme.com',
      startedAt: new Date().toISOString(),
      completedAt: null,
      durationMs: 0,
    }
    return created(execution, 'Execution started')
  })

  // ── EXECUTIONS ─────────────────────────────────────────────────────────────
  mock.onGet('/executions').reply((config) => {
    const params = config.params || {}
    let execs = [...DUMMY_EXECUTIONS]
    if (params.status) execs = execs.filter(e => e.status === params.status)
    if (params.workflowName) execs = execs.filter(e => e.workflowName === params.workflowName)
    return ok(paginate(execs, params.page, params.size))
  })

  // GET execution detail — /executions/:id
  mock.onGet(new RegExp('^/executions/[^/]+$')).reply((config) => {
    const id = config.url!.split('/').pop()!
    const exec = DUMMY_EXECUTIONS.find(e => e.id === id)
    return exec ? ok(exec) : notFound()
  })

  // POST AI analysis — /executions/:id/analyze
  mock.onPost(new RegExp('/executions/.*/analyze')).reply((config) => {
    const id = config.url!.split('/')[2]
    const exec = DUMMY_EXECUTIONS.find(e => e.id === id)
    if (!exec) return notFound()
    if (exec.status !== 'FAILED') {
      return [400, { success: false, message: 'AI analysis is only available for FAILED executions. Current status: ' + exec.status }]
    }
    // Return realistic analysis based on which workflow failed
    const analyses: Record<string, object> = {
      'exec_003': {
        summary: 'The user-onboarding workflow failed during the "sendWelcomeEmail" NOTIFY step. The workflow successfully created the account (ACC-9001) and generated a personalised welcome message via AI, but could not deliver the email due to an SMTP connection timeout.',
        rootCause: 'The NOTIFY step "sendWelcomeEmail" exhausted all 3 retry attempts with SMTP connection timeouts to mail.acme.com:587. This indicates the mail server is unreachable — likely a network connectivity issue, firewall rule blocking port 587, or the SMTP service being temporarily down.',
        suggestions: [
          'Check that mail.acme.com:587 is reachable from the FlowForge execution engine network. Run: telnet mail.acme.com 587 or nc -zv mail.acme.com 587.',
          'Increase the NOTIFY step timeout from the default and add more retries with exponential backoff (e.g. 5 retries, starting at 5 seconds).',
          'Consider adding a fallback branch: if NOTIFY fails → route to a secondary channel (Slack or webhook) so the user still receives an onboarding message.',
          'Review the mail server logs at mail.acme.com for connection refused or TLS errors around the execution time.',
        ],
      },
    }
    const analysis = analyses[id] || {
      summary: `The ${exec.workflowName} workflow failed after ${exec.durationMs}ms. One or more steps encountered errors that exhausted their retry policies.`,
      rootCause: 'A step in the workflow returned an error response or timed out. Review the failed step\'s error message in the step detail panel for the specific cause.',
      suggestions: [
        'Open the failed step in the execution timeline to view the full error message and stack trace.',
        'Check that all external services (APIs, databases, queues) referenced by this workflow are operational.',
        'Add retry policies with exponential backoff to transient steps like HTTP calls and notifications.',
      ],
    }
    return ok(analysis)
  })

  // GET execution steps — /executions/:id/steps  (used by useExecutionMonitor)
  mock.onGet(new RegExp('/executions/.*/steps$')).reply((config) => {
    const id = config.url!.split('/')[2]
    return ok(getStepsForExecution(id))
  })

  // GET execution trace — /executions/:id/trace
  mock.onGet(new RegExp('/executions/.*/trace')).reply((config) => {
    const id = config.url!.split('/')[2]
    const exec = DUMMY_EXECUTIONS.find(e => e.id === id)
    if (!exec) return notFound()

    const steps = getStepsForExecution(id)

    const wf = DUMMY_WORKFLOWS.find(w => w.name === exec.workflowName)

    const stats = {
      totalSteps: steps.length,
      successSteps: steps.filter((s: any) => s.status === 'SUCCESS').length,
      failedSteps: steps.filter((s: any) => s.status === 'FAILED').length,
      skippedSteps: steps.filter((s: any) => s.status === 'SKIPPED').length,
      pendingSteps: steps.filter((s: any) => s.status === 'PENDING').length,
      waitingSteps: steps.filter((s: any) => s.status === 'WAITING').length,
      totalDurationMs: steps.reduce((sum: number, s: any) => sum + (s.durationMs || 0), 0),
      totalHttpCalls: steps.filter((s: any) => s.httpCallLog).length,
      failedHttpCalls: steps.filter((s: any) => s.httpCallLog && !s.httpCallLog.success).length,
    }

    return ok({
      execution: exec,
      stepExecutions: steps,
      workflowDefinition: wf ? { steps: wf.steps, edges: wf.edges } : null,
      executionContext: { input: { orderId: 'ORD-999', customerId: 'CUST-42' }, variables: { region: 'IN', discount: 20 } },
      stats,
    })
  })

  mock.onPost(new RegExp('/executions/.*/pause')).reply((config) => {
    const id = config.url!.split('/')[2]
    const exec = DUMMY_EXECUTIONS.find(e => e.id === id)
    return exec ? ok({ ...exec, status: 'PAUSED' }) : notFound()
  })

  mock.onPost(new RegExp('/executions/.*/resume')).reply((config) => {
    const id = config.url!.split('/')[2]
    const exec = DUMMY_EXECUTIONS.find(e => e.id === id)
    return exec ? ok({ ...exec, status: 'RUNNING' }) : notFound()
  })

  mock.onPost(new RegExp('/executions/.*/retry')).reply((config) => {
    const id = config.url!.split('/')[2]
    const exec = DUMMY_EXECUTIONS.find(e => e.id === id)
    return exec ? created({ ...exec, id: `exec_retry_${Date.now()}`, status: 'RUNNING' }) : notFound()
  })

  mock.onPost(new RegExp('/executions/.*/cancel')).reply((config) => {
    const id = config.url!.split('/')[2]
    const exec = DUMMY_EXECUTIONS.find(e => e.id === id)
    return exec ? ok({ ...exec, status: 'CANCELLED' }) : notFound()
  })

  // Wait tokens
  mock.onGet(new RegExp('/executions/.*/wait-tokens')).reply((config) => {
    const id = config.url!.split('/')[2]
    const tokens = DUMMY_WAIT_TOKENS.filter(t => t.executionId === id)
    return ok(tokens)
  })

  mock.onPost(new RegExp('/executions/.*/steps/.*/resume')).reply(ok({ ...DUMMY_WAIT_TOKENS[0], status: 'RESUMED', resumedAt: new Date().toISOString(), resumedBy: 'MANUAL_API' }))
  mock.onPost(new RegExp('/executions/resume-by-token/.*')).reply(ok({ ...DUMMY_WAIT_TOKENS[0], status: 'RESUMED', resumedAt: new Date().toISOString() }))

  // ── DLQ ────────────────────────────────────────────────────────────────────
  mock.onGet('/dlq').reply((config) => {
    const params = config.params || {}
    let dlq = [...DUMMY_DLQ]
    if (params.status) dlq = dlq.filter(d => d.status === params.status)
    return ok(paginate(dlq, params.page, params.size))
  })

  mock.onGet(new RegExp('^/dlq/[^/]+$')).reply((config) => {
    const id = config.url!.split('/').pop()!
    const msg = DUMMY_DLQ.find(d => d.id === id)
    return msg ? ok(msg) : notFound()
  })

  mock.onPost(new RegExp('/dlq/.*/replay')).reply((config) => {
    const id = config.url!.split('/')[2]
    const msg = DUMMY_DLQ.find(d => d.id === id)
    if (!msg) return notFound()
    const body = config.data ? JSON.parse(config.data) : {}
    const contextWasModified = !!body.executionContext
    const updated = {
      ...msg,
      status: 'REPLAYING',
      retryCount: (msg as any).retryCount + 1,
      updatedAt: new Date().toISOString(),
      replayHistory: [
        ...((msg as any).replayHistory ?? []),
        {
          replayedBy: 'demo-user',
          result: 'SUCCESS',
          replayedAt: new Date().toISOString(),
          contextWasModified,
        },
      ],
    }
    return ok(updated)
  })
  mock.onPost('/dlq/replay-batch').reply(() => {
    const pending = DUMMY_DLQ.filter(d => d.status === 'PENDING')
    const messages = pending.map(m => ({
      ...m, status: 'REPLAYING',
      replayHistory: [...((m as any).replayHistory ?? []), { replayedBy: 'batch', result: 'SUCCESS', replayedAt: new Date().toISOString(), contextWasModified: false }],
    }))
    return ok({ total: pending.length, succeeded: pending.length, failed: 0, messages })
  })
  mock.onDelete(new RegExp('/dlq/.*')).reply((config) => {
    const id = config.url!.split('/').pop()!
    const msg = DUMMY_DLQ.find(d => d.id === id)
    if (!msg) return notFound()
    return ok({ ...msg, status: 'DISCARDED', updatedAt: new Date().toISOString() })
  })

  // ── TRIGGERS ───────────────────────────────────────────────────────────────
  mock.onGet('/triggers').reply((config) => {
    const params = config.params || {}
    return ok(paginate(DUMMY_TRIGGERS, params.page, params.size))
  })
  mock.onPost('/triggers').reply((config) => {
    const body = JSON.parse(config.data || '{}')
    const triggerId = `trig_${Date.now()}`
    const response: Record<string, unknown> = { id: triggerId, ...body, createdAt: new Date().toISOString() }
    return created(response)
  })
  mock.onPut(new RegExp('/triggers/.*/enable')).reply(ok(null, 'Trigger enabled'))
  mock.onPut(new RegExp('/triggers/.*/disable')).reply(ok(null, 'Trigger disabled'))
  mock.onPost(new RegExp('/triggers/.*/enable')).reply(ok(null, 'Trigger enabled'))
  mock.onPost(new RegExp('/triggers/.*/disable')).reply(ok(null, 'Trigger disabled'))
  mock.onPut(new RegExp('^/triggers/[^/]+$')).reply((config) => ok(JSON.parse(config.data || '{}')))
  mock.onDelete(new RegExp('/triggers/.*')).reply(ok(null, 'Trigger deleted'))
  mock.onGet(new RegExp('/triggers/.*/logs')).reply(ok([
    { activatedAt: new Date(Date.now() - 60000).toISOString(), result: 'TRIGGERED', executionId: 'exec_001' },
    { activatedAt: new Date(Date.now() - 120000).toISOString(), result: 'FILTERED_OUT', reason: 'condition not met' },
    { activatedAt: new Date(Date.now() - 180000).toISOString(), result: 'TRIGGERED', executionId: 'exec_006' },
  ]))

  // ── WEBHOOKS ───────────────────────────────────────────────────────────────
  mock.onGet('/webhooks/deliveries').reply(ok(paginate(DUMMY_WEBHOOK_DELIVERIES)))
  mock.onGet(new RegExp('/webhooks/deliveries/[^/]+$')).reply((config) => {
    const id = config.url!.split('/').pop()!
    const wh = DUMMY_WEBHOOK_DELIVERIES.find(w => w.id === id)
    return wh ? ok(wh) : notFound()
  })
  mock.onPost(new RegExp('/webhooks/deliveries/.*/retry')).reply(ok(null, 'Retry queued'))
  mock.onGet('/webhooks/stats').reply(ok({
    sent: 1240, delivered: 1231, failed: 9,
    deliveryRate: 99.3, avgLatencyMs: 210,
  }))

  // ── AUDIT LOGS ─────────────────────────────────────────────────────────────
  mock.onGet('/audit-logs').reply((config) => {
    const params = config.params || {}
    let logs = [...DUMMY_AUDIT_LOGS]
    if (params.actor) logs = logs.filter(l => l.actor.toLowerCase().includes(params.actor.toLowerCase()))
    if (params.action) logs = logs.filter(l => l.action === params.action)
    return ok(paginate(logs, params.page, params.size))
  })

  // ── ANALYTICS ──────────────────────────────────────────────────────────────
  mock.onGet('/analytics/summary').reply(ok(DUMMY_ANALYTICS_SUMMARY))
  mock.onGet('/analytics/execution-trend').reply(ok(DUMMY_EXECUTION_TREND))
}
