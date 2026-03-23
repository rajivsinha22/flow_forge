# flowforge-workflow-service

Workflow definition management — CRUD, versioning, validation, publish, and rollback.

**Port:** `8082`
**Database:** MongoDB — `flowforge_workflows`

---

## Responsibilities

- Create and manage **workflow definitions** as directed acyclic graphs (DAGs)
- Maintain a full **version history** — every publish creates an immutable versioned snapshot
- **Validate** workflow graphs at design time (no orphan nodes, valid step configs, no cycles)
- **Publish** a draft workflow to make it active
- **Rollback** to any previous version
- **Clone** an existing workflow as a new draft
- Provide workflow definitions to the Execution Engine on demand

---

## Workflow Step Types

| Type | Description |
|------|-------------|
| `HTTP` | Outbound HTTP call with method, URL, headers, body |
| `CONDITION` | Branch on a SpEL expression — routes to `onSuccess` or `onFailure` next step |
| `LOOP` | Iterate over a list extracted from context |
| `DELAY` | Pause execution for a fixed duration |
| `SCRIPT` | Execute a Groovy/JS script in a sandboxed engine |
| `NOTIFY` | Send email or Slack message using a template |
| `SUB_WORKFLOW` | Invoke another published workflow as a child execution |

---

## API Endpoints

### Workflows

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/workflows` | List workflows for the client (paginated) |
| `POST` | `/api/v1/workflows` | Create new workflow (starts as DRAFT v1) |
| `GET` | `/api/v1/workflows/:id` | Get workflow definition (includes resolved schema JSON) |
| `PUT` | `/api/v1/workflows/:id` | Update draft workflow |
| `DELETE` | `/api/v1/workflows/:id` | Delete workflow |
| `POST` | `/api/v1/workflows/:id/publish` | Publish draft — requires `changeLog` body |
| `POST` | `/api/v1/workflows/:id/rollback` | Rollback to a specific version |
| `POST` | `/api/v1/workflows/:id/clone` | Clone as new draft |
| `GET` | `/api/v1/workflows/:name/versions` | Get full version history |
| `POST` | `/api/v1/workflows/:id/validate` | Run design-time validation, returns issues |

### Data Models

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/models` | List all data models for the org (`?activeOnly=true`) |
| `POST` | `/api/v1/models` | Create a new data model |
| `GET` | `/api/v1/models/:id` | Get data model by ID |
| `PUT` | `/api/v1/models/:id` | Update data model |
| `DELETE` | `/api/v1/models/:id` | Delete data model |
| `POST` | `/api/v1/models/:id/validate` | Test a payload against the model's schema |

---

## Key Classes

| Layer | Class | Description |
|-------|-------|-------------|
| Controller | `WorkflowController` | All workflow endpoints |
| Service | `WorkflowService` | Core CRUD, publish, rollback, clone logic |
| Service | `WorkflowVersionService` | Version history management |
| Service | `WorkflowValidationService` | DAG integrity checks — cycles, orphan nodes, missing configs |
| Model | `WorkflowDefinition` | MongoDB document — steps, edges, variables, trigger type, status, version, inputModelId, outputModelId, errorHandlingConfig |
| Model | `DataModel` | Named JSON Schema Draft-07 model owned by an org |
| Model | `ErrorHandlingConfig` | Defines failure behaviour: FAIL_FAST / CONTINUE / CUSTOM_RESPONSE |
| Service | `DataModelService` | CRUD + schema validation using `networknt/json-schema-validator` |
| Controller | `DataModelController` | REST endpoints for data model management |
| Model | `StepDef` | Individual step — stepId, type, config map, retry policy, success/failure routing |
| Model | `EdgeDef` | Directed edge between two steps |
| Model | `RetryPolicy` | maxRetries, strategy (FIXED/EXPONENTIAL), initialDelayMs, maxDelayMs |
| Repository | `WorkflowDefinitionRepository` | Spring Data MongoDB repository |
| Config | `TenantFilter` | Populates `TenantContext` from `X-Client-Id` header |

---

## Workflow Status Lifecycle

```
DRAFT  ──[publish]──►  PUBLISHED (ACTIVE)
                              │
                        [new draft]
                              │
                              ▼
                         DRAFT (v+1)
                              │
                        [rollback]
                              │
                              ▼
                   previous version → ACTIVE
                   current version  → DEPRECATED
```

---

## Configuration (`application.yml`)

```yaml
server:
  port: 8082

spring:
  data:
    mongodb:
      uri: mongodb://localhost:27017/flowforge_workflows
  kafka:
    bootstrap-servers: localhost:9092
```

---

## Running

```bash
cd flowforge-workflow-service
mvn spring-boot:run
```

---

## Dependencies

- `spring-boot-starter-web`
- `spring-boot-starter-data-mongodb`
- `spring-boot-starter-validation`
- `spring-kafka`
- `flowforge-common`
