# flowforge-client-service

Authentication, multi-tenancy, team management, API keys, audit logs, and analytics for FlowForge.

**Port:** `8081`
**Database:** MongoDB — `flowforge_clients`

---

## Responsibilities

- Client (organisation) **registration** and **login** with JWT issuance
- **User management** — invite, deactivate, change roles
- **Role-Based Access Control (RBAC)** — create/edit roles with granular permission sets
- **API key** lifecycle — create, list, revoke (stored as bcrypt hashes)
- **Environment variables** — encrypted key/value store per client
- **Rate limit configuration** — client-level and per-workflow overrides
- **Audit logging** — immutable record of every significant action
- **Analytics** — execution summary and 7-day trend data

---

## API Endpoints

### Auth
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/v1/clients/register` | No | Register new organisation |
| `POST` | `/api/v1/clients/login` | No | Login, returns JWT |
| `POST` | `/api/v1/auth/refresh` | No | Refresh JWT |
| `POST` | `/api/v1/auth/logout` | Yes | Invalidate token (Redis blacklist) |

### Client Settings
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/clients/me` | Get current client profile |
| `PUT` | `/api/v1/clients/me` | Update org name / plan |
| `PUT` | `/api/v1/clients/me/webhook` | Update webhook URL and secret |
| `GET` | `/api/v1/clients/me/env-vars` | List env variables (values masked) |
| `PUT` | `/api/v1/clients/me/env-vars` | Upsert env variable |
| `GET` | `/api/v1/clients/me/rate-limits` | Get rate limit config |
| `PUT` | `/api/v1/clients/me/rate-limits` | Update rate limit config |

### Users
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/users` | List all users in the client |
| `POST` | `/api/v1/users/invite` | Invite a new user |
| `PUT` | `/api/v1/users/:id/roles` | Change a user's role |
| `DELETE` | `/api/v1/users/:id` | Deactivate a user |

### Roles
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/roles` | List roles |
| `POST` | `/api/v1/roles` | Create role |
| `PUT` | `/api/v1/roles/:id` | Update role permissions |
| `DELETE` | `/api/v1/roles/:id` | Delete role |

### API Keys
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/api-keys` | List API keys (prefix + metadata only) |
| `POST` | `/api/v1/api-keys` | Create key — full value shown **once** |
| `DELETE` | `/api/v1/api-keys/:id` | Revoke key |

### Audit & Analytics
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/audit-logs` | Query audit events with filters |
| `GET` | `/api/v1/analytics/summary` | KPI summary for dashboard |
| `GET` | `/api/v1/analytics/execution-trend` | 7-day execution counts |

---

## Key Classes

| Layer | Class | Description |
|-------|-------|-------------|
| Controller | `ClientController` | Registration, login, `/me` endpoints |
| Controller | `UserController` | User invite/deactivate/role-change |
| Controller | `RoleController` | Role CRUD |
| Controller | `ApiKeyController` | API key lifecycle |
| Controller | `AuditController` | Audit log query |
| Controller | `AnalyticsController` | Dashboard analytics |
| Service | `AuthService` | JWT issuance, token refresh, logout |
| Service | `ClientService` | Client profile, webhook, env vars, rate limits |
| Service | `UserService` | User management |
| Service | `RbacService` | Role and permission management |
| Service | `ApiKeyService` | Key hashing (BCrypt), creation, revocation |
| Service | `AuditServiceImpl` | Persists `AuditEvent` to MongoDB |
| Config | `SecurityConfig` | Spring Security — public vs protected paths |
| Config | `JwtAuthenticationFilter` | Validates JWT for non-gateway direct calls |
| Config | `GlobalExceptionHandler` | Maps exceptions to HTTP responses |

---

## Configuration (`application.yml`)

```yaml
server:
  port: 8081

spring:
  data:
    mongodb:
      uri: mongodb://localhost:27017/flowforge_clients
    redis:
      host: localhost
      port: 6379

app:
  jwt:
    secret: flowforge-secret-key-change-in-production-must-be-256-bits-long
    expiration: 86400000   # 24 hours in ms
```

---

## Running

```bash
cd flowforge-client-service
mvn spring-boot:run
```

---

## Dependencies

- `spring-boot-starter-web`
- `spring-boot-starter-security`
- `spring-boot-starter-data-mongodb`
- `spring-boot-starter-data-redis`
- `spring-boot-starter-validation`
- `jjwt-api / jjwt-impl / jjwt-jackson`
- `flowforge-common`
