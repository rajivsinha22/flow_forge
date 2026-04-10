package com.flowforge.workflow.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
public class TenantFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(TenantFilter.class);

    public static final String CLIENT_ID_HEADER = "X-Client-Id";
    public static final String CLIENT_PLAN_HEADER = "X-Client-Plan";
    public static final String NAMESPACE_HEADER = "X-Namespace";

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
                                    @NonNull HttpServletResponse response,
                                    @NonNull FilterChain filterChain)
            throws ServletException, IOException {
        try {
            String clientId = request.getHeader(CLIENT_ID_HEADER);
            if (StringUtils.hasText(clientId)) {
                TenantContext.setClientId(clientId);
                log.debug("Set tenant context for clientId={}", clientId);
            } else {
                log.debug("No {} header found in request to {}", CLIENT_ID_HEADER, request.getRequestURI());
            }
            String plan = request.getHeader(CLIENT_PLAN_HEADER);
            if (StringUtils.hasText(plan)) {
                TenantContext.setPlan(plan);
                log.debug("Set tenant plan={}", plan);
            }
            String namespace = request.getHeader(NAMESPACE_HEADER);
            if (StringUtils.hasText(namespace)) {
                TenantContext.setNamespace(namespace);
                log.debug("Set tenant namespace={}", namespace);
            }
            filterChain.doFilter(request, response);
        } finally {
            TenantContext.clear();
        }
    }
}
