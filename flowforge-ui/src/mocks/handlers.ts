import MockAdapter from 'axios-mock-adapter'
import type { AxiosInstance } from 'axios'
import {
  DUMMY_ME, DUMMY_CLIENT, DUMMY_USERS, DUMMY_ROLES,
  DUMMY_WORKFLOWS, DUMMY_EXECUTIONS,
  DUMMY_STEP_EXECUTIONS_001, DUMMY_STEP_EXECUTIONS_003, DUMMY_STEP_EXECUTIONS_009,
  DUMMY_STEP_EXECUTIONS_002, DUMMY_STEP_EXECUTIONS_004,
  DUMMY_STEP_EXECUTIONS_005, DUMMY_STEP_EXECUTIONS_006,
  DUMMY_WAIT_TOKENS, DUMMY_FAILED_WORKFLOWS, DUMMY_TRIGGERS,
  DUMMY_WEBHOOK_DELIVERIES, DUMMY_API_KEYS, DUMMY_AUDIT_LOGS,
  DUMMY_RATE_LIMITS, DUMMY_ANALYTICS_SUMMARY, DUMMY_EXECUTION_TREND,
  DUMMY_ENV_VARS, DUMMY_WORKFLOW_VERSIONS, DUMMY_MODEL_RECORDS,
  DUMMY_SUBSCRIPTION, DUMMY_PLAN_USAGE, DUMMY_PAYMENT_EVENTS, DUMMY_INVOICES,
  DUMMY_INVITATIONS, DUMMY_NAMESPACES,
  DUMMY_AI_CHAT_SAMPLES, DUMMY_OPTIMIZATION_SUGGESTIONS, DUMMY_WORKFLOW_DOCS,
} from './data'
import { PLAN_LIMITS } from '../config/planLimits'

// Wraps data in backend's ApiResponse envelope
const ok = (data: unknown, message = 'OK') => [200, { success: true, data, message }]
const created = (data: unknown, message = 'Created') => [201, { success: true, data, message }]
const notFound = (msg = 'Not found') => [404, { success: false, message: msg }]

// Simulated network delay (ms)
const DELAY = 300

// Extract the requesting namespace from the X-Namespace header (defaults to 'default')
function getRequestNamespace(config: { headers?: Record<string, unknown> | unknown }): string {
  const headers = (config.headers || {}) as Record<string, unknown>
  const ns = headers['X-Namespace'] ?? headers['x-namespace']
  return typeof ns === 'string' && ns.length > 0 ? ns : 'default'
}

// Filter an array to only items whose namespace matches (items with no namespace default to 'default')
function filterByNamespace<T extends { namespace?: string }>(items: T[], ns: string): T[] {
  return items.filter(item => (item.namespace ?? 'default') === ns)
}

