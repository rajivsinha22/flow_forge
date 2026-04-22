import type { SubscriptionStatus, PlanUsage, PaymentEvent, Invoice, Namespace } from '../types'
import type { PendingInvitation } from '../api/invitation'

// ─── DUMMY CLIENT / ORG ───────────────────────────────────────────────────────
export const DUMMY_CLIENT = {
  id: 'client_acme_001',
  orgName: 'Acme Corp',
  plan: 'ENTERPRISE',
  webhookUrl: 'https://hooks.acme.com/flowforge',
  webhookSecret: 'whsec_demo_key_xxx',
  createdAt: '2024-01-15T09:00:00Z',
}

// ─── DUMMY USERS ──────────────────────────────────────────────────────────────
export const DUMMY_USERS = [
  { id: 'user_001', name: 'Ravi Sharma',  email: 'admin@acme.com',   roles: ['CLIENT_ADMIN'],      status: 'ACTIVE', createdAt: '2024-01-15T09:00:00Z' },
  { id: 'user_002', name: 'Priya Mehta',  email: 'priya@acme.com',   roles: ['WORKFLOW_MANAGER'],  status: 'ACTIVE', createdAt: '2024-02-01T10:00:00Z' },
  { id: 'user_003', name: 'Arjun Das',    email: 'arjun@acme.com',   roles: ['WORKFLOW_VIEWER'],   status: 'ACTIVE', createdAt: '2024-02-15T11:00:00Z' },
  { id: 'user_004', name: 'CI/CD Bot',    email: 'ci@acme.com',      roles: ['TRIGGER_ONLY'],      status: 'ACTIVE', createdAt: '2024-03-01T08:00:00Z' },
  { id: 'user_005', name: 'Sneha Kapoor', email: 'sneha@acme.com',   roles: ['WORKFLOW_MANAGER'],  status: 'ACTIVE', createdAt: '2024-03-10T09:00:00Z' },
]

export const DUMMY_ME = {
  id: 'user_001',
  name: 'Ravi Sharma',
  email: 'admin@acme.com',
  roles: ['CLIENT_ADMIN'],
  clientId: 'client_acme_001',
  orgName: 'Acme Corp',
}

// ─── DUMMY ROLES ──────────────────────────────────────────────────────────────
export const DUMMY_ROLES = [
  {
    id: 'role_001', name: 'CLIENT_ADMIN', description: 'Full platform access',
    permissions: ['workflow:*', 'execution:*', 'failed-workflows:*', 'team:*', 'settings:*', 'audit:view'],
    userCount: 1,
  },
  {
    id: 'role_002', name: 'WORKFLOW_MANAGER', description: 'Manage workflows and executions',
    permissions: ['workflow:create', 'workflow:edit', 'workflow:publish', 'workflow:delete',
                  'execution:trigger', 'execution:view', 'execution:pause', 'execution:retry',
                  'failed-workflows:view', 'failed-workflows:replay'],
    userCount: 2,
  },
  {
    id: 'role_003', name: 'WORKFLOW_VIEWER', description: 'Read-only access',
    permissions: ['workflow:view', 'execution:view'],
    userCount: 1,
  },
  {
    id: 'role_004', name: 'TRIGGER_ONLY', description: 'Can only trigger executions',
    permissions: ['execution:trigger'],
    userCount: 1,
  },
]

// ─── DUMMY WORKFLOWS ──────────────────────────────────────────────────────────
export const DUMMY_WORKFLOWS = [
  {
    id: 'wf_001', name: 'order-processing', displayName: 'Order Processing',
    namespace: 'default',
    triggerType: 'API', version: 3, status: 'PUBLISHED',
    publishedAt: '2025-03-01T10:00:00Z',
    lastRunAt: '2026-03-18T10:00:00Z', lastRunStatus: 'SUCCESS',
    steps: [
      { stepId: 'step_1', name: 'fetchCustomer',     type: 'HTTP',      config: { method: 'GET',  url: 'https://api.acme.com/customers/${input.customerId}' }, positionX: 100, positionY: 50 },
      { stepId: 'step_2', name: 'checkTier',         type: 'CONDITION', config: { expression: "${steps.fetchCustomer.output.tier} == 'GOLD'" }, positionX: 100, positionY: 180 },
      { stepId: 'step_3', name: 'applyGoldDiscount', type: 'HTTP',      config: { method: 'POST', url: 'https://api.acme.com/discounts/apply' }, positionX: 0,   positionY: 310 },
      { stepId: 'step_4', name: 'applyStdDiscount',  type: 'HTTP',      config: { method: 'POST', url: 'https://api.acme.com/discounts/standard' }, positionX: 200, positionY: 310 },
      { stepId: 'step_5', name: 'runPayment',        type: 'SUB_WORKFLOW', config: { workflowName: 'payment-flow' }, positionX: 100, positionY: 440 },
      { stepId: 'step_6', name: 'sendInvoice',       type: 'NOTIFY',    config: { channel: 'EMAIL', template: 'invoice' }, positionX: 100, positionY: 570 },
    ],
    edges: [
      { id: 'e1', source: 'step_1', target: 'step_2', label: 'SUCCESS' },
      { id: 'e2', source: 'step_2', target: 'step_3', label: 'SUCCESS' },
      { id: 'e3', source: 'step_2', target: 'step_4', label: 'FAILURE' },
      { id: 'e4', source: 'step_3', target: 'step_5', label: 'SUCCESS' },
      { id: 'e5', source: 'step_4', target: 'step_5', label: 'SUCCESS' },
      { id: 'e6', source: 'step_5', target: 'step_6', label: 'SUCCESS' },
    ],
  },
  {
    id: 'wf_002', name: 'payment-flow', displayName: 'Payment Processing',
    namespace: 'default',
    triggerType: 'KAFKA', version: 2, status: 'PUBLISHED',
    publishedAt: '2025-02-15T09:00:00Z',
    lastRunAt: '2026-03-18T09:45:00Z', lastRunStatus: 'SUCCESS',
    steps: [
      { stepId: 'step_1', name: 'validatePayload', type: 'CONDITION', config: { expression: "${input.amount} > 0" }, positionX: 100, positionY: 50 },
      { stepId: 'step_2', name: 'chargeCard',      type: 'HTTP',      config: { method: 'POST', url: 'https://payment-gateway.com/charge' }, positionX: 100, positionY: 180 },
      { stepId: 'step_3', name: 'notifyCustomer',  type: 'NOTIFY',    config: { channel: 'EMAIL', template: 'payment_success' }, positionX: 100, positionY: 310 },
      { stepId: 'step_4', name: 'handleFailure',   type: 'NOTIFY',    config: { channel: 'SLACK', template: 'payment_failed' }, positionX: 300, positionY: 180 },
    ],
    edges: [
      { id: 'e1', source: 'step_1', target: 'step_2', label: 'SUCCESS' },
      { id: 'e2', source: 'step_1', target: 'step_4', label: 'FAILURE' },
      { id: 'e3', source: 'step_2', target: 'step_3', label: 'SUCCESS' },
      { id: 'e4', source: 'step_2', target: 'step_4', label: 'FAILURE' },
    ],
  },
  {
    id: 'wf_003', name: 'user-onboarding', displayName: 'User Onboarding',
    namespace: 'default',
    triggerType: 'KAFKA', version: 1, status: 'PUBLISHED',
    publishedAt: '2025-01-20T14:00:00Z',
    lastRunAt: '2026-03-17T08:00:00Z', lastRunStatus: 'FAILED',
    steps: [
      { stepId: 'step_1', name: 'createAccount',   type: 'HTTP',      config: { method: 'POST', url: 'https://api.acme.com/accounts' }, positionX: 100, positionY: 50 },
      { stepId: 'step_2', name: 'waitForVerify',   type: 'WAIT',      config: { timeoutMinutes: 60, resumeContextKey: 'verification' }, positionX: 100, positionY: 180 },
      { stepId: 'step_3', name: 'sendWelcomeEmail',type: 'NOTIFY',    config: { channel: 'EMAIL', template: 'welcome' }, positionX: 100, positionY: 310 },
      { stepId: 'step_4', name: 'setupProfile',    type: 'HTTP',      config: { method: 'PUT', url: 'https://api.acme.com/profiles' }, positionX: 100, positionY: 440 },
    ],
    edges: [
      { id: 'e1', source: 'step_1', target: 'step_2', label: 'SUCCESS' },
      { id: 'e2', source: 'step_2', target: 'step_3', label: 'SUCCESS' },
      { id: 'e3', source: 'step_3', target: 'step_4', label: 'SUCCESS' },
    ],
  },
  {
    id: 'wf_004', name: 'refund-processor', displayName: 'Refund Processor',
    namespace: 'apply',
    triggerType: 'CRON', version: 1, status: 'DRAFT',
    publishedAt: null,
    lastRunAt: null, lastRunStatus: null,
    steps: [
      { stepId: 'step_1', name: 'fetchPendingRefunds', type: 'HTTP',   config: { method: 'GET', url: 'https://api.acme.com/refunds/pending' }, positionX: 100, positionY: 50 },
      { stepId: 'step_2', name: 'loopRefunds',         type: 'LOOP',   config: { listPath: 'steps.fetchPendingRefunds.output.refunds' }, positionX: 100, positionY: 180 },
      { stepId: 'step_3', name: 'processRefund',       type: 'HTTP',   config: { method: 'POST', url: 'https://api.acme.com/refunds/process' }, positionX: 100, positionY: 310 },
    ],
    edges: [
      { id: 'e1', source: 'step_1', target: 'step_2', label: 'SUCCESS' },
      { id: 'e2', source: 'step_2', target: 'step_3', label: 'SUCCESS' },
    ],
  },
  {
    id: 'wf_005', name: 'email-campaign', displayName: 'Email Campaign',
    namespace: 'default',
    triggerType: 'API', version: 5, status: 'PUBLISHED',
    publishedAt: '2025-03-10T11:00:00Z',
    lastRunAt: '2026-03-18T07:00:00Z', lastRunStatus: 'SUCCESS',
    steps: [
      { stepId: 'step_1', name: 'fetchSegment',  type: 'HTTP',   config: { method: 'GET', url: 'https://api.acme.com/segments/${input.segmentId}' }, positionX: 100, positionY: 50 },
      { stepId: 'step_2', name: 'loopRecipients',type: 'LOOP',   config: { listPath: 'steps.fetchSegment.output.emails' }, positionX: 100, positionY: 180 },
      { stepId: 'step_3', name: 'sendEmail',     type: 'NOTIFY', config: { channel: 'EMAIL', template: 'campaign' }, positionX: 100, positionY: 310 },
      { stepId: 'step_4', name: 'trackSend',     type: 'HTTP',   config: { method: 'POST', url: 'https://api.acme.com/analytics/track' }, positionX: 100, positionY: 440 },
    ],
    edges: [
      { id: 'e1', source: 'step_1', target: 'step_2', label: 'SUCCESS' },
      { id: 'e2', source: 'step_2', target: 'step_3', label: 'SUCCESS' },
      { id: 'e3', source: 'step_3', target: 'step_4', label: 'SUCCESS' },
    ],
  },
  {
    id: 'wf_006', name: 'fraud-detection', displayName: 'Fraud Detection',
    namespace: 'apply',
    triggerType: 'KAFKA', version: 2, status: 'PUBLISHED',
    publishedAt: '2025-02-28T16:00:00Z',
    lastRunAt: '2026-03-18T10:05:00Z', lastRunStatus: 'SUCCESS',
    steps: [
      { stepId: 'step_1', name: 'scoreTransaction', type: 'HTTP',      config: { method: 'POST', url: 'https://ml.acme.com/fraud/score' }, positionX: 100, positionY: 50 },
      { stepId: 'step_2', name: 'checkScore',       type: 'CONDITION', config: { expression: "${steps.scoreTransaction.output.score} > 0.8" }, positionX: 100, positionY: 180 },
      { stepId: 'step_3', name: 'blockTransaction', type: 'HTTP',      config: { method: 'POST', url: 'https://api.acme.com/transactions/block' }, positionX: 0, positionY: 310 },
      { stepId: 'step_4', name: 'alertTeam',        type: 'NOTIFY',    config: { channel: 'SLACK', template: 'fraud_alert' }, positionX: 0, positionY: 440 },
      { stepId: 'step_5', name: 'approveTransaction',type: 'HTTP',     config: { method: 'POST', url: 'https://api.acme.com/transactions/approve' }, positionX: 200, positionY: 310 },
    ],
    edges: [
      { id: 'e1', source: 'step_1', target: 'step_2', label: 'SUCCESS' },
      { id: 'e2', source: 'step_2', target: 'step_3', label: 'SUCCESS' },
      { id: 'e3', source: 'step_2', target: 'step_5', label: 'FAILURE' },
      { id: 'e4', source: 'step_3', target: 'step_4', label: 'SUCCESS' },
    ],
  },
]

