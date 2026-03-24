export interface User {
  id: string
  name: string
  email: string
  roles: string[]
}

export interface Workflow {
  id: string
  name: string
  displayName: string
  description?: string
  triggerType: string
  cronExpression?: string
  kafkaTopic?: string
  version: number
  status: 'DRAFT' | 'PUBLISHED' | 'DEPRECATED'
  steps: StepDef[]
  edges: EdgeDef[]
  variables: Record<string, string>
  // Schema / model bindings
  inputModelId?: string
  outputModelId?: string
  outputMapping?: Record<string, string>
  errorHandlingConfig?: {
    mode: 'FAIL_FAST' | 'CONTINUE' | 'CUSTOM_RESPONSE'
    customStatusCode?: number
    customBody?: Record<string, unknown>
    notifyOnError?: boolean
  }
  publishedAt?: string
  createdAt?: string
  updatedAt?: string
  lastRunAt?: string
}

export interface StepDef {
  stepId: string
  name: string
  type: string
  config: Record<string, unknown>
  retryPolicy?: RetryPolicy
  onSuccess?: string
  onFailure?: string
  positionX: number
  positionY: number
}

export interface EdgeDef {
  id: string
  source: string
  target: string
  label?: string
}

export interface RetryPolicy {
  maxRetries: number
  strategy: string
  initialDelayMs: number
  maxDelayMs: number
}

export interface Execution {
  id: string
  workflowName: string
  workflowVersion: number
  status: string
  triggerType: string
  triggeredBy: string
  startedAt: string
  completedAt?: string
  durationMs?: number
  context?: Record<string, unknown>
}

/**
 * One entry per failed attempt produced by the execution engine retry loop.
 * Stored on StepExecution.retryAttempts and copied to DlqMessage.retryAttempts
 * via the STEP_DEAD_LETTERED Kafka event.
 */
export interface StepRetryAttempt {
  /** 1-based attempt number (1 = first try, 2 = first retry, …). */
  attemptNumber: number
  errorMessage: string
  failedAt: string
  durationMs?: number
}

export interface StepExecution {
  id: string
  stepId: string
  stepName: string
  stepType: string
  status: string
  output?: unknown
  errorMessage?: string
  startedAt: string
  completedAt?: string
  durationMs?: number
}

export interface ReplayAttempt {
  replayedBy: string
  result: 'SUCCESS' | 'FAILED'
  errorMessage?: string
  replayedAt: string
  /**
   * True when this attempt used a manually edited execution context
   * (ADMIN / dlq:write users only). Shown as an audit badge in replay history.
   */
  contextWasModified?: boolean
}

export interface DlqMessage {
  id: string
  clientId: string
  executionId: string
  workflowId?: string
  workflowName: string
  stepId?: string
  stepName: string
  stepType?: string
  failureReason: string
  stepConfig?: Record<string, unknown>
  executionContext?: Record<string, unknown>
  /**
   * Per-attempt errors from the execution engine's automatic retry loop
   * (populated via the STEP_DEAD_LETTERED Kafka event).
   * Covers every attempt from initial try through final exhausted retry.
   */
  retryAttempts?: StepRetryAttempt[]
  retryCount: number
  /** PENDING | REPLAYING | RESOLVED | DISCARDED */
  status: string
  /** Manual replay attempts triggered from the DLQ console. */
  replayHistory?: ReplayAttempt[]
  failedAt: string
  updatedAt?: string
  payload?: unknown
}

export interface Trigger {
  id: string
  name: string
  sourceType: string
  workflowId?: string
  workflowName: string
  topic?: string
  url?: string
  filterExpression?: string
  condition?: TriggerCondition | null
  payloadMapping?: string
  triggerAction?: 'FIRE_WORKFLOW' | 'RESUME_WAIT'
  resumeTokenPath?: string
  resumeExecutionId?: string
  resumeStepId?: string
  enabled: boolean
  createdAt: string
}

export interface WebhookDelivery {
  id: string
  workflowName: string
  url: string
  status: string
  httpStatus?: number
  attempts: number
  createdAt: string
  lastAttemptAt?: string
  payload?: unknown
  responseBody?: string
}

export interface RateLimit {
  id: string
  workflowName?: string
  maxRequestsPerMinute: number
  maxConcurrentExecutions: number
  scope: 'CLIENT' | 'WORKFLOW'
}

export interface TeamMember {
  id: string
  name: string
  email: string
  roles: string[]
  joinedAt: string
  status: 'ACTIVE' | 'PENDING' | 'INACTIVE'
}

export interface Role {
  id: string
  name: string
  description: string
  permissions: string[]
  memberCount: number
}

export interface ApiKey {
  id: string
  name: string
  keyPrefix: string
  createdAt: string
  lastUsedAt?: string
  expiresAt?: string
  scopes: string[]
}

export interface AuditLog {
  id: string
  action: string
  actor: string
  resource: string
  resourceId: string
  details?: Record<string, unknown>
  timestamp: string
  ipAddress?: string
}

export interface WorkflowVersion {
  version: number
  status: string
  publishedAt?: string
  createdAt: string
  createdBy: string
  changeNote?: string
}

export interface AnalyticsSummary {
  totalWorkflows: number
  executionsToday: number
  failedToday: number
  slaPercentage: number
  executionsByDay: Array<{ date: string; success: number; failed: number }>
  recentExecutions: Execution[]
  activeDlqCount: number
}

export interface HttpCallLog {
  url: string;
  method: string;
  requestHeaders: Record<string, string>;
  requestBody: string;
  responseStatus: number;
  responseHeaders: Record<string, string>;
  responseBody: string;
  durationMs: number;
  success: boolean;
  errorMessage?: string;
}

export interface StepExecutionDetail extends StepExecution {
  input?: Record<string, unknown>;
  attemptNumber?: number;
  httpCallLog?: HttpCallLog;
  resolvedConfig?: Record<string, unknown>;
  totalAttempts?: number;
  waitToken?: string;
  /** Full per-attempt error history from the execution engine retry loop. */
  retryAttempts?: StepRetryAttempt[];
}

export interface ExecutionStats {
  totalSteps: number;
  successSteps: number;
  failedSteps: number;
  skippedSteps: number;
  pendingSteps: number;
  waitingSteps: number;
  totalDurationMs: number;
  totalHttpCalls: number;
  failedHttpCalls: number;
}

export interface ExecutionTraceDto {
  execution: Execution;
  stepExecutions: StepExecutionDetail[];
  workflowDefinition?: {
    steps: StepDef[];
    edges: EdgeDef[];
  };
  executionContext?: Record<string, unknown>;
  stats: ExecutionStats;
}

export interface WaitToken {
  id: string;
  executionId: string;
  clientId: string;
  stepId: string;
  stepName: string;
  token: string;
  status: 'WAITING' | 'RESUMED' | 'TIMED_OUT' | 'CANCELLED';
  resumeData?: Record<string, unknown>;
  resumedBy?: string;
  expiresAt?: string;
  createdAt: string;
  resumedAt?: string;
}

export interface TriggerCondition {
  conditionType: 'ALWAYS' | 'FIELD_EXISTS' | 'FIELD_NOT_EXISTS' | 'FIELD_EQUALS' | 'FIELD_NOT_EQUALS' | 'FIELD_CONTAINS' | 'FIELD_MATCHES' | 'FIELD_GT' | 'FIELD_LT' | 'SPEL_EXPRESSION' | 'AND' | 'OR' | 'NOT';
  fieldPath?: string;
  expectedValue?: string;
  nestedConditions?: TriggerCondition[];
  spelExpression?: string;
  label?: string;
}
