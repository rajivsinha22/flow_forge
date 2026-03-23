# flowforge-gateway

Spring Cloud Gateway — the single entry point for all FlowForge API traffic.

**Port:** `8080`

---

## Responsibilities

- **JWT Validation** — validates every `Authorization: Bearer <token>` header before forwarding to downstream services; rejects with `401` if missing or invalid
- **Tenant Propagation** — extracts `clientId` and `userId` from the JWT and injects them as `X-Client-Id` and `X-User-Id` request headers for downstream services
- **Request Routing** — routes each URL prefix to the correct microservice via Spring Cloud Gateway route definitions
- **CORS** — handles cross-origin requests from the React frontend (`localhost:3000`)

---

## Route Map

| Path prefix | Downstream service | Auth required |
|-------------|--------------------|---------------|
| `POST /api/v1/clients/register` | flowforge-client-service | No |
| `POST /api/v1/clients/login` | flowforge-client-service | No |
| `/api/v1/auth/**` | flowforge-client-service | No |
| `/api/v1/workflows/**` | flowforge-workflow-service | Yes |
| `/api/v1/executions/**` | flowforge-execution-engine | Yes |
| `/api/v1/dlq/**` | flowforge-integration-service | Yes |
| `/api/v1/triggers/**` | flowforge-integration-service | Yes |
| `/api/v1/webhooks/**` | flowforge-integration-service | Yes |
| `/api/v1/users/**` | flowforge-client-service | Yes |
| `/api/v1/roles/**` | flowforge-client-service | Yes |
| `/api/v1/api-keys/**` | flowforge-client-service | Yes |
| `/api/v1/audit-logs/**` | flowforge-client-service | Yes |
| `/api/v1/analytics/**` | flowforge-client-service | Yes |
| `/api/v1/clients/me/**` | flowforge-client-service | Yes |
| `/ws/**` | flowforge-websocket-service | No (WS upgrade) |

---

## Key Classes

| Class | Description |
|-------|-------------|
| `FlowForgeGatewayApplication` | Spring Boot entry point |
| `JwtAuthFilter` | `AbstractGatewayFilterFactory` — validates JWT, injects tenant headers |
| `TenantResolutionFilter` | `GlobalFilter` — stores `clientId` in exchange attributes |
| `RouteConfig` | `@Bean RouteLocator` — declares all route definitions |

---

## Configuration (`application.yml`)

```yaml
server:
  port: 8080

app:
  jwt:
    secret: flowforge-secret-key-change-in-production-must-be-256-bits-long

spring:
  data:
    redis:
      host: localhost
      port: 6379
  cloud:
    gateway:
      globalcors:
        cors-configurations:
          '[/**]':
            allowedOrigins:
              - "http://localhost:3000"
            allowedMethods: [GET, POST, PUT, DELETE, OPTIONS, PATCH]
            allowedHeaders: ["*"]
            allowCredentials: true
```

> The JWT secret **must match** the secret used by `flowforge-client-service` to issue tokens.

---

## Running

```bash
cd flowforge-gateway
mvn spring-boot:run
```

Start the gateway **last**, after all downstream services are up.

---

## Dependencies

- `spring-cloud-starter-gateway`
- `spring-boot-starter-data-redis-reactive` (for future rate-limiting via Redis)
- `jjwt-api / jjwt-impl / jjwt-jackson` — JWT parsing