// ─── DUMMY EXECUTIONS (25 rows) ───────────────────────────────────────────────
const now = new Date('2026-03-18T10:00:00Z')
const ago = (minutes: number) => new Date(now.getTime() - minutes * 60000).toISOString()

export const DUMMY_EXECUTIONS = [
  { id: 'exec_001', namespace: 'default', workflowName: 'order-processing',  workflowVersion: 3, status: 'SUCCESS', triggerType: 'API',     triggeredBy: 'admin@acme.com', startedAt: ago(2),   completedAt: ago(1),   durationMs: 1240, modelRecordId: 'mr-1', dataSyncMode: 'WRITE' as const, modelDataSnapshot: { orderId: 'ORD-2026-0042', customerId: 'CUST-001', amount: 149.99, currency: 'USD', status: 'pending' }, modelDataAfter: { orderId: 'ORD-2026-0042', customerId: 'CUST-001', amount: 149.99, currency: 'USD', status: 'completed', processedAt: '2026-03-10T09:01:24Z', discountApplied: 15.0 } },
  { id: 'exec_002', namespace: 'default', workflowName: 'payment-flow',       workflowVersion: 2, status: 'RUNNING', triggerType: 'KAFKA',   triggeredBy: 'kafka-trigger',  startedAt: ago(1),   completedAt: null,     durationMs: 0 },
  { id: 'exec_003', namespace: 'default', workflowName: 'user-onboarding',    workflowVersion: 1, status: 'FAILED',  triggerType: 'KAFKA',   triggeredBy: 'kafka-trigger',  startedAt: ago(90),  completedAt: ago(89),  durationMs: 820 },
  { id: 'exec_004', namespace: 'default', workflowName: 'order-processing',   workflowVersion: 3, status: 'PAUSED',  triggerType: 'API',     triggeredBy: 'ci@acme.com',    startedAt: ago(30),  completedAt: null,     durationMs: 0 },
  { id: 'exec_005', namespace: 'apply', workflowName: 'email-campaign',     workflowVersion: 5, status: 'SUCCESS', triggerType: 'API',     triggeredBy: 'priya@acme.com', startedAt: ago(180), completedAt: ago(177), durationMs: 3400 },
  { id: 'exec_006', namespace: 'apply', workflowName: 'fraud-detection',    workflowVersion: 2, status: 'SUCCESS', triggerType: 'KAFKA',   triggeredBy: 'kafka-trigger',  startedAt: ago(5),   completedAt: ago(4),   durationMs: 560 },
  { id: 'exec_007', namespace: 'default', workflowName: 'order-processing',   workflowVersion: 3, status: 'SUCCESS', triggerType: 'API',     triggeredBy: 'admin@acme.com', startedAt: ago(360), completedAt: ago(359), durationMs: 1100 },
  { id: 'exec_008', namespace: 'default', workflowName: 'payment-flow',       workflowVersion: 2, status: 'FAILED',  triggerType: 'KAFKA',   triggeredBy: 'kafka-trigger',  startedAt: ago(240), completedAt: ago(239), durationMs: 430 },
  { id: 'exec_009', namespace: 'default', workflowName: 'user-onboarding',    workflowVersion: 1, status: 'WAITING', triggerType: 'KAFKA',   triggeredBy: 'kafka-trigger',  startedAt: ago(45),  completedAt: null,     durationMs: 0 },
  { id: 'exec_010', namespace: 'apply', workflowName: 'fraud-detection',    workflowVersion: 2, status: 'SUCCESS', triggerType: 'KAFKA',   triggeredBy: 'kafka-trigger',  startedAt: ago(10),  completedAt: ago(9),   durationMs: 590 },
  { id: 'exec_011', namespace: 'default', workflowName: 'order-processing',   workflowVersion: 3, status: 'SUCCESS', triggerType: 'API',     triggeredBy: 'ci@acme.com',    startedAt: ago(720), completedAt: ago(719), durationMs: 980 },
  { id: 'exec_012', namespace: 'apply', workflowName: 'email-campaign',     workflowVersion: 5, status: 'FAILED',  triggerType: 'CRON',    triggeredBy: 'cron-trigger',   startedAt: ago(1440),completedAt: ago(1439),durationMs: 760 },
  { id: 'exec_013', namespace: 'default', workflowName: 'payment-flow',       workflowVersion: 2, status: 'SUCCESS', triggerType: 'KAFKA',   triggeredBy: 'kafka-trigger',  startedAt: ago(480), completedAt: ago(478), durationMs: 2100 },
  { id: 'exec_014', namespace: 'apply', workflowName: 'fraud-detection',    workflowVersion: 2, status: 'SUCCESS', triggerType: 'KAFKA',   triggeredBy: 'kafka-trigger',  startedAt: ago(15),  completedAt: ago(14),  durationMs: 610 },
  { id: 'exec_015', namespace: 'default', workflowName: 'order-processing',   workflowVersion: 2, status: 'SUCCESS', triggerType: 'API',     triggeredBy: 'admin@acme.com', startedAt: ago(1500),completedAt: ago(1499),durationMs: 1350 },
  { id: 'exec_016', namespace: 'default', workflowName: 'user-onboarding',    workflowVersion: 1, status: 'SUCCESS', triggerType: 'KAFKA',   triggeredBy: 'kafka-trigger',  startedAt: ago(600), completedAt: ago(597), durationMs: 3020 },
  { id: 'exec_017', namespace: 'apply', workflowName: 'email-campaign',     workflowVersion: 5, status: 'SUCCESS', triggerType: 'API',     triggeredBy: 'priya@acme.com', startedAt: ago(800), completedAt: ago(797), durationMs: 3600 },
  { id: 'exec_018', namespace: 'default', workflowName: 'payment-flow',       workflowVersion: 2, status: 'FAILED',  triggerType: 'KAFKA',   triggeredBy: 'kafka-trigger',  startedAt: ago(900), completedAt: ago(899), durationMs: 340 },
  { id: 'exec_019', namespace: 'apply', workflowName: 'fraud-detection',    workflowVersion: 2, status: 'SUCCESS', triggerType: 'KAFKA',   triggeredBy: 'kafka-trigger',  startedAt: ago(20),  completedAt: ago(19),  durationMs: 580 },
  { id: 'exec_020', namespace: 'default', workflowName: 'order-processing',   workflowVersion: 3, status: 'SUCCESS', triggerType: 'API',     triggeredBy: 'ci@acme.com',    startedAt: ago(25),  completedAt: ago(24),  durationMs: 1190 },
  { id: 'exec_021', namespace: 'default', workflowName: 'user-onboarding',    workflowVersion: 1, status: 'FAILED',  triggerType: 'KAFKA',   triggeredBy: 'kafka-trigger',  startedAt: ago(2880),completedAt: ago(2879),durationMs: 950 },
  { id: 'exec_022', namespace: 'apply', workflowName: 'fraud-detection',    workflowVersion: 2, status: 'SUCCESS', triggerType: 'KAFKA',   triggeredBy: 'kafka-trigger',  startedAt: ago(35),  completedAt: ago(34),  durationMs: 610 },
  { id: 'exec_023', namespace: 'default', workflowName: 'order-processing',   workflowVersion: 3, status: 'RUNNING', triggerType: 'API',     triggeredBy: 'admin@acme.com', startedAt: ago(3),   completedAt: null,     durationMs: 0 },
  { id: 'exec_024', namespace: 'apply', workflowName: 'email-campaign',     workflowVersion: 5, status: 'SUCCESS', triggerType: 'CRON',    triggeredBy: 'cron-trigger',   startedAt: ago(1500),completedAt: ago(1497),durationMs: 4100 },
  { id: 'exec_025', namespace: 'default', workflowName: 'payment-flow',       workflowVersion: 2, status: 'SUCCESS', triggerType: 'KAFKA',   triggeredBy: 'kafka-trigger',  startedAt: ago(60),  completedAt: ago(58),  durationMs: 1800 },
]

