package com.flowforge.client.config;

import com.flowforge.common.security.JwtUtil;
import com.flowforge.common.security.TenantContext;
import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(JwtAuthenticationFilter.class);

    @Value("${app.jwt.secret}")
    private String jwtSecret;

    @Value("${app.jwt.expiration:86400000}")
    private long jwtExpiration;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        try {
            String token = extractToken(request);

            if (token != null) {
                JwtUtil jwtUtil = new JwtUtil(jwtSecret, jwtExpiration);

                if (jwtUtil.validateToken(token)) {
                    Claims claims = jwtUtil.extractClaims(token);
                    String userId = claims.get("userId", String.class);
                    String clientId = claims.get("clientId", String.class);

                    // Try to get roles from JWT claims
                    Object rolesObj = claims.get("roles");
                    List<String> roles = new ArrayList<>();
                    if (rolesObj instanceof List<?> roleList) {
                        roles = roleList.stream()
                                .map(Object::toString)
                                .collect(Collectors.toList());
                    }

                    // Also check headers set by gateway
                    String headerClientId = request.getHeader("X-Client-Id");
                    String headerUserId = request.getHeader("X-User-Id");

                    if (headerClientId != null) clientId = headerClientId;
                    if (headerUserId != null) userId = headerUserId;

                    // Set tenant context
                    TenantContext.setClientId(clientId);
                    TenantContext.setUserId(userId);
                    TenantContext.setRoles(roles);

                    // Build Spring Security authentication
                    List<SimpleGrantedAuthority> authorities = roles.stream()
                            .map(r -> new SimpleGrantedAuthority("ROLE_" + r))
                            .collect(Collectors.toList());

                    UsernamePasswordAuthenticationToken authentication =
                            new UsernamePasswordAuthenticationToken(userId, null, authorities);
                    SecurityContextHolder.getContext().setAuthentication(authentication);
                }
            } else {
                // Check if headers were set directly by gateway (for API key auth)
                String headerClientId = request.getHeader("X-Client-Id");
                String headerUserId = request.getHeader("X-User-Id");

                if (headerClientId != null && !headerClientId.isEmpty()) {
                    TenantContext.setClientId(headerClientId);
                    TenantContext.setUserId(headerUserId);
                }
            }
        } catch (Exception e) {
            log.warn("Could not authenticate user: {}", e.getMessage());
        } finally {
            filterChain.doFilter(request, response);
            TenantContext.clear();
        }
    }

    private String extractToken(HttpServletRequest request) {
        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            return authHeader.substring(7);
        }
        return null;
    }
}