// Check whether a namespace name exists in DUMMY_NAMESPACES
function isValidNamespace(ns: string): boolean {
  return DUMMY_NAMESPACES.some(n => n.name === ns)
}

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
    const ns = getRequestNamespace(config)
    let workflows = filterByNamespace([...DUMMY_WORKFLOWS], ns)
    if (params.status) workflows = workflows.filter(w => w.status === params.status)
    if (params.q) {
      const q = params.q.toLowerCase()
      workflows = workflows.filter(w =>
        w.name.toLowerCase().includes(q) ||
        w.displayName.toLowerCase().includes(q) ||
        (w.description || '').toLowerCase().includes(q)
      )
    }
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
    const ns = getRequestNamespace(config)
    let execs = filterByNamespace([...DUMMY_EXECUTIONS], ns)
    if (params.status) execs = execs.filter(e => e.status === params.status)
    if (params.workflowName) execs = execs.filter(e => e.workflowName === params.workflowName)
    if (params.q) {
      const q = params.q.toLowerCase()
      execs = execs.filter(e =>
        e.workflowName.toLowerCase().includes(q) ||
        e.id.toLowerCase().includes(q)
      )
    }
    if (params.modelRecordId) {
      execs = execs.filter((e: any) => e.modelRecordId === params.modelRecordId)
    }
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

  // ── FAILED WORKFLOWS ───────────────────────────────────────────────────────
  mock.onGet('/failed-workflows').reply((config) => {
    const params = config.params || {}
    const ns = getRequestNamespace(config)
    let items = filterByNamespace([...DUMMY_FAILED_WORKFLOWS], ns)
    if (params.status) items = items.filter(d => d.status === params.status)
    return ok(paginate(items, params.page, params.size))
  })

  mock.onGet(new RegExp('^/failed-workflows/[^/]+$')).reply((config) => {
    const id = config.url!.split('/').pop()!
    const msg = DUMMY_FAILED_WORKFLOWS.find(d => d.id === id)
    return msg ? ok(msg) : notFound()
  })

  mock.onPost(new RegExp('/failed-workflows/.*/replay')).reply((config) => {
    const id = config.url!.split('/')[2]
    const msg = DUMMY_FAILED_WORKFLOWS.find(d => d.id === id)
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
  mock.onPost('/failed-workflows/replay-batch').reply(() => {
    const pending = DUMMY_FAILED_WORKFLOWS.filter(d => d.status === 'PENDING')
    const messages = pending.map(m => ({
      ...m, status: 'REPLAYING',
      replayHistory: [...((m as any).replayHistory ?? []), { replayedBy: 'batch', result: 'SUCCESS', replayedAt: new Date().toISOString(), contextWasModified: false }],
    }))
    return ok({ total: pending.length, succeeded: pending.length, failed: 0, messages })
  })
  mock.onDelete(new RegExp('/failed-workflows/.*')).reply((config) => {
    const id = config.url!.split('/').pop()!
    const msg = DUMMY_FAILED_WORKFLOWS.find(d => d.id === id)
    if (!msg) return notFound()
    return ok({ ...msg, status: 'DISCARDED', updatedAt: new Date().toISOString() })
  })

  // ── TRIGGERS ───────────────────────────────────────────────────────────────
  const triggers: any[] = [...DUMMY_TRIGGERS]
  mock.onGet('/triggers').reply((config) => {
    const params = config.params || {}
    const ns = getRequestNamespace(config)
    const filtered = filterByNamespace(triggers, ns)
    return ok(paginate(filtered, params.page, params.size))
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
  mock.onGet('/webhooks/deliveries').reply((config) => {
    const ns = getRequestNamespace(config)
    const filtered = filterByNamespace([...DUMMY_WEBHOOK_DELIVERIES], ns)
    return ok(paginate(filtered))
  })
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

  // ── MODEL RECORDS ────────────────────────────────────────────────────────
  let modelRecords = [...DUMMY_MODEL_RECORDS]

  mock.onGet('/model-records').reply((config) => {
    const { dataModelId } = config.params || {}
    const ns = getRequestNamespace(config)
    let filtered = filterByNamespace(modelRecords, ns)
    if (dataModelId) filtered = filtered.filter((r: any) => r.dataModelId === dataModelId)
    return ok(filtered)
  })

  mock.onGet(new RegExp('/model-records/[^/]+')).reply((config) => {
    const id = config.url?.split('/').pop()
    const record = modelRecords.find((r: any) => r.id === id)
    return record ? ok(record) : notFound('Model record not found')
  })

  mock.onPost('/model-records').reply((config) => {
    const body = JSON.parse(config.data || '{}')
    const ns = getRequestNamespace(config)
    const record = {
      id: `mr-${Date.now()}`,
      namespace: ns,
      clientId: 'client-1',
      dataModelId: body.dataModelId,
      name: body.name,
      data: body.data || {},
      createdBy: 'admin',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    modelRecords.push(record)
    return created(record)
  })

  mock.onPut(new RegExp('/model-records/[^/]+/data')).reply((config) => {
    const parts = config.url?.split('/') || []
    const id = parts[parts.length - 2]
    const data = JSON.parse(config.data || '{}')
    const idx = modelRecords.findIndex((r: any) => r.id === id)
    if (idx < 0) return notFound('Model record not found')
    modelRecords[idx] = { ...modelRecords[idx], data, updatedAt: new Date().toISOString() }
    return ok(modelRecords[idx])
  })

  mock.onPut(new RegExp('/model-records/[^/]+')).reply((config) => {
    const id = config.url?.split('/').pop()
    const body = JSON.parse(config.data || '{}')
    const idx = modelRecords.findIndex((r: any) => r.id === id)
    if (idx < 0) return notFound('Model record not found')
    modelRecords[idx] = {
      ...modelRecords[idx],
      name: body.name,
      data: body.data || {},
      updatedAt: new Date().toISOString(),
    }
    return ok(modelRecords[idx])
  })

  mock.onDelete(new RegExp('/model-records/[^/]+')).reply((config) => {
    const id = config.url?.split('/').pop()
    modelRecords = modelRecords.filter((r: any) => r.id !== id)
    return ok(null)
  })

  // ── DATA MODELS (minimal list for namespace filtering) ─────────────────────
  // Kept inline to avoid a circular import between axios.ts ↔ handlers.ts ↔ api/models.ts.
  const dataModels: any[] = [
    { id: 'model-1', namespace: 'default', clientId: 'client-1', name: 'OrderRequest', description: 'Schema for incoming order placement requests', schemaJson: '{}', fieldNames: ['orderId','customerId','amount','currency','items'], tags: 'orders,payments', active: true, createdBy: 'admin', createdAt: '2026-01-10T09:00:00', updatedAt: '2026-02-15T14:30:00' },
    { id: 'model-2', namespace: 'default', clientId: 'client-1', name: 'UserRegistration', description: 'Schema for new user sign-up payloads', schemaJson: '{}', fieldNames: ['email','name','phone','role'], tags: 'users,auth', active: true, createdBy: 'admin', createdAt: '2026-01-20T11:00:00', updatedAt: '2026-02-20T10:00:00' },
    { id: 'model-3', namespace: 'apply', clientId: 'client-1', name: 'WebhookEvent', description: 'Generic webhook event envelope', schemaJson: '{}', fieldNames: ['event','timestamp','source','payload'], tags: 'webhooks,events', active: true, createdBy: 'system', createdAt: '2026-02-01T08:00:00', updatedAt: '2026-02-01T08:00:00' },
  ]

  mock.onGet('/models').reply((config) => {
    const ns = getRequestNamespace(config)
    return ok(filterByNamespace(dataModels, ns))
  })

  mock.onGet(new RegExp('^/models/[^/]+$')).reply((config) => {
    const id = config.url!.split('/').pop()!
    const m = dataModels.find(d => d.id === id)
    return m ? ok(m) : notFound('Model not found')
  })

  // ── PATCH namespace endpoints ──────────────────────────────────────────────
  const patchNamespace = (list: any[], id: string, body: string | undefined) => {
    const parsed = JSON.parse(body || '{}')
    const targetNs = parsed.namespace
    if (!targetNs || !isValidNamespace(targetNs)) {
      return [400, { success: false, message: `Invalid namespace: ${targetNs}` }]
    }
    const idx = list.findIndex((item: any) => item.id === id)
    if (idx < 0) return notFound()
    list[idx] = { ...list[idx], namespace: targetNs }
    return ok(list[idx])
  }

  mock.onPatch(new RegExp('^/workflows/[^/]+/namespace$')).reply((config) => {
    const id = config.url!.split('/')[2]
    return patchNamespace(DUMMY_WORKFLOWS as any[], id, config.data)
  })

  mock.onPatch(new RegExp('^/models/[^/]+/namespace$')).reply((config) => {
    const id = config.url!.split('/')[2]
    return patchNamespace(dataModels, id, config.data)
  })

  mock.onPatch(new RegExp('^/model-records/[^/]+/namespace$')).reply((config) => {
    const id = config.url!.split('/')[2]
    return patchNamespace(modelRecords, id, config.data)
  })

  mock.onPatch(new RegExp('^/triggers/[^/]+/namespace$')).reply((config) => {
    const id = config.url!.split('/')[2]
    return patchNamespace(triggers, id, config.data)
  })

  // ── BILLING ─────────────────────────────────────────────────────────────────
  mock.onGet(/\/billing\/subscription$/).reply(200, { success: true, data: DUMMY_SUBSCRIPTION })
  mock.onGet(/\/billing\/usage$/).reply(200, { success: true, data: DUMMY_PLAN_USAGE })
  mock.onPost(/\/billing\/checkout$/).reply(200, { success: true, data: { url: 'https://checkout.stripe.com/mock-session' } })
  mock.onPost(/\/billing\/change-plan$/).reply(200, { success: true, data: DUMMY_SUBSCRIPTION })
  mock.onPost(/\/billing\/cancel$/).reply(200, { success: true, data: null, message: 'Subscription cancelled' })
  mock.onGet(/\/billing\/payments$/).reply(200, { success: true, data: DUMMY_PAYMENT_EVENTS })
  mock.onGet(/\/billing\/invoices$/).reply(200, { success: true, data: DUMMY_INVOICES })

  // ── INVITATIONS ──────────────────────────────────────────────────────────
  mock.onGet(/\/auth\/invite\/[a-zA-Z0-9-]+$/).reply(200, {
    success: true,
    data: {
      token: 'abc123-def456-ghi789',
      email: 'newuser@acme.com',
      name: 'New User',
      orgName: 'Acme Corp',
      status: 'PENDING',
      expiresAt: new Date(Date.now() + 48 * 3600000).toISOString(),
      createdAt: new Date(Date.now() - 24 * 3600000).toISOString(),
    }
  })

  mock.onPost(/\/auth\/accept-invite$/).reply(200, {
    success: true,
    data: {
      user: DUMMY_ME,
      token: 'mock_jwt_token_accepted',
      expiresIn: 86400,
    }
  })

  mock.onGet(/\/users\/invitations$/).reply(200, {
    success: true,
    data: DUMMY_INVITATIONS
  })

  mock.onPost(/\/users\/invitations\/[a-zA-Z0-9_]+\/resend$/).reply(200, {
    success: true,
    data: null,
    message: 'Invitation resent'
  })

  mock.onDelete(/\/users\/invitations\/[a-zA-Z0-9_]+$/).reply(200, {
    success: true,
    data: null,
    message: 'Invitation revoked'
  })

  // ── NAMESPACES ──────────────────────────────────────────────────────────
  mock.onGet(/\/namespaces$/).reply(200, { success: true, data: DUMMY_NAMESPACES })

  mock.onPost(/\/namespaces$/).reply((config) => {
    const body = JSON.parse(config.data)
    const newNs = {
      id: 'ns_' + Date.now(),
      name: body.name,
      displayName: body.displayName,
      description: body.description || '',
      createdBy: 'user_001',
      createdAt: new Date().toISOString(),
    }
    return [200, { success: true, data: newNs }]
  })

  mock.onDelete(/\/namespaces\/[a-z0-9-]+$/).reply(200, { success: true, data: null, message: 'Namespace deleted' })

  mock.onGet(/\/users\/[a-zA-Z0-9_]+\/namespaces$/).reply(200, { success: true, data: ['default', 'production'] })
  mock.onPut(/\/users\/[a-zA-Z0-9_]+\/namespaces$/).reply(200, { success: true, data: null, message: 'Namespaces assigned' })

  // ── AI CHAT ───────────────────────────────────────────────────────────────
  // module-level counter for this mock session — simulates per-day usage
  let aiChatUsedToday = 0
  const aiChatLimit = PLAN_LIMITS.FREE.maxAiChatMessagesPerDay

  mock.onPost('/ai/chat').reply((config) => {
    const body = JSON.parse(config.data || '{}')
    const message = (body.message || '').toLowerCase()

    if (aiChatUsedToday >= aiChatLimit) {
      return [403, { success: false, code: 'PLAN_LIMIT_EXCEEDED', message: `Daily AI chat limit reached (${aiChatUsedToday}/${aiChatLimit}). Upgrade to continue.` }]
    }

    const match = DUMMY_AI_CHAT_SAMPLES.find((s) => s.match.some((kw) => message.includes(kw)))
    const fallback = {
      answer: `I understand you're asking about "${body.message}". I don't have a pre-canned answer for that in demo mode, but in production I'd analyze your execution history and respond with specific insights. Try asking about failures, slow workflows, or a specific workflow name.`,
      citations: [],
    }
    const chosen = match ?? fallback
    aiChatUsedToday += 1
    return ok({
      answer: chosen.answer,
      citations: chosen.citations,
      usedToday: aiChatUsedToday,
      limitPerDay: aiChatLimit,
    })
  })

  // ── WORKFLOW OPTIMIZATION ────────────────────────────────────────────────
  mock.onPost(new RegExp('^/workflows/[^/]+/optimize$')).reply((config) => {
    const id = config.url!.split('/')[2]
    return ok({
      workflowId: id,
      sampleSize: 50,
      analyzedAt: new Date().toISOString(),
      summary: 'Analyzed the last 50 executions. Found 3 opportunities to improve reliability, latency, and cost. The most impactful suggestion is adding retries to the check-inventory step.',
      suggestions: DUMMY_OPTIMIZATION_SUGGESTIONS,
    })
  })

  // ── WORKFLOW DOCS ────────────────────────────────────────────────────────
  // mutable copy so PUT / generate updates persist during the session
  const workflowDocs: Record<string, any> = { ...DUMMY_WORKFLOW_DOCS }

  mock.onGet(new RegExp('^/workflows/[^/]+/docs$')).reply((config) => {
    const id = config.url!.split('/')[2]
    const wf = DUMMY_WORKFLOWS.find(w => w.id === id || w.name === id)
    const key = wf?.id ?? id
    const doc = workflowDocs[key]
    return doc ? ok(doc) : notFound('No documentation found')
  })

  mock.onPost(new RegExp('^/workflows/[^/]+/docs/generate$')).reply((config) => {
    const id = config.url!.split('/')[2]
    const wf = DUMMY_WORKFLOWS.find(w => w.id === id || w.name === id) as any
    const key = wf?.id ?? id
    const displayName = wf?.displayName ?? 'Workflow'
    const stepsMd = (wf?.steps ?? []).map((s: any, i: number) =>
      `### ${i + 1}. ${s.name} (${s.type})\n\nStep \`${s.stepId}\` of type **${s.type}**.${s.config?.url ? ` Calls \`${s.config.url}\`.` : ''}${s.config?.channel ? ` Notifies via ${s.config.channel}.` : ''}`
    ).join('\n\n')
    const triggerLine = `- **Type:** ${wf?.triggerType ?? 'UNKNOWN'}`
    const topicLine = wf?.kafkaTopic ? `\n- **Topic:** \`${wf.kafkaTopic}\`` : ''
    const cronLine = wf?.cronExpression ? `\n- **Cron:** \`${wf.cronExpression}\`` : ''
    const doc = {
      workflowId: key,
      workflowVersion: wf?.version ?? 1,
      markdown: `# ${displayName}\n\nThis workflow was auto-documented on ${new Date().toLocaleString()}.\n\n## Trigger\n\n${triggerLine}${topicLine}${cronLine}\n\n## Steps\n\n${stepsMd || '_No steps defined yet._'}\n\n## Error Handling\n\nEach step follows the default retry policy unless overridden. See the workflow definition for specific configurations.\n`,
      generatedAt: new Date().toISOString(),
    }
    workflowDocs[key] = doc
    return ok(doc)
  })

  mock.onPut(new RegExp('^/workflows/[^/]+/docs$')).reply((config) => {
    const id = config.url!.split('/')[2]
    const wf = DUMMY_WORKFLOWS.find(w => w.id === id || w.name === id)
    const key = wf?.id ?? id
    const body = JSON.parse(config.data || '{}')
    const existing = workflowDocs[key] || { workflowId: key, workflowVersion: wf?.version ?? 1, generatedAt: new Date().toISOString() }
    const updated = {
      ...existing,
      markdown: body.markdown,
      editedBy: 'admin@acme.com',
      editedAt: new Date().toISOString(),
    }
    workflowDocs[key] = updated
    return ok(updated)
  })
}