// ─── STEP EXECUTIONS for exec_001 (order-processing, SUCCESS) ─────────────────
export const DUMMY_STEP_EXECUTIONS_001 = [
  {
    id: 'se_001_1', executionId: 'exec_001', stepId: 'step_1', stepName: 'fetchCustomer', stepType: 'HTTP',
    status: 'SUCCESS', attemptNumber: 1, durationMs: 312,
    startedAt: ago(2), completedAt: ago(2),
    input:  { customerId: 'CUST-42' },
    output: { id: 'CUST-42', name: 'Ravi Sharma', tier: 'GOLD', email: 'ravi@example.com' },
    httpCallLog: {
      url: 'https://api.acme.com/customers/CUST-42',
      method: 'GET',
      requestHeaders: { 'Authorization': 'Bearer sk_live_xxx', 'Accept': 'application/json' },
      requestBody: '',
      responseStatus: 200,
      responseHeaders: { 'Content-Type': 'application/json', 'X-Request-Id': 'req_abc123' },
      responseBody: JSON.stringify({ id: 'CUST-42', name: 'Ravi Sharma', tier: 'GOLD', email: 'ravi@example.com' }),
      durationMs: 312,
      success: true,
    },
  },
  {
    id: 'se_001_2', executionId: 'exec_001', stepId: 'step_2', stepName: 'checkTier', stepType: 'CONDITION',
    status: 'SUCCESS', attemptNumber: 1, durationMs: 2,
    startedAt: ago(2), completedAt: ago(2),
    input:  { tier: 'GOLD' },
    output: { result: true, branch: 'SUCCESS', expression: "steps.fetchCustomer.output.tier == 'GOLD'" },
  },
  {
    id: 'se_001_3', executionId: 'exec_001', stepId: 'step_3', stepName: 'applyGoldDiscount', stepType: 'HTTP',
    status: 'SUCCESS', attemptNumber: 1, durationMs: 280,
    startedAt: ago(2), completedAt: ago(2),
    input:  { customerId: 'CUST-42', tier: 'GOLD' },
    output: { discount: 20, discountCode: 'GOLD20', finalAmount: 800 },
    httpCallLog: {
      url: 'https://api.acme.com/discounts/apply',
      method: 'POST',
      requestHeaders: { 'Authorization': 'Bearer sk_live_xxx', 'Content-Type': 'application/json' },
      requestBody: JSON.stringify({ customerId: 'CUST-42', tier: 'GOLD', orderId: 'ORD-999' }),
      responseStatus: 200,
      responseHeaders: { 'Content-Type': 'application/json' },
      responseBody: JSON.stringify({ discount: 20, discountCode: 'GOLD20', finalAmount: 800 }),
      durationMs: 280,
      success: true,
    },
  },
  {
    id: 'se_001_4', executionId: 'exec_001', stepId: 'step_5', stepName: 'runPayment', stepType: 'SUB_WORKFLOW',
    status: 'SUCCESS', attemptNumber: 1, durationMs: 540,
    startedAt: ago(1), completedAt: ago(1),
    input:  { amount: 800, currency: 'USD', customerId: 'CUST-42' },
    output: { paymentId: 'pay_xyz789', status: 'CAPTURED', transactionRef: 'TXN-001' },
  },
  {
    id: 'se_001_5', executionId: 'exec_001', stepId: 'step_6', stepName: 'sendInvoice', stepType: 'NOTIFY',
    status: 'SUCCESS', attemptNumber: 1, durationMs: 96,
    startedAt: ago(1), completedAt: ago(1),
    input:  { email: 'ravi@example.com', amount: 800, invoiceId: 'INV-2026-001' },
    output: { messageId: 'msg_email_123', delivered: true },
  },
]

// ─── STEP EXECUTIONS for exec_003 (user-onboarding, FAILED) ──────────────────
export const DUMMY_STEP_EXECUTIONS_003 = [
  {
    id: 'se_003_1', executionId: 'exec_003', stepId: 'step_1', stepName: 'createAccount', stepType: 'HTTP',
    status: 'SUCCESS', attemptNumber: 1, durationMs: 430,
    startedAt: ago(90), completedAt: ago(90),
    input:  { email: 'newuser@example.com', plan: 'FREE' },
    output: { accountId: 'ACC-9001', status: 'PENDING_VERIFICATION' },
    httpCallLog: {
      url: 'https://api.acme.com/accounts',
      method: 'POST',
      requestHeaders: { 'Authorization': 'Bearer sk_live_xxx', 'Content-Type': 'application/json' },
      requestBody: JSON.stringify({ email: 'newuser@example.com', plan: 'FREE' }),
      responseStatus: 201,
      responseHeaders: { 'Content-Type': 'application/json' },
      responseBody: JSON.stringify({ accountId: 'ACC-9001', status: 'PENDING_VERIFICATION' }),
      durationMs: 430,
      success: true,
    },
  },
  {
    id: 'se_003_ai', executionId: 'exec_003', stepId: 'step_2', stepName: 'generateWelcomeMessage', stepType: 'AI_CALL',
    status: 'SUCCESS', attemptNumber: 1, durationMs: 1240,
    startedAt: ago(90), completedAt: ago(90),
    input:  { accountId: 'ACC-9001', email: 'newuser@example.com', plan: 'FREE' },
    output: {
      text: 'Welcome to Acme! Your account ACC-9001 has been created successfully on the FREE plan. Get started by exploring our dashboard and setting up your first workflow. Upgrade to PRO any time to unlock unlimited executions and priority support.',
      model: 'claude-haiku-4-5-20251001',
      inputTokens: 87,
      outputTokens: 52,
      stopReason: 'end_turn',
      durationMs: 1240,
    },
    resolvedConfig: {
      model: 'claude-haiku-4-5-20251001',
      userPrompt: 'Write a friendly welcome message for new user newuser@example.com (account ACC-9001, plan: FREE). Keep it under 3 sentences.',
      maxTokens: 256,
      temperature: 0.8,
    },
  },
  {
    id: 'se_003_2', executionId: 'exec_003', stepId: 'step_3', stepName: 'sendWelcomeEmail', stepType: 'NOTIFY',
    status: 'FAILED', attemptNumber: 3, totalAttempts: 3, durationMs: 0,
    startedAt: ago(89), completedAt: ago(89),
    input:  { email: 'newuser@example.com', accountId: 'ACC-9001', message: 'Welcome to Acme! Your account...' },
    output: {},
    errorMessage: 'SMTP connection timeout after 3 retries: mail.acme.com:587',
    resolvedConfig: { channel: 'EMAIL', to: 'newuser@example.com', subject: 'Welcome to Acme!' },
    retryAttempts: [
      { attemptNumber: 1, errorMessage: 'SMTP connection timeout', failedAt: ago(110), durationMs: 10020 },
      { attemptNumber: 2, errorMessage: 'SMTP connection timeout', failedAt: ago(100), durationMs: 10018 },
      { attemptNumber: 3, errorMessage: 'SMTP timeout — mail.acme.com:587 unreachable', failedAt: ago(89), durationMs: 10025 },
    ],
  },
]

