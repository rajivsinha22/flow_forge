package com.flowforge.gateway.config;

import com.flowforge.gateway.filter.JwtAuthFilter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.gateway.route.RouteLocator;
import org.springframework.cloud.gateway.route.builder.RouteLocatorBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RouteConfig {

    private final JwtAuthFilter jwtAuthFilter;

    // Direct service URLs — no Eureka / service-registry required for local dev.
    // Override in application.yml under the `services.*` keys.
    @Value("${services.client}")
    private String clientServiceUrl;

    @Value("${services.workflow}")
    private String workflowServiceUrl;

    @Value("${services.execution}")
    private String executionServiceUrl;

    @Value("${services.integration}")
    private String integrationServiceUrl;

    @Value("${services.websocket}")
    private String websocketServiceUrl;

    @Value("${services.billing}")
    private String billingServiceUrl;

    public RouteConfig(JwtAuthFilter jwtAuthFilter) {
        this.jwtAuthFilter = jwtAuthFilter;
    }

    @Bean
    public RouteLocator routeLocator(RouteLocatorBuilder builder) {
        return builder.routes()

                // ── PUBLIC AUTH ROUTES (no JWT required) ──────────────────────────────
                .route("client-register", r -> r
                        .path("/api/v1/clients/register")
                        .uri(clientServiceUrl))

                .route("client-login", r -> r
                        .path("/api/v1/clients/login")
                        .uri(clientServiceUrl))

                // Invite validation and acceptance — public (no JWT)
                .route("invite-validate", r -> r
                        .path("/api/v1/auth/invite/**")
                        .uri(clientServiceUrl))

                .route("accept-invite", r -> r
                        .path("/api/v1/auth/accept-invite")
                        .uri(clientServiceUrl))

                // Token refresh + logout live under /api/v1/auth/**
                .route("auth-routes", r -> r
                        .path("/api/v1/auth/**")
                        .uri(clientServiceUrl))

                // ── WORKFLOW SERVICE ───────────────────────────────────────────────────
                // Auto-generated workflow documentation (GenAI) — workflow-service
                .route("workflow-docs-routes", r -> r
                        .path("/api/v1/workflows/*/docs/**", "/api/v1/workflows/*/docs")
                        .filters(f -> f.filter(jwtAuthFilter.apply(new JwtAuthFilter.Config())))
                        .uri(workflowServiceUrl))

                // Workflow optimizer (GenAI) — execution-engine
                // Must be declared BEFORE the generic /api/v1/workflows/** route so it wins.
                .route("workflow-optimize-routes", r -> r
                        .path("/api/v1/workflows/*/optimize")
                        .filters(f -> f.filter(jwtAuthFilter.apply(new JwtAuthFilter.Config())))
                        .uri(executionServiceUrl))

                .route("workflow-routes", r -> r
                        .path("/api/v1/workflows/**")
                        .filters(f -> f.filter(jwtAuthFilter.apply(new JwtAuthFilter.Config())))
                        .uri(workflowServiceUrl))

                // ── EXECUTION ENGINE ───────────────────────────────────────────────────
                .route("execution-routes", r -> r
                        .path("/api/v1/executions/**")
                        .filters(f -> f.filter(jwtAuthFilter.apply(new JwtAuthFilter.Config())))
                        .uri(executionServiceUrl))

                // AI chat assistant (GenAI) — execution-engine
                .route("ai-chat-routes", r -> r
                        .path("/api/v1/ai/chat/**")
                        .filters(f -> f.filter(jwtAuthFilter.apply(new JwtAuthFilter.Config())))
                        .uri(executionServiceUrl))

                // ── INTEGRATION SERVICE (Failed Workflows, Triggers, Webhooks) ────────
                .route("failed-workflow-routes", r -> r
                        .path("/api/v1/failed-workflows/**")
                        .filters(f -> f.filter(jwtAuthFilter.apply(new JwtAuthFilter.Config())))
                        .uri(integrationServiceUrl))

                .route("trigger-routes", r -> r
                        .path("/api/v1/triggers/**")
                        .filters(f -> f.filter(jwtAuthFilter.apply(new JwtAuthFilter.Config())))
                        .uri(integrationServiceUrl))

                .route("webhook-routes", r -> r
                        .path("/api/v1/webhooks/**")
                        .filters(f -> f.filter(jwtAuthFilter.apply(new JwtAuthFilter.Config())))
                        .uri(integrationServiceUrl))

                // ── CLIENT SERVICE (protected management routes) ───────────────────────
                .route("user-routes", r -> r
                        .path("/api/v1/users/**")
                        .filters(f -> f.filter(jwtAuthFilter.apply(new JwtAuthFilter.Config())))
                        .uri(clientServiceUrl))

                .route("role-routes", r -> r
                        .path("/api/v1/roles/**")
                        .filters(f -> f.filter(jwtAuthFilter.apply(new JwtAuthFilter.Config())))
                        .uri(clientServiceUrl))

                .route("api-key-routes", r -> r
                        .path("/api/v1/api-keys/**")
                        .filters(f -> f.filter(jwtAuthFilter.apply(new JwtAuthFilter.Config())))
                        .uri(clientServiceUrl))

                .route("audit-routes", r -> r
                        .path("/api/v1/audit-logs/**")
                        .filters(f -> f.filter(jwtAuthFilter.apply(new JwtAuthFilter.Config())))
                        .uri(clientServiceUrl))

                .route("analytics-routes", r -> r
                        .path("/api/v1/analytics/**")
                        .filters(f -> f.filter(jwtAuthFilter.apply(new JwtAuthFilter.Config())))
                        .uri(clientServiceUrl))

                .route("clients-me-routes", r -> r
                        .path("/api/v1/clients/me/**", "/api/v1/clients/me")
                        .filters(f -> f.filter(jwtAuthFilter.apply(new JwtAuthFilter.Config())))
                        .uri(clientServiceUrl))

                .route("namespace-routes", r -> r
                        .path("/api/v1/namespaces/**")
                        .filters(f -> f.filter(jwtAuthFilter.apply(new JwtAuthFilter.Config())))
                        .uri(clientServiceUrl))

                // ── WEBSOCKET SERVICE ──────────────────────────────────────────────────
                .route("websocket-routes", r -> r
                        .path("/ws/**")
                        .uri(websocketServiceUrl))

                // ── BILLING SERVICE ────────────────────────────────────────────────────
                // Stripe webhook — no JWT required (verified by Stripe signature)
                .route("billing-stripe-webhook", r -> r
                        .path("/api/v1/billing/stripe/webhook")
                        .uri(billingServiceUrl))

                // All other billing routes — JWT required
                .route("billing-routes", r -> r
                        .path("/api/v1/billing/**")
                        .filters(f -> f.filter(jwtAuthFilter.apply(new JwtAuthFilter.Config())))
                        .uri(billingServiceUrl))

                .build();
    }
}
