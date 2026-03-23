# flowforge-websocket-service

Real-time WebSocket relay — consumes execution events from Kafka and broadcasts them to connected browser clients over STOMP/SockJS.

**Port:** `8085`

---

## Responsibilities

- Maintains **STOMP over SockJS** WebSocket connections with the React frontend
- Subscribes to the `execution-events` Kafka topic as a consumer
- **Relays** each execution event to the matching STOMP destination so browser clients receive live step updates without polling
- Relays **DLQ events** to a client-scoped topic for the DLQ console badge count

---

## WebSocket Topics

| STOMP destination | Payload | Use case |
|-------------------|---------|----------|
| `/topic/executions/:executionId` | `ExecutionEvent` (JSON) | Live step trace on the Execution Detail page |
| `/topic/dlq/:clientId` | DLQ event (JSON) | Badge count updates on the DLQ Console |

### Connecting from the browser (SockJS + STOMP)

```typescript
import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';

const client = new Client({
  webSocketFactory: () => new SockJS('http://localhost:8085/ws'),
  onConnect: () => {
    client.subscribe(`/topic/executions/${executionId}`, (msg) => {
      const event = JSON.parse(msg.body);
      // update step timeline in real-time
    });
  }
});
client.activate();
```

---

## Kafka Event Flow

```
Execution Engine ──publishes──► Kafka topic: execution-events
                                        │
                            WebSocket Service consumes
                                        │
                           ┌────────────▼─────────────┐
                           │  ExecutionEventRelay      │
                           │  matches executionId      │
                           │  broadcasts to STOMP      │
                           └───────────────────────────┘
                                        │
                            Browser client receives update
                            and re-renders step timeline
```

---

## Key Classes

| Class | Description |
|-------|-------------|
| `FlowForgeWebSocketApplication` | Spring Boot entry point |
| `WebSocketConfig` | Configures STOMP message broker, SockJS endpoint at `/ws`, application destination prefix `/app` |
| `ExecutionEventRelay` | `@KafkaListener` on `execution-events` topic — converts Kafka message to STOMP broadcast on `/topic/executions/{id}` |
| `DlqEventRelay` | `@KafkaListener` filtering DLQ events — broadcasts to `/topic/dlq/{clientId}` |
| `ExecutionEvent` | DTO — `eventType`, `executionId`, `clientId`, `stepId`, `stepName`, `status`, `output`, `errorMessage`, `timestamp` |
| `KafkaConfig` | Consumer factory for `execution-events` topic |

---

## Event Types Relayed

| `eventType` | Sent when |
|-------------|-----------|
| `EXECUTION_STARTED` | Execution begins |
| `STEP_STARTED` | A step begins executing |
| `STEP_COMPLETED` | A step completes successfully |
| `STEP_FAILED` | A step fails (may still retry) |
| `STEP_DEAD_LETTERED` | Step exhausted retries — moved to DLQ |
| `EXECUTION_COMPLETED` | All steps complete |
| `EXECUTION_FAILED` | Execution failed terminally |
| `EXECUTION_PAUSED` | Execution paused |
| `EXECUTION_CANCELLED` | Execution cancelled |

---

## Configuration (`application.yml`)

```yaml
server:
  port: 8085

spring:
  kafka:
    bootstrap-servers: localhost:9092
    consumer:
      group-id: flowforge-websocket
      auto-offset-reset: earliest
  data:
    redis:
      host: localhost
      port: 6379
```

---

## Running

```bash
cd flowforge-websocket-service
mvn spring-boot:run
```

---

## Dependencies

- `spring-boot-starter-websocket`
- `spring-kafka`
- `spring-boot-starter-data-redis`
- `flowforge-common`