// ─── STEP EXECUTIONS for exec_009 (user-onboarding, WAITING) ─────────────────
export const DUMMY_STEP_EXECUTIONS_009 = [
  {
    id: 'se_009_1', executionId: 'exec_009', stepId: 'step_1', stepName: 'createAccount', stepType: 'HTTP',
    status: 'SUCCESS', attemptNumber: 1, durationMs: 410,
    startedAt: ago(45), completedAt: ago(45),
    input:  { email: 'bob@example.com', plan: 'PRO' },
    output: { accountId: 'ACC-9002', status: 'PENDING_VERIFICATION' },
    httpCallLog: {
      url: 'https://api.acme.com/accounts',
      method: 'POST',
      requestHeaders: { 'Authorization': 'Bearer sk_live_xxx', 'Content-Type': 'application/json' },
      requestBody: JSON.stringify({ email: 'bob@example.com', plan: 'PRO' }),
      responseStatus: 201,
      responseHeaders: { 'Content-Type': 'application/json' },
      responseBody: JSON.stringify({ accountId: 'ACC-9002', status: 'PENDING_VERIFICATION' }),
      durationMs: 410,
      success: true,
    },
  },
  {
    id: 'se_009_2', executionId: 'exec_009', stepId: 'step_2', stepName: 'waitForVerify', stepType: 'WAIT',
    status: 'WAITING', attemptNumber: 1, durationMs: 0,
    startedAt: ago(44), completedAt: null,
    input:  { accountId: 'ACC-9002', email: 'bob@example.com' },
    output: {},
    waitToken: 'wt_demo_abc123xyz789',
  },
]

// ─── STEP EXECUTIONS for exec_002 (payment-flow, RUNNING) ────────────────────
export const DUMMY_STEP_EXECUTIONS_002 = [
  {
    id: 'se_002_1', executionId: 'exec_002', stepId: 'step_1', stepName: 'validatePayload', stepType: 'CONDITION',
    status: 'SUCCESS', attemptNumber: 1, durationMs: 3,
    startedAt: ago(1), completedAt: ago(1),
    input:  { amount: 249.99, currency: 'USD' },
    output: { result: true, branch: 'SUCCESS', expression: '${input.amount} > 0' },
  },
  {
    id: 'se_002_2', executionId: 'exec_002', stepId: 'step_2', stepName: 'chargeCard', stepType: 'HTTP',
    status: 'RUNNING', attemptNumber: 1, durationMs: 0,
    startedAt: ago(0), completedAt: null,
    input:  { amount: 249.99, currency: 'USD', cardToken: 'tok_visa_xxxx4242' },
    output: {},
    httpCallLog: {
      url: 'https://payment-gateway.com/charge',
      method: 'POST',
      requestHeaders: { 'Authorization': 'Bearer sk_live_xxx', 'Content-Type': 'application/json' },
      requestBody: JSON.stringify({ amount: 24999, currency: 'USD', source: 'tok_visa_xxxx4242' }),
      responseStatus: 0,
      responseHeaders: {},
      responseBody: '',
      durationMs: 0,
      success: false,
      errorMessage: 'Awaiting response...',
    },
  },
]

// ─── STEP EXECUTIONS for exec_004 (order-processing, PAUSED) ─────────────────
export const DUMMY_STEP_EXECUTIONS_004 = [
  {
    id: 'se_004_1', executionId: 'exec_004', stepId: 'step_1', stepName: 'fetchCustomer', stepType: 'HTTP',
    status: 'SUCCESS', attemptNumber: 1, durationMs: 298,
    startedAt: ago(30), completedAt: ago(30),
    input:  { customerId: 'CUST-77' },
    output: { id: 'CUST-77', name: 'Priya Mehta', tier: 'STANDARD', email: 'priya@example.com' },
    httpCallLog: {
      url: 'https://api.acme.com/customers/CUST-77',
      method: 'GET',
      requestHeaders: { 'Authorization': 'Bearer sk_live_xxx', 'Accept': 'application/json' },
      requestBody: '',
      responseStatus: 200,
      responseHeaders: { 'Content-Type': 'application/json' },
      responseBody: JSON.stringify({ id: 'CUST-77', name: 'Priya Mehta', tier: 'STANDARD', email: 'priya@example.com' }),
      durationMs: 298,
      success: true,
    },
  },
  {
    id: 'se_004_2', executionId: 'exec_004', stepId: 'step_2', stepName: 'checkTier', stepType: 'CONDITION',
    status: 'SUCCESS', attemptNumber: 1, durationMs: 1,
    startedAt: ago(30), completedAt: ago(30),
    input:  { tier: 'STANDARD' },
    output: { result: false, branch: 'FAILURE', expression: "${steps.fetchCustomer.output.tier} == 'GOLD'" },
  },
  {
    id: 'se_004_3', executionId: 'exec_004', stepId: 'step_4', stepName: 'applyStdDiscount', stepType: 'HTTP',
    status: 'PENDING', attemptNumber: 0, durationMs: 0,
    startedAt: null, completedAt: null,
    input:  {},
    output: {},
  },
]

// ─── STEP EXECUTIONS for exec_005 (email-campaign, SUCCESS) ───────────────────
export const DUMMY_STEP_EXECUTIONS_005 = [
  {
    id: 'se_005_1', executionId: 'exec_005', stepId: 'step_1', stepName: 'fetchSegment', stepType: 'HTTP',
    status: 'SUCCESS', attemptNumber: 1, durationMs: 184,
    startedAt: ago(183), completedAt: ago(183),
    input:  { segmentId: 'seg_newsletter_march' },
    output: { segmentId: 'seg_newsletter_march', name: 'March Newsletter', emailCount: 4821, emails: ['...'] },
    httpCallLog: {
      url: 'https://api.acme.com/segments/seg_newsletter_march',
      method: 'GET',
      requestHeaders: { 'Authorization': 'Bearer sk_live_xxx', 'Accept': 'application/json' },
      requestBody: '',
      responseStatus: 200,
      responseHeaders: { 'Content-Type': 'application/json', 'X-Total-Count': '4821' },
      responseBody: JSON.stringify({ segmentId: 'seg_newsletter_march', emailCount: 4821 }),
      durationMs: 184,
      success: true,
    },
  },
  {
    id: 'se_005_2', executionId: 'exec_005', stepId: 'step_2', stepName: 'loopRecipients', stepType: 'LOOP',
    status: 'SUCCESS', attemptNumber: 1, durationMs: 2100,
    startedAt: ago(182), completedAt: ago(179),
    input:  { listPath: 'steps.fetchSegment.output.emails', itemCount: 4821 },
    output: { iterationsCompleted: 4821, iterationsFailed: 0 },
  },
  {
    id: 'se_005_3', executionId: 'exec_005', stepId: 'step_3', stepName: 'sendEmail', stepType: 'NOTIFY',
    status: 'SUCCESS', attemptNumber: 1, durationMs: 900,
    startedAt: ago(179), completedAt: ago(178),
    input:  { channel: 'EMAIL', template: 'campaign', recipientCount: 4821 },
    output: { sent: 4821, failed: 0, queuedIds: ['mq_batch_001'] },
  },
  {
    id: 'se_005_4', executionId: 'exec_005', stepId: 'step_4', stepName: 'trackSend', stepType: 'HTTP',
    status: 'SUCCESS', attemptNumber: 1, durationMs: 216,
    startedAt: ago(178), completedAt: ago(177),
    input:  { event: 'EMAIL_BATCH_SENT', batchId: 'mq_batch_001', count: 4821 },
    output: { tracked: true, eventId: 'evt_track_9921' },
    httpCallLog: {
      url: 'https://api.acme.com/analytics/track',
      method: 'POST',
      requestHeaders: { 'Authorization': 'Bearer sk_live_xxx', 'Content-Type': 'application/json' },
      requestBody: JSON.stringify({ event: 'EMAIL_BATCH_SENT', count: 4821 }),
      responseStatus: 204,
      responseHeaders: {},
      responseBody: '',
      durationMs: 216,
      success: true,
    },
  },
]

