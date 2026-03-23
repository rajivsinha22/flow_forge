# flowforge-common

Shared library used as a compile-time dependency by all FlowForge microservices. Contains no Spring Boot application — it is a plain JAR.

---

## Contents

### Models (`com.flowforge.common.model`)

MongoDB document classes shared across services:

| Class | Collection | Description |
|-------|-----------|-------------|
| `Client` | `clients` | Registered organisation — name, plan, webhook config |
| `ClientUser` | `client_users` | User belonging to a client — email, passwordHash, roles, status |
| `Role` | `roles` | Named role with a list of permission strings |
| `ApiKey` | `api_keys` | Hashed API key with prefix, created/last-used timestamps |
| `EnvVariable` | `env_variables` | Encrypted environment variable scoped to a client |

All model classes include: no-arg constructor, all-args constructor, full getters/setters, `equals`, `hashCode`, `toString`, and a static inner `Builder` class.

### Response Wrappers (`com.flowforge.common.response`)

| Class | Description |
|-------|-------------|
| `ApiResponse<T>` | Standard success/error envelope — `{ success, data, message, timestamp }`. Static factories: `ApiResponse.success(data)`, `ApiResponse.error(message)` |
| `ApiErrorResponse` | Error detail envelope — `{ code, message, details, timestamp }`. Static factories: `ApiErrorResponse.of(code, message)` |

### Exceptions (`com.flowforge.common.exception`)

| Class | HTTP mapping | Code |
|-------|-------------|------|
| `WorkflowBaseException` | Base class | — |
| `WorkflowValidationException` | `400` | `VALIDATION_ERROR` |
| `ResourceNotFoundException` | `404` | `RESOURCE_NOT_FOUND` |
| `UnauthorizedException` | `401` | `UNAUTHORIZED` |

### Security (`com.flowforge.common.security`)

| Class | Description |
|-------|-------------|
| `JwtUtil` | Creates and validates HS256 JWTs. Constructor takes `secret` and `expirationMs`. Methods: `generateToken`, `validateToken`, `extractClaims`, `extractClientId`, `extractUserId` |
| `TenantContext` | `ThreadLocal`-based holder for `clientId`, `userId`, and `roles` — populated by each service's tenant filter from the `X-Client-Id` / `X-User-Id` headers injected by the gateway |

### Audit (`com.flowforge.common.audit`)

| Class | Description |
|-------|-------------|
| `AuditEvent` | MongoDB document — `clientId`, `actor`, `action`, `details` (Map), `timestamp` |
| `AuditService` | Interface — `logEvent(clientId, actor, action, details)` |

---

## Usage

Add to any service's `pom.xml`:

```xml
<dependency>
    <groupId>com.flowforge</groupId>
    <artifactId>flowforge-common</artifactId>
    <version>1.0.0</version>
</dependency>
```

---

## Building

```bash
cd flowforge-common
mvn clean install
```

The JAR is installed to the local Maven repository and picked up automatically by sibling modules.

---

## Dependencies

- `spring-boot-starter-data-mongodb` — for `@Document` / `@Id` annotations on models
- `jjwt-api / jjwt-impl / jjwt-jackson` — JWT support in `JwtUtil`
