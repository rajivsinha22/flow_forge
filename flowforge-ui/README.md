# flowforge-ui

React 18 single-page application — the visual front-end for FlowForge.

**Dev server port:** `3000`
**API proxy target:** `http://localhost:8080` (Gateway)
**WebSocket proxy target:** `ws://localhost:8085`

---

## Tech Stack

| Technology | Purpose |
|-----------|---------|
| React 18 + TypeScript | UI framework |
| Vite 5 | Build tool and dev server |
| React Router DOM v6 | Client-side routing |
| @xyflow/react (React Flow) | Visual workflow designer canvas |
| Zustand | Global state management |
| Axios | HTTP client (with JWT interceptor) |
| Tailwind CSS | Utility-first styling |
| Recharts | Dashboard charts |
| SockJS + @stomp/stompjs | WebSocket real-time connection |
| Lucide React | Icon library |
| date-fns | Date formatting |

---

## Getting Started

```bash
cd flowforge-ui
npm install
npm run dev        # starts on http://localhost:3000
npm run build      # production build → dist/
npm run preview    # preview production build
```

---

## Pages

| Route | Page | Description |
|-------|------|-------------|
| `/` | `Landing` | Marketing page with features and pricing |
| `/login` | `Login` | Email/password login, JWT stored in localStorage |
| `/register` | `Register` | Organisation registration with plan selection |
| `/dashboard` | `Dashboard` | KPI cards, 7-day execution trend chart, quick actions |
| `/workflows` | `WorkflowList` | All workflows — search, filter, create, clone, delete |
| `/workflows/:id/designer` | `WorkflowDesigner` | **Visual DAG designer** — drag-drop canvas, step config panel |
| `/workflows/:name/versions` | `WorkflowVersions` | Version history with rollback |
| `/executions` | `ExecutionList` | All executions — filter by status/trigger/date, bulk retry |
| `/executions/:id` | `ExecutionDetail` | **Live step trace** powered by WebSocket |
| `/reliability/dlq` | `DlqConsole` | Dead Letter Queue — inspect, replay, discard |
| `/reliability/webhooks` | `WebhookLogs` | Outbound webhook delivery logs |
| `/integrations/triggers` | `EventTriggers` | Create/manage Kafka and Cron triggers |
| `/integrations/rate-limits` | `RateLimits` | Client-level and per-workflow rate limit config |
| `/team` | `TeamManagement` | Users tab + Roles tab with permissions editor |
| `/developer` | `DeveloperPortal` | API reference, SDK downloads, API keys, sandbox |
| `/settings/audit` | `AuditLogs` | Immutable audit trail with CSV export |
| `/settings` | `Settings` | Org profile, webhook config, env variables |

---

## Project Structure

```
src/
├── main.tsx                  # React entry point
├── App.tsx                   # Router — public + protected routes
├── index.css                 # Tailwind directives
│
├── api/                      # Axios wrappers (one file per domain)
│   ├── axios.ts              # Axios instance + JWT interceptor + 401 redirect
│   ├── auth.ts
│   ├── workflows.ts
│   ├── executions.ts
│   ├── dlq.ts
│   ├── triggers.ts
│   ├── webhooks.ts
│   ├── ai.ts                 # analyzeExecution — AI Execution Analyst
│   ├── team.ts
│   └── settings.ts
│
├── store/                    # Zustand stores
│   ├── authStore.ts          # User, JWT, login/logout actions
│   └── workflowStore.ts      # Canvas nodes, edges, undo/redo history
│
├── types/
│   └── index.ts              # All shared TypeScript interfaces
│
├── hooks/
│   ├── useExecutionMonitor.ts  # STOMP WebSocket → live step updates
│   └── useRateLimitStatus.ts   # Polls /rate-limits every 5s
│
├── components/
│   ├── layout/
│   │   ├── AppLayout.tsx     # Auth guard + sidebar + Outlet
│   │   └── Sidebar.tsx       # Navigation with active route highlighting
│   │
│   ├── canvas/               # Workflow designer components
│   │   ├── StepNode.tsx      # Custom React Flow node (type-coloured header)
│   │   ├── StepPalette.tsx   # Draggable step type list (left panel)
│   │   └── StepConfigPanel.tsx  # Step config form (right panel, per type)
│   │
│   └── shared/
│       ├── StatusBadge.tsx   # Coloured status pill (SUCCESS/RUNNING/FAILED…)
│       ├── MetricCard.tsx    # KPI tile with optional trend indicator
│       ├── ConfirmModal.tsx  # Reusable destructive-action modal
│       ├── JsonViewer.tsx    # Collapsible JSON tree
│       └── Spinner.tsx       # Loading spinner
│
└── pages/                    # One file per route
    ├── Landing.tsx
    ├── Login.tsx
    ├── Register.tsx
    ├── Dashboard.tsx
    ├── WorkflowList.tsx
    ├── WorkflowDesigner.tsx
    ├── WorkflowVersions.tsx
    ├── ExecutionList.tsx
    ├── ExecutionDetail.tsx
    ├── DlqConsole.tsx
    ├── EventTriggers.tsx
    ├── WebhookLogs.tsx
    ├── RateLimits.tsx
    ├── TeamManagement.tsx
    ├── DeveloperPortal.tsx
    ├── AuditLogs.tsx
    └── Settings.tsx
```

