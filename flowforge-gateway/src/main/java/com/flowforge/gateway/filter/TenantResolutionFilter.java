package com.flowforge.gateway.filter;

import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

@Component
public class TenantResolutionFilter implements GlobalFilter, Ordered {

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        ServerHttpRequest request = exchange.getRequest();
        String clientId = request.getHeaders().getFirst("X-Client-Id");

        if (clientId != null && !clientId.isEmpty()) {
            // Log or store tenant info in exchange attributes for downstream use
            exchange.getAttributes().put("tenantClientId", clientId);
        }

        return chain.filter(exchange);
    }

    @Override
    public int getOrder() {
        // Run after JwtAuthFilter has set X-Client-Id
        return Ordered.LOWEST_PRECEDENCE - 10;
    }
}