// ─── STEP EXECUTIONS for exec_006 (fraud-detection, SUCCESS) ─────────────────
export const DUMMY_STEP_EXECUTIONS_006 = [
  {
    id: 'se_006_1', executionId: 'exec_006', stepId: 'step_1', stepName: 'scoreTransaction', stepType: 'HTTP',
    status: 'SUCCESS', attemptNumber: 1, durationMs: 340,
    startedAt: ago(5), completedAt: ago(5),
    input:  { transactionId: 'TXN-8821', amount: 4999.00, cardLast4: '1337', country: 'NG' },
    output: { score: 0.91, riskLevel: 'HIGH', signals: ['unusual_country', 'high_velocity'] },
    httpCallLog: {
      url: 'https://ml.acme.com/fraud/score',
      method: 'POST',
      requestHeaders: { 'Authorization': 'Bearer ml_key_xxx', 'Content-Type': 'application/json' },
      requestBody: JSON.stringify({ transactionId: 'TXN-8821', amount: 4999.00 }),
      responseStatus: 200,
      responseHeaders: { 'Content-Type': 'application/json', 'X-Model-Version': 'v2.4.1' },
      responseBody: JSON.stringify({ score: 0.91, riskLevel: 'HIGH' }),
      durationMs: 340,
      success: true,
    },
  },
  {
    id: 'se_006_2', executionId: 'exec_006', stepId: 'step_2', stepName: 'checkScore', stepType: 'CONDITION',
    status: 'SUCCESS', attemptNumber: 1, durationMs: 1,
    startedAt: ago(4), completedAt: ago(4),
    input:  { score: 0.91 },
    output: { result: true, branch: 'SUCCESS', expression: '${steps.scoreTransaction.output.score} > 0.8' },
  },
  {
    id: 'se_006_3', executionId: 'exec_006', stepId: 'step_3', stepName: 'blockTransaction', stepType: 'HTTP',
    status: 'SUCCESS', attemptNumber: 1, durationMs: 150,
    startedAt: ago(4), completedAt: ago(4),
    input:  { transactionId: 'TXN-8821', reason: 'HIGH_FRAUD_SCORE' },
    output: { blocked: true, blockCode: 'BLK-001', notified: true },
    httpCallLog: {
      url: 'https://api.acme.com/transactions/block',
      method: 'POST',
      requestHeaders: { 'Authorization': 'Bearer sk_live_xxx', 'Content-Type': 'application/json' },
      requestBody: JSON.stringify({ transactionId: 'TXN-8821', reason: 'HIGH_FRAUD_SCORE' }),
      responseStatus: 200,
      responseHeaders: { 'Content-Type': 'application/json' },
      responseBody: JSON.stringify({ blocked: true, blockCode: 'BLK-001' }),
      durationMs: 150,
      success: true,
    },
  },
  {
    id: 'se_006_4', executionId: 'exec_006', stepId: 'step_4', stepName: 'alertTeam', stepType: 'NOTIFY',
    status: 'SUCCESS', attemptNumber: 1, durationMs: 69,
    startedAt: ago(4), completedAt: ago(4),
    input:  { channel: 'SLACK', template: 'fraud_alert', transactionId: 'TXN-8821', score: 0.91 },
    output: { slackTs: '1710758400.123456', channel: '#fraud-alerts', delivered: true },
  },
]

// ─── DUMMY WAIT TOKENS ─────────────────────────────────────────────────────────
export const DUMMY_WAIT_TOKENS = [
  {
    id: 'wt_doc_001',
    executionId: 'exec_009',
    clientId: 'client_acme_001',
    stepId: 'step_2',
    stepName: 'waitForVerify',
    token: 'wt_demo_abc123xyz789',
    status: 'WAITING',
    expiresAt: new Date(now.getTime() + 15 * 60000).toISOString(),
    createdAt: ago(44),
    resumedAt: null,
  },
]

// ─── DUMMY FAILED WORKFLOW ENTRIES ───────────────────────────────────────────
export const DUMMY_FAILED_WORKFLOWS = [
  {
    id: 'dlq_001', namespace: 'default', executionId: 'exec_003', workflowName: 'user-onboarding', stepName: 'sendWelcomeEmail',
    stepType: 'NOTIFY', failureReason: 'SMTP connection timeout after 3 retries', retryCount: 3, status: 'PENDING',
    failedAt: ago(89),
    retryAttempts: [
      { attemptNumber: 1, errorMessage: 'SMTP connection timeout', failedAt: ago(110), durationMs: 10020 },
      { attemptNumber: 2, errorMessage: 'SMTP connection timeout', failedAt: ago(100), durationMs: 10018 },
      { attemptNumber: 3, errorMessage: 'SMTP timeout — mail.acme.com:587 unreachable', failedAt: ago(89), durationMs: 10025 },
    ],
    replayHistory: [
      { replayedAt: ago(60), replayedBy: 'priya@acme.com', result: 'FAILED', errorMessage: 'Still timing out', contextWasModified: false },
    ],
  },
  {
    id: 'dlq_002', namespace: 'default', executionId: 'exec_008', workflowName: 'payment-flow', stepName: 'chargeCard',
    stepType: 'HTTP', failureReason: 'Payment gateway returned 502 Bad Gateway', retryCount: 3, status: 'PENDING',
    failedAt: ago(239),
    retryAttempts: [
      { attemptNumber: 1, errorMessage: '502 Bad Gateway', failedAt: ago(250), durationMs: 1320 },
      { attemptNumber: 2, errorMessage: '502 Bad Gateway', failedAt: ago(247), durationMs: 1280 },
      { attemptNumber: 3, errorMessage: '502 Bad Gateway from https://payment-gw.acme.io/charge', failedAt: ago(239), durationMs: 1305 },
    ],
    replayHistory: [],
  },
  {
    id: 'dlq_003', namespace: 'apply', executionId: 'exec_012', workflowName: 'email-campaign', stepName: 'sendEmail',
    stepType: 'NOTIFY', failureReason: 'Rate limit exceeded (429) on email provider', retryCount: 3, status: 'PENDING',
    failedAt: ago(1439),
    retryAttempts: [
      { attemptNumber: 1, errorMessage: '429 Too Many Requests — retry-after: 60s', failedAt: ago(1460), durationMs: 420 },
      { attemptNumber: 2, errorMessage: '429 Too Many Requests — retry-after: 60s', failedAt: ago(1450), durationMs: 398 },
      { attemptNumber: 3, errorMessage: '429 Too Many Requests — daily sending limit reached', failedAt: ago(1439), durationMs: 412 },
    ],
    replayHistory: [],
  },
  {
    id: 'dlq_004', namespace: 'default', executionId: 'exec_018', workflowName: 'payment-flow', stepName: 'chargeCard',
    stepType: 'HTTP', failureReason: 'SSL certificate error: certificate expired', retryCount: 3, status: 'DISCARDED',
    failedAt: ago(899),
    retryAttempts: [
      { attemptNumber: 1, errorMessage: 'SSL certificate expired — CN=payment-gw.acme.io', failedAt: ago(920), durationMs: 1840 },
      { attemptNumber: 2, errorMessage: 'SSL certificate expired', failedAt: ago(915), durationMs: 1760 },
      { attemptNumber: 3, errorMessage: 'SSL certificate expired — expired 2025-12-31', failedAt: ago(899), durationMs: 1800 },
    ],
    replayHistory: [
      { replayedAt: ago(800), replayedBy: 'admin@acme.com', result: 'FAILED', errorMessage: 'SSL still failing', contextWasModified: false },
      { replayedAt: ago(700), replayedBy: 'admin@acme.com', result: 'FAILED', errorMessage: 'SSL still failing', contextWasModified: false },
    ],
  },
  {
    id: 'dlq_005', namespace: 'default', executionId: 'exec_021', workflowName: 'user-onboarding', stepName: 'createAccount',
    stepType: 'HTTP', failureReason: 'Upstream service returned 500 Internal Server Error', retryCount: 3, status: 'PENDING',
    failedAt: ago(2879),
    retryAttempts: [
      { attemptNumber: 1, errorMessage: '500 Internal Server Error from https://accounts.acme.io', failedAt: ago(2900), durationMs: 890 },
      { attemptNumber: 2, errorMessage: '500 Internal Server Error', failedAt: ago(2890), durationMs: 905 },
      { attemptNumber: 3, errorMessage: '500 Internal Server Error — service degraded', failedAt: ago(2879), durationMs: 912 },
    ],
    replayHistory: [],
    executionContext: { stepOutputs: {}, variables: { env: 'prod', region: 'us-east-1' }, input: { userId: 'USR-7712' } },
    payload: { userId: 'USR-7712', email: 'newuser@acme.io' },
  },
  {
    // Full error trail demo — every auto-retry AND every manual replay also failed
    id: 'dlq_006', namespace: 'apply', executionId: 'exec_029', workflowName: 'payment-flow', stepName: 'chargeCard',
    stepType: 'HTTP', failureReason: 'SSL certificate verification failed: unable to get local issuer certificate',
    retryCount: 5, status: 'PENDING',
    failedAt: ago(4320),
    retryAttempts: [
      { attemptNumber: 1, errorMessage: 'SSL certificate verification failed', failedAt: ago(4420), durationMs: 1520 },
      { attemptNumber: 2, errorMessage: 'SSL certificate verification failed', failedAt: ago(4380), durationMs: 1488 },
      { attemptNumber: 3, errorMessage: 'certificate has expired — CN=billing.acme.io, expired 2026-01-01', failedAt: ago(4320), durationMs: 1510 },
    ],
    replayHistory: [
      { replayedAt: ago(4200), replayedBy: 'admin@acme.io', result: 'FAILED',
        errorMessage: 'SSL certificate verification failed', contextWasModified: false },
      { replayedAt: ago(3600), replayedBy: 'system', result: 'FAILED',
        errorMessage: 'SSL certificate verification failed', contextWasModified: false },
      { replayedAt: ago(1800), replayedBy: 'admin@acme.io', result: 'FAILED',
        errorMessage: 'certificate has expired — CN=billing.acme.io', contextWasModified: true },
    ],
    executionContext: {
      stepOutputs: { 'validate-card': { valid: true, last4: '4242' } },
      variables: { paymentGatewayUrl: 'https://billing.acme.io/charge', currency: 'USD' },
      input: { orderId: 'ORD-8821', amount: 249.99 },
    },
    payload: { orderId: 'ORD-8821', amount: 249.99, currency: 'USD' },
  },
]

