# flowforge-integration-service

Event triggers, Dead Letter Queue management, outbound webhook delivery, and scheduled (Cron) execution triggering.

**Port:** `8084`
**Database:** MongoDB — `flowforge_integrations`

---

## Responsibilities

- **Event Trigger Management** — configure Kafka and Cron triggers that automatically fire workflow executions
- **Kafka Consumer** — listens for external domain events and matches them to registered triggers, applying optional SpEL filter expressions and payload mappings
- **Quartz Scheduler** — manages cron-based triggers with clustered scheduling support
- **Dead Letter Queue (DLQ)** — stores failed steps, supports single and batch replay, discard
- **Outbound Webhook Delivery** — delivers `execution-events` to client-registered callback URLs with exponential retry and signature (`sha256=`) verification
- **Trigger Activation Logs** — records every trigger evaluation (matched, filtered out, failed)

> **Note:** SNS and inbound Webhook trigger types have been removed. Supported trigger source types are `KAFKA` and `CRON` only.

---

## API Endpoints

### Event Triggers
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/triggers` | List all triggers for the client |
| `POST` | `/api/v1/triggers` | Create a new trigger |
| `PUT` | `/api/v1/triggers/:id` | Update trigger config |
| `DELETE` | `/api/v1/triggers/:id` | Delete trigger |
| `POST` | `/api/v1/triggers/:id/enable` | Enable a paused trigger |
| `POST` | `/api/v1/triggers/:id/disable` | Disable (pause) a trigger |
| `GET` | `/api/v1/triggers/:id/logs` | Recent activation log for a trigger |

### Dead Letter Queue
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/dlq` | List DLQ messages (filterable) |
| `GET` | `/api/v1/dlq/:id` | Get single DLQ message with replay history |
| `POST` | `/api/v1/dlq/:id/replay` | Replay a single message |
| `POST` | `/api/v1/dlq/replay-batch` | Replay all PENDING messages |
| `DELETE` | `/api/v1/dlq/:id` | Discard a DLQ message |

### Webhooks
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/webhooks/deliveries` | List webhook delivery attempts |
| `GET` | `/api/v1/webhooks/deliveries/:id` | Get delivery detail with all attempts |
| `POST` | `/api/v1/webhooks/deliveries/:id/retry` | Manually retry a delivery |
| `GET` | `/api/v1/webhooks/stats` | Aggregate stats — sent, delivered, failed, avg latency |

---

## Key Classes

### Controllers
| Class | Description |
|-------|-------------|
| `TriggerController` | CRUD + enable/disable + activation logs |
| `DlqController` | DLQ management and replay |
| `WebhookController` | Delivery log and manual retry |

### Services
| Class | Description |
|-------|-------------|
| `TriggerService` | Trigger CRUD, evaluates filter expressions |
| `KafkaTriggerConsumer` | Kafka `@KafkaListener` — matches events to active triggers, applies SpEL filter and payload mapping |
| `QuartzSchedulerService` | Add/remove/pause/resume Quartz jobs for CRON triggers |
| `CronTriggerJob` | Quartz `Job` — fires workflow execution when scheduled |
| `DlqReplayService` | Re-submits DLQ messages to the Execution Engine |
| `WebhookDeliveryService` | Sends outbound webhooks with retry and HMAC-SHA256 signature |

### Models
| Class | Collection | Description |
|-------|-----------|-------------|
| `EventTriggerConfig` | `event_triggers` | Trigger definition — source, topic, workflow, filter, payload mapping |
| `TriggerActivationLog` | `trigger_activation_logs` | Per-trigger activation history |
| `DlqMessage` | `dlq_messages` | Failed step waiting for replay |
| `ReplayAttempt` | — (embedded) | History of replay attempts on a DLQ message |
| `WebhookDelivery` | `webhook_deliveries` | Outbound webhook delivery record |
| `DeliveryAttempt` | — (embedded) | Individual HTTP attempt within a delivery |

---

## Trigger Source Types

| Source | Mechanism |
|--------|-----------|
| `KAFKA` | Listens to a configured Kafka topic. When a message arrives and conditions match, a new workflow execution is fired. |
| `CRON` | Quartz Scheduler fires the workflow on a standard 5-part cron expression (UTC). No inbound event needed. |

---

## Trigger Filter Expression

Triggers support an optional **SpEL** filter expression evaluated against the incoming Kafka message payload:

```
${event.status} == 'NEW' && ${event.region} == 'IN'
```

If the expression evaluates to `false`, the event is logged as "filtered out" and no execution is fired. CRON triggers do not use filter expressions.

---

## Outbound Webhook Delivery

> **Different from inbound triggers.** This is FlowForge **calling your system** to notify it when executions complete or fail — not your system calling FlowForge.

### How It Works

When a workflow execution produces a notable event, `KafkaTriggerConsumer` picks it up from the `execution-events` Kafka topic and calls `WebhookDeliveryService`, which POSTs a signed JSON payload to the **Outbound Webhook URL** configured by the client in **Settings → Webhook Configuration**.

```
Workflow Executes
      │
      ▼
Execution Engine publishes to Kafka topic "execution-events"
      │
      ▼
Integration Service (KafkaTriggerConsumer) consumes the event
      │
      ├─ EXECUTION_COMPLETED ──────────────────────┐
      ├─ EXECUTION_FAILED ──────────────────────────┤──▶ WebhookDeliveryService
      └─ STEP_DEAD_LETTERED ───────────────────────┘         │
                                                             ▼
                                             HTTP POST → https://your-app.com/webhooks
                                             Headers:
                                               X-FlowForge-Signature: sha256=<hmac>
                                               X-FlowForge-Event: EXECUTION_COMPLETED
                                               X-FlowForge-Delivery-Id: <uuid>
                                             Body: { event, executionId, workflowName, status, ... }