---

## Authentication

- JWT is stored in `localStorage` as `ff_token`
- The Axios interceptor automatically attaches `Authorization: Bearer <token>` to every request
- A `401` response clears the token and redirects to `/login`
- `AppLayout` checks `authStore.isAuthenticated` — unauthenticated users are redirected to `/login`

---

## Workflow Designer

The visual designer (`WorkflowDesigner.tsx`) uses `@xyflow/react`:

- **Left panel** — `StepPalette` with draggable step type cards
- **Canvas** — React Flow with custom `StepNode` components; edges labelled SUCCESS/FAILURE
- **Right panel** — `StepConfigPanel` slides in on node click, shows type-specific form fields
- **Toolbar** — Validate, Save Draft, Publish (requires change log), Test Run, Undo, Redo
- State is managed in `workflowStore` with full undo/redo history

### Step type colours

| Type | Colour |
|------|--------|
| HTTP | Blue |
| CONDITION | Purple |
| LOOP | Orange |
| DELAY | Gray |
| SCRIPT | Green |
| NOTIFY | Yellow |
| SUB_WORKFLOW | Teal |
| AI_CALL | Indigo |

---

## Settings — Webhook Configuration

The **Settings page** (`/settings`) has an **Outbound Webhook** section with three fields:

| Field | Purpose |
|-------|---------|
| **Enable Outbound Webhook Delivery** | Toggle that activates delivery. **Off by default.** Until enabled, no POSTs are ever sent — the URL and secret are saved but ignored. |
| **Outbound Webhook URL** | An HTTPS endpoint in your own system. FlowForge will `POST` to this URL whenever an execution completes, fails, or a step is dead-lettered. Greyed out while delivery is disabled. |
| **Webhook Secret** | A shared secret. FlowForge signs every POST body with `HMAC-SHA256(secret, rawBody)` and sends the result as `X-FlowForge-Signature: sha256=<hex>`. Your server verifies this header to confirm the request genuinely came from FlowForge. Greyed out while delivery is disabled. |

This is **outbound** — FlowForge calls you. It is completely separate from **Event Triggers** (Kafka/Cron), which are inbound — external events calling into FlowForge.

See [`flowforge-integration-service/README.md`](../flowforge-integration-service/README.md#outbound-webhook-delivery) for the full payload shape, retry schedule, and receiver code examples.

---

## Real-Time Execution Trace

`useExecutionMonitor(executionId)` connects via SockJS + STOMP to:
```
ws://localhost:8085/ws  →  subscribe /topic/executions/{executionId}
```
Step rows animate in as events arrive. Connection status is shown in the UI.

---

## Environment / Proxy Config

The Vite dev server proxies:

```typescript
// vite.config.ts
proxy: {
  '/api': { target: 'http://localhost:8080', changeOrigin: true },
  '/ws':  { target: 'ws://localhost:8085',  ws: true }
}
```

No CORS headers are needed in development. For production, point the proxy targets at your Gateway and WebSocket service URLs.