// ─── DUMMY TRIGGERS ───────────────────────────────────────────────────────────
export const DUMMY_TRIGGERS = [
  {
    id: 'trig_001', namespace: 'default', name: 'New Order Created', sourceType: 'KAFKA', workflowName: 'order-processing',
    workflowId: 'wf_001', topicOrUrl: 'orders.created', enabled: true, triggerAction: 'FIRE_WORKFLOW',
    condition: { conditionType: 'FIELD_EQUALS', fieldPath: 'data.status', expectedValue: 'NEW', label: 'Only NEW orders' },
    createdAt: ago(5000),
  },
  {
    id: 'trig_003', namespace: 'apply', name: 'Nightly Batch Refund', sourceType: 'CRON', workflowName: 'refund-processor',
    workflowId: 'wf_004', topicOrUrl: '0 2 * * *', enabled: false, triggerAction: 'FIRE_WORKFLOW',
    condition: { conditionType: 'ALWAYS' },
    createdAt: ago(3000),
  },
  {
    id: 'trig_004', namespace: 'default', name: 'User Signup Event', sourceType: 'KAFKA', workflowName: 'user-onboarding',
    workflowId: 'wf_003', topicOrUrl: 'users.registered', enabled: true, triggerAction: 'FIRE_WORKFLOW',
    condition: {
      conditionType: 'AND',
      nestedConditions: [
        { conditionType: 'FIELD_EXISTS',  fieldPath: 'data.email' },
        { conditionType: 'FIELD_EQUALS',  fieldPath: 'data.source', expectedValue: 'WEB' },
      ],
    },
    createdAt: ago(2000),
  },
  {
    id: 'trig_005', namespace: 'default', name: 'Verify Email Resume', sourceType: 'KAFKA', workflowName: 'user-onboarding',
    workflowId: 'wf_003', topicOrUrl: 'users.email_verified', enabled: true, triggerAction: 'RESUME_WAIT',
    resumeTokenPath: 'data.waitToken',
    condition: { conditionType: 'FIELD_EXISTS', fieldPath: 'data.waitToken' },
    createdAt: ago(1000),
  },
]

// ─── DUMMY WEBHOOK DELIVERIES ─────────────────────────────────────────────────
export const DUMMY_WEBHOOK_DELIVERIES = [
  {
    id: 'wh_001', namespace: 'default', executionId: 'exec_001', event: 'EXECUTION_COMPLETED', status: 'DELIVERED',
    targetUrl: 'https://hooks.acme.com/flowforge', attempts: 1, maxAttempts: 5, sentAt: ago(1),
    deliveryAttempts: [
      { attemptNumber: 1, statusCode: 200, durationMs: 143, sentAt: ago(1), response: 'OK' },
    ],
  },
  {
    id: 'wh_002', namespace: 'default', executionId: 'exec_003', event: 'EXECUTION_FAILED', status: 'DELIVERED',
    targetUrl: 'https://hooks.acme.com/flowforge', attempts: 2, maxAttempts: 5, sentAt: ago(89),
    deliveryAttempts: [
      { attemptNumber: 1, statusCode: 503, durationMs: 2100, sentAt: ago(89), response: 'Service Unavailable' },
      { attemptNumber: 2, statusCode: 200, durationMs: 180, sentAt: ago(88),  response: 'OK' },
    ],
  },
  {
    id: 'wh_003', namespace: 'default', executionId: 'exec_008', event: 'STEP_DEAD_LETTERED', status: 'FAILED',
    targetUrl: 'https://hooks.acme.com/flowforge', attempts: 5, maxAttempts: 5, sentAt: ago(239),
    deliveryAttempts: [
      { attemptNumber: 1, statusCode: 503, durationMs: 2100, sentAt: ago(239) },
      { attemptNumber: 2, statusCode: 503, durationMs: 1800, sentAt: ago(238) },
      { attemptNumber: 3, statusCode: 503, durationMs: 1950, sentAt: ago(237) },
      { attemptNumber: 4, statusCode: 503, durationMs: 2200, sentAt: ago(235) },
      { attemptNumber: 5, statusCode: 503, durationMs: 1750, sentAt: ago(230) },
    ],
  },
  {
    id: 'wh_004', namespace: 'apply', executionId: 'exec_005', event: 'EXECUTION_COMPLETED', status: 'DELIVERED',
    targetUrl: 'https://hooks.acme.com/flowforge', attempts: 1, maxAttempts: 5, sentAt: ago(177),
    deliveryAttempts: [
      { attemptNumber: 1, statusCode: 200, durationMs: 210, sentAt: ago(177), response: 'OK' },
    ],
  },
]

// ─── DUMMY API KEYS ───────────────────────────────────────────────────────────
export const DUMMY_API_KEYS = [
  { id: 'key_001', name: 'Production',  prefix: 'ff_live_Xn', createdAt: '2025-01-01T00:00:00Z', lastUsedAt: ago(2) },
  { id: 'key_002', name: 'Staging',     prefix: 'ff_live_Ab', createdAt: '2025-02-15T00:00:00Z', lastUsedAt: ago(60) },
  { id: 'key_003', name: 'CI Bot',      prefix: 'ff_live_Kq', createdAt: '2025-03-01T00:00:00Z', lastUsedAt: null },
]

// ─── DUMMY AUDIT LOGS ─────────────────────────────────────────────────────────
export const DUMMY_AUDIT_LOGS = [
  { id: 'a_001', timestamp: ago(2),    actor: 'Ravi Sharma',  action: 'EXECUTION_TRIGGERED',  details: { workflowName: 'order-processing', executionId: 'exec_001' } },
  { id: 'a_002', timestamp: ago(5),    actor: 'Ravi Sharma',  action: 'WORKFLOW_PUBLISHED',    details: { workflowName: 'order-processing', version: 3 } },
  { id: 'a_003', timestamp: ago(60),   actor: 'Priya Mehta',  action: 'FAILED_WORKFLOW_REPLAY', details: { entryId: 'dlq_001', stepName: 'sendWelcomeEmail' } },
  { id: 'a_004', timestamp: ago(90),   actor: 'System',       action: 'EXECUTION_FAILED',      details: { workflowName: 'user-onboarding', executionId: 'exec_003' } },
  { id: 'a_005', timestamp: ago(120),  actor: 'Priya Mehta',  action: 'WORKFLOW_EDITED',       details: { workflowName: 'refund-processor' } },
  { id: 'a_006', timestamp: ago(180),  actor: 'Priya Mehta',  action: 'EXECUTION_TRIGGERED',  details: { workflowName: 'email-campaign', executionId: 'exec_005' } },
  { id: 'a_007', timestamp: ago(240),  actor: 'System',       action: 'EXECUTION_FAILED',      details: { workflowName: 'payment-flow', executionId: 'exec_008' } },
  { id: 'a_008', timestamp: ago(300),  actor: 'Ravi Sharma',  action: 'USER_ROLE_CHANGED',     details: { userId: 'user_003', role: 'WORKFLOW_VIEWER' } },
  { id: 'a_009', timestamp: ago(360),  actor: 'CI Bot',       action: 'EXECUTION_TRIGGERED',  details: { workflowName: 'order-processing', executionId: 'exec_007' } },
  { id: 'a_010', timestamp: ago(480),  actor: 'Ravi Sharma',  action: 'API_KEY_CREATED',       details: { keyName: 'CI Bot' } },
  { id: 'a_011', timestamp: ago(600),  actor: 'Priya Mehta',  action: 'WORKFLOW_PUBLISHED',    details: { workflowName: 'email-campaign', version: 5 } },
  { id: 'a_012', timestamp: ago(720),  actor: 'Ravi Sharma',  action: 'WORKFLOW_ROLLBACK',     details: { workflowName: 'order-processing', toVersion: 2 } },
  { id: 'a_013', timestamp: ago(900),  actor: 'Ravi Sharma',  action: 'SETTINGS_UPDATED',      details: { field: 'webhookUrl' } },
  { id: 'a_014', timestamp: ago(1440), actor: 'System',       action: 'EXECUTION_FAILED',      details: { workflowName: 'email-campaign', executionId: 'exec_012' } },
  { id: 'a_015', timestamp: ago(2880), actor: 'Ravi Sharma',  action: 'USER_INVITED',          details: { email: 'sneha@acme.com', role: 'WORKFLOW_MANAGER' } },
]

