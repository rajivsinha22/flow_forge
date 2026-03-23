# flowforge-execution-engine

Workflow execution orchestration — runs step workers, manages execution state, handles retries, and publishes execution events to Kafka.

**Port:** `8083`
**Database:** MongoDB — `flowforge_executions`

---

## Responsibilities

- **Trigger** workflow executions from REST API, cron, or Kafka events
- **Orchestrate** step execution in DAG order — resolves dependencies, fans out parallel branches
- Execute all **8 step types** via a pluggable `StepExecutor` strategy interface (includes `AI_CALL`)
- **Retry** failed steps according to the step's `RetryPolicy` (fixed or exponential backoff)
- Hand failed steps off to the **Dead Letter Queue** (publishes a Kafka event consumed by the Integration Service)
- **Pause / Resume / Cancel** in-flight executions
- Publish `STEP_STARTED`, `STEP_COMPLETED`, `STEP_FAILED`, `EXECUTION_COMPLETED`, `EXECUTION_FAILED` events to Kafka topic `execution-events`
- Resolve dynamic **context variables** — `${steps.stepId.output.field}`, `${input.field}`, `${env.VAR_NAME}`

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/executions` | List executions (filterable by workflow, status, date) |
| `POST` | `/api/v1/workflows/:id/trigger` | Trigger a new execution |
| `GET` | `/api/v1/executions/:id` | Get full execution with all step results |
| `POST` | `/api/v1/executions/:id/analyze` | AI Execution Analyst — Claude diagnoses a FAILED execution |
| `POST` | `/api/v1/executions/:id/pause` | Pause a running execution |
| `POST` | `/api/v1/executions/:id/resume` | Resume a paused execution |
| `POST` | `/api/v1/executions/:id/retry` | Retry a failed execution from its last failed step |
| `POST` | `/api/v1/executions/:id/cancel` | Cancel a running execution |

---

## Key Classes

### Engine

| Class | Description |
|-------|-------------|
| `WorkflowOrchestrator` | Main orchestration loop — loads definition, iterates steps, manages execution lifecycle |
| `ContextResolver` | Resolves `${...}` expressions in step configs against the live `ExecutionContext` |
| `ExecutionContext` | Holds current execution state — input payload, step outputs, variables |
| `StepExecutionResult` | Immutable result of one step — status, output, errorMessage, durationMs |
| `WorkflowDefinitionLoader` | Fetches the workflow definition from the Workflow Service via HTTP |

### Step Executors

| Class | Step Type |
|-------|-----------|
| `HttpStepExecutor` | Performs outbound HTTP calls using Spring `WebClient` |
| `ConditionStepExecutor` | Evaluates a SpEL expression and selects the next step branch |
| `LoopStepExecutor` | Iterates a list in context, spawning sub-executions per item |
| `DelayStepExecutor` | Sleeps the execution thread for the configured duration |
| `ScriptStepExecutor` | Runs a sandboxed script (Groovy) |
| `NotifyStepExecutor` | Sends email or Slack notification |
| `SubWorkflowExecutor` | Triggers a child execution and waits for its completion |
| `AiStepExecutor` | Calls the Anthropic Claude API with a dynamic prompt built from execution context |
| `StepExecutor` | Interface — `StepExecutionResult execute(StepDef step, ExecutionContext ctx)` |

### Models

| Class | Collection | Description |
|-------|-----------|-------------|
| `WorkflowExecution` | `workflow_executions` | Top-level execution record — status, input, trigger metadata |
| `StepExecution` | `step_executions` | Individual step result — linked to parent `WorkflowExecution` |
| `WorkflowDefinitionSnapshot` | — | In-memory copy of the workflow definition at trigger time |

### Infrastructure

| Class | Description |
|-------|-------------|
| `ExecutionEventPublisher` | Kafka producer — publishes typed events to `execution-events` topic |
| `KafkaConfig` | Producer factory configuration |
| `TenantFilter` | Populates `TenantContext` from `X-Client-Id` / `X-User-Id` headers |
| `AiAnalysisService` | Calls Claude to analyze a failed execution and return `AiAnalysisResult` |
| `AiAnalysisController` | `POST /executions/:id/analyze` — invokes `AiAnalysisService`, guards on FAILED status |

---

## Execution Lifecycle

```
PENDING → RUNNING → SUCCESS
                 ↘ FAILED  → (DLQ if retries exhausted)
                 ↘ PAUSED  → RUNNING (on resume)
                 ↘ CANCELLED
```

---

## Retry Policy

Each step can define its own `RetryPolicy`:

```json
{
  "maxRetries": 3,
  "strategy": "EXPONENTIAL",
  "initialDelayMs": 1000,
  "maxDelayMs": 30000
}
```

After `maxRetries` failures, the step is moved to the Dead Letter Queue.

---

## Kafka Events Published

| Event type | Trigger |
|------------|---------|
| `EXECUTION_STARTED` | Execution begins |
| `STEP_STARTED` | Step begins |
| `STEP_COMPLETED` | Step succeeds |
| `STEP_FAILED` | Step fails (retrying) |
| `STEP_DEAD_LETTERED` | Step exhausts retries → DLQ |
| `EXECUTION_COMPLETED` | All steps succeed |
| `EXECUTION_FAILED` | Execution fails terminally |
| `EXECUTION_PAUSED` | Execution paused |
| `EXECUTION_CANCELLED` | Execution cancelled |

Topic: `execution-events`
Consumed by: `flowforge-integration-service` and `flowforge-websocket-service`

---

## Configuration (`application.yml`)

```yaml
server:
  port: 8083

spring:
  data:
    mongodb:
      uri: mongodb://localhost:27017/flowforge_executions
    redis:
      host: localhost
      port: 6379
  kafka:
    bootstrap-servers: localhost:9092

flowforge:
  workflow-service:
    url: http://localhost:8082
```

---

## Running

```bash
cd flowforge-execution-engine
mvn spring-boot:run
```

---

## Dependencies

- `spring-boot-starter-web`
- `spring-boot-starter-data-mongodb`
- `spring-boot-starter-data-redis`
- `spring-kafka`
- `spring-boot-starter-webflux` (WebClient for HTTP step executor)
- `flowforge-common`