```

### Settings Fields

| Field (Settings Page) | Purpose |
|-----------------------|---------|
| **Enable Outbound Webhook Delivery** | Toggle that gates all webhook delivery. Delivery is **disabled by default** — no POSTs are sent until you explicitly enable this. Existing orgs after upgrade are unaffected until they turn it on. |
| **Outbound Webhook URL** | The HTTPS endpoint in your system that FlowForge will POST to when executions complete, fail, or a step is dead-lettered. Greyed out while delivery is disabled. |
| **Webhook Secret** | A shared secret stored in your org settings. FlowForge uses it to compute an HMAC-SHA256 signature over the raw request body and sends the result in the `X-FlowForge-Signature` header. Your server verifies this to confirm the POST genuinely came from FlowForge. Greyed out while delivery is disabled. |

### Retry Policy

If your endpoint returns a non-2xx response or is unreachable, FlowForge retries automatically with **exponential backoff**:

| Attempt | Delay before retry |
|---------|--------------------|
| 1st failure | immediate |
| 2nd failure | 60 seconds |
| 3rd failure | 120 seconds |
| 4th failure | 240 seconds |
| 5th failure | 480 seconds |
| After 5th | Marked `FAILED` — no more automatic retries |

Failed deliveries can be **manually retried** from the **Webhook Logs** page (`/reliability/webhooks`) or via `POST /api/v1/webhooks/deliveries/:id/retry`.

### Verifying the Signature in Your App

```js
// Node.js / Express example
const crypto = require('crypto')

app.post('/webhooks', express.raw({ type: 'application/json' }), (req, res) => {
  const receivedSig = req.headers['x-flowforge-signature']     // "sha256=abc123..."
  const expectedSig = 'sha256=' + crypto
    .createHmac('sha256', process.env.FLOWFORGE_WEBHOOK_SECRET)
    .update(req.body)           // raw bytes — must NOT be parsed JSON
    .digest('hex')

  if (receivedSig !== expectedSig) {
    return res.status(401).send('Invalid signature')
  }

  const { event, executionId, workflowName, status } = JSON.parse(req.body)
  // React to the event: update your DB, alert on-call, trigger another system, etc.
  res.status(200).send('ok')
})
```

```python
# Python / Flask example
import hmac, hashlib, os
from flask import Flask, request, abort

app = Flask(__name__)

@app.route('/webhooks', methods=['POST'])
def handle_webhook():
    received_sig = request.headers.get('X-FlowForge-Signature', '')
    secret = os.environ['FLOWFORGE_WEBHOOK_SECRET'].encode()
    expected_sig = 'sha256=' + hmac.new(secret, request.data, hashlib.sha256).hexdigest()

    if not hmac.compare_digest(received_sig, expected_sig):
        abort(401)

    payload = request.get_json()
    print(f"Event: {payload['event']}, Execution: {payload['executionId']}, Status: {payload['status']}")
    return '', 200
```

### Event Payload Shape

```json
{
  "event": "EXECUTION_COMPLETED",
  "executionId": "exec_abc123",
  "workflowName": "order-processing",
  "workflowVersion": 3,
  "clientId": "client_acme_001",
  "status": "SUCCESS",
  "triggeredBy": "kafka-consumer",
  "startedAt": "2026-03-19T10:00:00Z",
  "completedAt": "2026-03-19T10:00:03.2Z",
  "durationMs": 3200
}
```

| `event` value | When fired |
|---------------|-----------|
| `EXECUTION_COMPLETED` | Execution finished — status is `SUCCESS` or `FAILED` |
| `EXECUTION_FAILED` | Execution reached terminal `FAILED` state |
| `STEP_DEAD_LETTERED` | A step exhausted all retries and was moved to the DLQ |

### Key Distinction — Outbound vs Inbound

| | **Outbound Webhook (Settings)** | **Event Trigger (Event Triggers page)** |
|--|--------------------------------|----------------------------------------|
| Direction | FlowForge → Your App | Kafka / Cron → FlowForge |
| Purpose | Notify your system when executions complete or fail | Start a workflow when an external event occurs |
| Who initiates | FlowForge | Kafka message or Quartz schedule |
| Configured in | Settings → Webhook Configuration | Integrations → Event Triggers |
| Signature | FlowForge signs; **your app verifies** | N/A (Kafka and Cron are internal) |

---

## Configuration (`application.yml`)

```yaml
server:
  port: 8084

spring:
  data:
    mongodb:
      uri: mongodb://localhost:27017/flowforge_integrations
  kafka:
    bootstrap-servers: localhost:9092
    consumer:
      group-id: flowforge-integration
  quartz:
    job-store-type: jdbc

flowforge:
  execution-engine:
    url: http://localhost:8081
  client-service:
    url: http://localhost:8082
```

---

## Running

```bash
cd flowforge-integration-service
mvn spring-boot:run
```

---

## Dependencies

- `spring-boot-starter-web`
- `spring-boot-starter-data-mongodb`
- `spring-boot-starter-data-redis`
- `spring-kafka`
- `spring-boot-starter-quartz`
- `spring-boot-starter-webflux` (WebClient for outbound webhooks)
- `flowforge-common`