// ─── DUMMY RATE LIMITS ────────────────────────────────────────────────────────
export const DUMMY_RATE_LIMITS = {
  executionsPerMinute: 100,
  burstCapacity: 20,
  usedThisMinute: 43,
  perWorkflow: [
    { workflowId: 'wf_001', workflowName: 'order-processing', execPerMinute: 10, concurrent: 5 },
    { workflowId: 'wf_002', workflowName: 'payment-flow',      execPerMinute: 5,  concurrent: 2 },
  ],
}

// ─── DUMMY ANALYTICS ─────────────────────────────────────────────────────────
export const DUMMY_ANALYTICS_SUMMARY = {
  totalWorkflows: DUMMY_WORKFLOWS.length,
  executionsToday: 14,
  failedToday: 3,
  slaPercentage: 96.8,
  activeExecutions: 2,
  pendingDlq: 3,
}

export const DUMMY_EXECUTION_TREND = [
  { date: '2026-03-12', total: 42, success: 38, failed: 4 },
  { date: '2026-03-13', total: 55, success: 50, failed: 5 },
  { date: '2026-03-14', total: 38, success: 36, failed: 2 },
  { date: '2026-03-15', total: 61, success: 56, failed: 5 },
  { date: '2026-03-16', total: 47, success: 44, failed: 3 },
  { date: '2026-03-17', total: 53, success: 48, failed: 5 },
  { date: '2026-03-18', total: 14, success: 11, failed: 3 },
]

// ─── DUMMY ENV VARS ───────────────────────────────────────────────────────────
export const DUMMY_ENV_VARS = [
  { key: 'BASE_URL',     value: 'https://api.acme.com',    masked: false },
  { key: 'API_SECRET',   value: '••••••••••••••••',         masked: true  },
  { key: 'SMTP_HOST',    value: 'mail.acme.com',            masked: false },
  { key: 'SMTP_PASS',    value: '••••••••••••••••',         masked: true  },
]

// ─── WORKFLOW VERSION HISTORY ─────────────────────────────────────────────────
export const DUMMY_WORKFLOW_VERSIONS: Record<string, Array<{
  version: number
  status: string
  createdBy: string
  createdAt: string
  publishedAt: string | null
  changeNote: string
}>> = {
  'wf_001': [
    { version: 3, status: 'PUBLISHED',  createdBy: 'ravi@acme.com',  createdAt: '2025-03-01T09:45:00Z', publishedAt: '2025-03-01T10:00:00Z', changeNote: 'Added exponential retry on sendInvoice step; bumped HTTP timeout to 10s' },
    { version: 2, status: 'DEPRECATED', createdBy: 'priya@acme.com', createdAt: '2025-02-15T09:00:00Z', publishedAt: '2025-02-15T09:30:00Z', changeNote: 'Fixed email template reference in sendInvoice step' },
    { version: 1, status: 'DEPRECATED', createdBy: 'ravi@acme.com',  createdAt: '2025-02-01T13:30:00Z', publishedAt: '2025-02-01T14:00:00Z', changeNote: 'Initial version — order processing baseline' },
  ],
  'wf_002': [
    { version: 2, status: 'PUBLISHED',  createdBy: 'ravi@acme.com',  createdAt: '2025-02-15T08:30:00Z', publishedAt: '2025-02-15T09:00:00Z', changeNote: 'Handle 3DS authentication edge case; added handleFailure NOTIFY step' },
    { version: 1, status: 'DEPRECATED', createdBy: 'priya@acme.com', createdAt: '2025-01-10T10:30:00Z', publishedAt: '2025-01-10T11:00:00Z', changeNote: 'Initial payment flow' },
  ],
  'wf_003': [
    { version: 1, status: 'PUBLISHED',  createdBy: 'admin@acme.com', createdAt: '2025-01-20T13:30:00Z', publishedAt: '2025-01-20T14:00:00Z', changeNote: 'Initial user onboarding with WAIT step for email verification' },
  ],
  'wf_004': [
    { version: 1, status: 'DRAFT',      createdBy: 'priya@acme.com', createdAt: '2025-03-10T09:00:00Z', publishedAt: null, changeNote: 'Draft — nightly refund batch processor, pending QA sign-off' },
  ],
  'wf_005': [
    { version: 5, status: 'PUBLISHED',  createdBy: 'priya@acme.com', createdAt: '2025-03-10T10:30:00Z', publishedAt: '2025-03-10T11:00:00Z', changeNote: 'Added analytics tracking step after email send' },
    { version: 4, status: 'DEPRECATED', createdBy: 'ravi@acme.com',  createdAt: '2025-03-01T08:00:00Z', publishedAt: '2025-03-01T08:30:00Z', changeNote: 'Switched to batch send API; reduced latency by 40%' },
    { version: 3, status: 'DEPRECATED', createdBy: 'admin@acme.com', createdAt: '2025-02-20T09:00:00Z', publishedAt: '2025-02-20T09:30:00Z', changeNote: 'Added unsubscribe token injection' },
  ],
  'wf_006': [
    { version: 2, status: 'PUBLISHED',  createdBy: 'ravi@acme.com',  createdAt: '2025-02-28T15:30:00Z', publishedAt: '2025-02-28T16:00:00Z', changeNote: 'Lowered fraud threshold from 0.9 to 0.8; added Slack alert step' },
    { version: 1, status: 'DEPRECATED', createdBy: 'priya@acme.com', createdAt: '2025-01-15T12:00:00Z', publishedAt: '2025-01-15T12:30:00Z', changeNote: 'Initial fraud detection with ML scoring' },
  ],
}

// ─── MOCK MODEL RECORDS ─────────────────────────────────────────────────────
// Moved here (from api/modelRecords.ts) to avoid circular dependency:
// axios.ts → handlers.ts → modelRecords.ts → axios.ts
export const DUMMY_MODEL_RECORDS = [
  {
    id: 'mr-1',
    namespace: 'default',
    clientId: 'client-1',
    dataModelId: 'model-1',
    name: 'Order #ORD-2026-0042',
    data: {
      orderId: 'ORD-2026-0042',
      customerId: 'CUST-001',
      amount: 149.99,
      currency: 'USD',
      items: [{ sku: 'SKU-A', qty: 2 }, { sku: 'SKU-B', qty: 1 }],
    },
    createdBy: 'admin',
    createdAt: '2026-03-10T09:00:00',
    updatedAt: '2026-03-10T09:00:00',
  },
  {
    id: 'mr-2',
    namespace: 'default',
    clientId: 'client-1',
    dataModelId: 'model-1',
    name: 'Order #ORD-2026-0099',
    data: {
      orderId: 'ORD-2026-0099',
      customerId: 'CUST-007',
      amount: 599.00,
      currency: 'EUR',
      items: [{ sku: 'SKU-X', qty: 5 }],
    },
    createdBy: 'admin',
    createdAt: '2026-03-12T14:30:00',
    updatedAt: '2026-03-15T11:00:00',
  },
  {
    id: 'mr-3',
    namespace: 'default',
    clientId: 'client-1',
    dataModelId: 'model-2',
    name: 'New User — jane@example.com',
    data: {
      email: 'jane@example.com',
      name: 'Jane Doe',
      phone: '+12025551234',
      role: 'user',
    },
    createdBy: 'system',
    createdAt: '2026-03-18T08:00:00',
    updatedAt: '2026-03-18T08:00:00',
  },
  {
    id: 'mr-4',
    namespace: 'apply',
    clientId: 'client-1',
    dataModelId: 'model-2',
    name: 'Admin — bob@example.com',
    data: {
      email: 'bob@example.com',
      name: 'Bob Smith',
      role: 'admin',
    },
    createdBy: 'admin',
    createdAt: '2026-03-20T10:15:00',
    updatedAt: '2026-03-22T16:45:00',
  },
]

// ─── BILLING MOCK DATA ──────────────────────────────────────────────────────

export const DUMMY_SUBSCRIPTION: SubscriptionStatus = {
  plan: 'PRO',
  subscriptionStatus: 'active',
  currentPeriodEnd: new Date(Date.now() + 25 * 86400000).toISOString(),
  stripeCustomerId: 'cus_mock_12345',
  subscriptionId: 'sub_mock_67890',
}

export const DUMMY_PLAN_USAGE: PlanUsage = {
  plan: 'PRO',
  workflows: { used: 8, limit: 25 },
  models: { used: 12, limit: 50 },
  executions: { used: 45200, limit: 100000 },
  teamMembers: { used: 4, limit: 10 },
  webhooks: { used: 340, limit: 10000 },
}

export const DUMMY_PAYMENT_EVENTS: PaymentEvent[] = [
  { id: 'pe_001', eventType: 'invoice.paid', description: 'Pro Plan - Monthly', amount: 4900, currency: 'usd', status: 'succeeded', createdAt: new Date(Date.now() - 2 * 86400000).toISOString() },
  { id: 'pe_002', eventType: 'invoice.paid', description: 'Pro Plan - Monthly', amount: 4900, currency: 'usd', status: 'succeeded', createdAt: new Date(Date.now() - 32 * 86400000).toISOString() },
  { id: 'pe_003', eventType: 'invoice.paid', description: 'Pro Plan - Monthly', amount: 4900, currency: 'usd', status: 'succeeded', createdAt: new Date(Date.now() - 62 * 86400000).toISOString() },
  { id: 'pe_004', eventType: 'charge.refunded', description: 'Partial refund - billing error', amount: 1500, currency: 'usd', status: 'refunded', createdAt: new Date(Date.now() - 45 * 86400000).toISOString() },
  { id: 'pe_005', eventType: 'invoice.paid', description: 'Pro Plan - Monthly', amount: 4900, currency: 'usd', status: 'succeeded', createdAt: new Date(Date.now() - 92 * 86400000).toISOString() },
]

export const DUMMY_INVOICES: Invoice[] = [
  { id: 'inv_001', number: 'FF-2026-0042', amount: 4900, currency: 'usd', status: 'paid', periodStart: new Date(Date.now() - 30 * 86400000).toISOString(), periodEnd: new Date(Date.now()).toISOString(), createdAt: new Date(Date.now() - 2 * 86400000).toISOString() },
  { id: 'inv_002', number: 'FF-2026-0031', amount: 4900, currency: 'usd', status: 'paid', periodStart: new Date(Date.now() - 60 * 86400000).toISOString(), periodEnd: new Date(Date.now() - 30 * 86400000).toISOString(), createdAt: new Date(Date.now() - 32 * 86400000).toISOString() },
  { id: 'inv_003', number: 'FF-2026-0020', amount: 4900, currency: 'usd', status: 'paid', periodStart: new Date(Date.now() - 90 * 86400000).toISOString(), periodEnd: new Date(Date.now() - 60 * 86400000).toISOString(), createdAt: new Date(Date.now() - 62 * 86400000).toISOString() },
]

// ─── DUMMY INVITATIONS ──────────────────────────────────────────────────────
export const DUMMY_INVITATIONS: PendingInvitation[] = [
  {
    id: 'inv_001',
    token: 'abc123-def456-ghi789',
    email: 'newuser@acme.com',
    name: 'New User',
    roles: ['WORKFLOW_VIEWER'],
    status: 'PENDING',
    expiresAt: new Date(Date.now() + 48 * 3600000).toISOString(),
    createdAt: new Date(Date.now() - 24 * 3600000).toISOString(),
  },
  {
    id: 'inv_002',
    token: 'xyz789-abc123-def456',
    email: 'analyst@acme.com',
    name: 'Data Analyst',
    roles: ['WORKFLOW_MANAGER'],
    status: 'PENDING',
    expiresAt: new Date(Date.now() + 60 * 3600000).toISOString(),
    createdAt: new Date(Date.now() - 12 * 3600000).toISOString(),
  },
]

// ─── DUMMY AI CHAT SAMPLES ───────────────────────────────────────────────────
export const DUMMY_AI_CHAT_SAMPLES: Array<{
  match: string[]
  answer: string
  citations: Array<{ type: 'execution' | 'workflow'; id: string; label: string }>
}> = [
  {
    match: ['fail', 'failed', 'error', 'why'],
    answer: 'The most recent failure was in the **user-onboarding** workflow (execution `exec_003`). The `sendWelcomeEmail` NOTIFY step exhausted all 3 retry attempts due to SMTP connection timeouts to `mail.acme.com:587`. I recommend verifying mail server reachability and adding a fallback channel like Slack.',
    citations: [
      { type: 'execution', id: 'exec_003', label: 'exec_003 — user-onboarding' },
      { type: 'workflow', id: 'user-onboarding', label: 'user-onboarding workflow' },
    ],
  },
  {
    match: ['slow', 'slowest', 'performance', 'duration'],
    answer: 'Your slowest workflows over the last 7 days:\n\n1. **data-pipeline** — avg 42s (4 executions)\n2. **invoice-sync** — avg 18s (12 executions)\n3. **order-processing** — avg 6s (120 executions)\n\nThe data-pipeline workflow spends ~70% of its time in a single HTTP_REQUEST step calling a downstream analytics service — consider parallelizing the independent fan-out branches.',
    citations: [
      { type: 'workflow', id: 'data-pipeline', label: 'data-pipeline' },
      { type: 'workflow', id: 'invoice-sync', label: 'invoice-sync' },
    ],
  },
  {
    match: ['order', 'orders', 'order-processing'],
    answer: 'The **order-processing** workflow has executed 120 times in the last 7 days with a 97.5% success rate. The 3 failures were all due to inventory-service timeouts during peak hours (14:00–16:00 UTC). Adding an exponential-backoff retry policy to the `check-inventory` step should resolve most of these.',
    citations: [
      { type: 'workflow', id: 'order-processing', label: 'order-processing' },
      { type: 'execution', id: 'exec_001', label: 'exec_001' },
    ],
  },
  {
    match: ['hi', 'hello', 'hey'],
    answer: 'Hi! I can help you understand your workflows and executions. Try asking:\n- Why did workflow X fail?\n- What are my slowest workflows?\n- Show me recent failures in order-processing.',
    citations: [],
  },
]

// ─── DUMMY OPTIMIZATION SUGGESTIONS ──────────────────────────────────────────
export const DUMMY_OPTIMIZATION_SUGGESTIONS = [
  {
    type: 'RETRY_TUNING' as const,
    severity: 'WARN' as const,
    stepId: 'check-inventory',
    description: 'Increase retry count and backoff for check-inventory step',
    rationale: 'Over the last 50 executions, this step failed transiently 8 times and was retried only once before bubbling up. Bumping retries to 3 with exponential backoff (starting at 2s) would resolve ~90% of these failures without impacting latency in the happy path.',
  },
  {
    type: 'PARALLELIZATION' as const,
    severity: 'INFO' as const,
    stepId: 'send-confirm',
    description: 'Run sendConfirm and notifyOps in parallel',
    rationale: 'These two NOTIFY steps are independent — neither consumes the output of the other — and currently run sequentially, adding ~800ms of latency. Parallelizing them via a fan-out branch would bring total workflow duration down from ~3.2s to ~2.4s.',
  },
  {
    type: 'RATE_LIMIT_RISK' as const,
    severity: 'CRITICAL' as const,
    stepId: 'validate-order',
    description: 'Validate-order is approaching the downstream API rate limit',
    rationale: 'The validate-order HTTP_REQUEST step hit the downstream rate limit (429 responses) twice in the last 24h during peak traffic. Consider either adding a rate-limiter on the FlowForge side or batching requests — at the current growth rate, failures will likely increase from 2/day to ~15/day within two weeks.',
  },
]

// ─── DUMMY WORKFLOW DOCS ─────────────────────────────────────────────────────
export const DUMMY_WORKFLOW_DOCS: Record<string, {
  workflowId: string
  workflowVersion: number
  markdown: string
  generatedAt: string
  editedBy?: string
  editedAt?: string
}> = {
  '1': {
    workflowId: '1',
    workflowVersion: 3,
    markdown: `# Order Processing

This workflow handles incoming orders from the \`orders.created\` Kafka topic and coordinates validation, inventory checks, and customer notifications.

## Trigger

- **Type:** KAFKA
- **Topic:** \`orders.created\`

## Steps

### 1. Validate Order (HTTP_REQUEST)
Posts the incoming order payload to the validation service at \`https://api.orders.io/validate\`. On success, continues to the inventory check; on failure, the workflow terminates.

### 2. Check Inventory (CONDITION)
Evaluates the expression \`$.inventory.available == true\`. Branches the workflow based on inventory availability.

### 3. Send Confirmation (NOTIFY)
When inventory is available, sends an email confirmation to the customer using the EMAIL channel.

### 4. Alert OPS (NOTIFY)
When inventory is *not* available, pushes a Slack alert to the \`#ops-alerts\` channel so the operations team can respond.

## Error Handling

Each HTTP step is configured with the default retry policy (3 attempts, exponential backoff). See the workflow definition for step-specific overrides.
`,
    generatedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
}

// ─── DUMMY NAMESPACES ────────────────────────────────────────────────────────
export const DUMMY_NAMESPACES: Namespace[] = [
  { id: 'ns_001', name: 'default', displayName: 'Default', description: 'Default namespace for all entities', createdBy: 'admin', createdAt: '2025-01-01T00:00:00Z' },
  { id: 'ns_002', name: 'apply', displayName: 'Apply', description: 'Application-specific namespace', createdBy: 'admin', createdAt: '2025-01-02T00:00:00Z' },
]
