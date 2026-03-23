package com.flowforge.execution.executor;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.flowforge.execution.engine.ContextResolver;
import com.flowforge.execution.engine.ExecutionContext;
import com.flowforge.execution.engine.StepExecutionResult;
import com.flowforge.execution.model.HttpCallLog;
import com.flowforge.execution.model.StepDef;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import java.time.Duration;
import java.util.HashMap;
import java.util.Map;

@Component
public class HttpStepExecutor implements StepExecutor {

    private static final Logger log = LoggerFactory.getLogger(HttpStepExecutor.class);

    private static final String TYPE = "HTTP";
    private static final int DEFAULT_TIMEOUT_SECONDS = 30;

    private final WebClient webClient;
    private final ContextResolver contextResolver;
    private final ObjectMapper objectMapper;

    public HttpStepExecutor(WebClient webClient, ContextResolver contextResolver, ObjectMapper objectMapper) {
        this.webClient = webClient;
        this.contextResolver = contextResolver;
        this.objectMapper = objectMapper;
    }

    @Override
    public String getType() {
        return TYPE;
    }

    @Override
    @SuppressWarnings("unchecked")
    public StepExecutionResult execute(StepDef step, ExecutionContext context) {
        Map<String, Object> config = step.getConfig();
        if (config == null) {
            return StepExecutionResult.builder()
                    .success(false)
                    .errorMessage("HTTP step '" + step.getStepId() + "' has no config")
                    .build();
        }

        String url = contextResolver.resolve((String) config.get("url"), context);
        String method = ((String) config.getOrDefault("method", "GET")).toUpperCase();
        Object body = config.get("body");
        int timeoutSeconds = config.containsKey("timeoutSeconds")
                ? ((Number) config.get("timeoutSeconds")).intValue()
                : DEFAULT_TIMEOUT_SECONDS;

        // Resolve headers
        Map<String, String> headers = new HashMap<>();
        if (config.containsKey("headers") && config.get("headers") instanceof Map) {
            Map<String, String> rawHeaders = (Map<String, String>) config.get("headers");
            rawHeaders.forEach((k, v) -> headers.put(k, contextResolver.resolve(v, context)));
        }

        // Build resolved config for audit trail
        Map<String, Object> resolvedConfig = new HashMap<>();
        resolvedConfig.put("url", url);
        resolvedConfig.put("method", method);
        resolvedConfig.put("headers", headers);
        resolvedConfig.put("timeoutSeconds", timeoutSeconds);

        // Resolve request body
        String resolvedBody = null;
        if (body != null && !method.equals("GET") && !method.equals("DELETE")) {
            try {
                if (body instanceof String) {
                    resolvedBody = contextResolver.resolve((String) body, context);
                } else {
                    resolvedBody = objectMapper.writeValueAsString(body);
                }
            } catch (Exception e) {
                log.warn("Failed to serialize request body for step '{}': {}", step.getStepId(), e.getMessage());
                resolvedBody = body.toString();
            }
            resolvedConfig.put("body", resolvedBody);
        }

        log.debug("Executing HTTP step '{}': {} {}", step.getStepId(), method, url);

        long start = System.currentTimeMillis();

        HttpCallLog httpCallLog = HttpCallLog.builder()
                .url(url)
                .method(method)
                .requestHeaders(headers)
                .requestBody(resolvedBody)
                .build();

        try {
            WebClient.RequestBodySpec requestSpec = webClient
                    .method(HttpMethod.valueOf(method))
                    .uri(url)
                    .contentType(MediaType.APPLICATION_JSON);

            headers.forEach(requestSpec::header);

            WebClient.RequestHeadersSpec<?> headersSpec;
            if (resolvedBody != null) {
                headersSpec = requestSpec.bodyValue(resolvedBody);
            } else {
                headersSpec = requestSpec;
            }

            // Capture response with status and headers
            final String[] responseBodyHolder = {null};
            final int[] responseStatusHolder = {200};
            final Map<String, String>[] responseHeadersHolder = new Map[]{new HashMap<>()};

            String rawResponseBody = headersSpec
                    .exchangeToMono(response -> {
                        responseStatusHolder[0] = response.statusCode().value();
                        response.headers().asHttpHeaders().forEach((name, values) -> {
                            if (!values.isEmpty()) {
                                responseHeadersHolder[0].put(name, values.get(0));
                            }
                        });
                        return response.bodyToMono(String.class);
                    })
                    .timeout(Duration.ofSeconds(timeoutSeconds))
                    .block();

            long durationMs = System.currentTimeMillis() - start;
            int statusCode = responseStatusHolder[0];
            Map<String, String> responseHeaders = responseHeadersHolder[0];

            // Determine success based on 2xx status
            boolean httpSuccess = statusCode >= 200 && statusCode < 300;

            httpCallLog.setResponseStatus(statusCode);
            httpCallLog.setResponseHeaders(responseHeaders);
            httpCallLog.setResponseBody(rawResponseBody);
            httpCallLog.setDurationMs(durationMs);
            httpCallLog.setSuccess(httpSuccess);

            Map<String, Object> output = new HashMap<>();
            output.put("statusCode", statusCode);
            output.put("body", rawResponseBody);

            // Try to parse response as JSON
            if (rawResponseBody != null && rawResponseBody.trim().startsWith("{")) {
                try {
                    @SuppressWarnings("unchecked")
                    Map<String, Object> parsed = objectMapper.readValue(rawResponseBody, Map.class);
                    output.put("parsedBody", parsed);
                } catch (Exception ignored) {
                    // Not JSON or parse failed — leave as raw string
                }
            }

            if (httpSuccess) {
                log.debug("HTTP step '{}' succeeded with status {}", step.getStepId(), statusCode);
                return StepExecutionResult.builder()
                        .success(true)
                        .output(output)
                        .httpCallLog(httpCallLog)
                        .resolvedConfig(resolvedConfig)
                        .build();
            } else {
                log.warn("HTTP step '{}' returned non-2xx status {}", step.getStepId(), statusCode);
                String errMsg = "HTTP " + statusCode + ": non-success response";
                httpCallLog.setErrorMessage(errMsg);
                return StepExecutionResult.builder()
                        .success(false)
                        .output(output)
                        .errorMessage(errMsg)
                        .httpCallLog(httpCallLog)
                        .resolvedConfig(resolvedConfig)
                        .build();
            }

        } catch (WebClientResponseException e) {
            long durationMs = System.currentTimeMillis() - start;
            log.warn("HTTP step '{}' failed with status {}: {}", step.getStepId(), e.getStatusCode(), e.getMessage());

            Map<String, String> responseHeaders = new HashMap<>();
            e.getHeaders().forEach((name, values) -> {
                if (!values.isEmpty()) {
                    responseHeaders.put(name, values.get(0));
                }
            });

            httpCallLog.setResponseStatus(e.getStatusCode().value());
            httpCallLog.setResponseHeaders(responseHeaders);
            httpCallLog.setResponseBody(e.getResponseBodyAsString());
            httpCallLog.setDurationMs(durationMs);
            httpCallLog.setSuccess(false);
            httpCallLog.setErrorMessage("HTTP " + e.getStatusCode().value() + ": " + e.getMessage());

            Map<String, Object> output = new HashMap<>();
            output.put("statusCode", e.getStatusCode().value());
            output.put("body", e.getResponseBodyAsString());

            return StepExecutionResult.builder()
                    .success(false)
                    .output(output)
                    .errorMessage("HTTP " + e.getStatusCode().value() + ": " + e.getMessage())
                    .httpCallLog(httpCallLog)
                    .resolvedConfig(resolvedConfig)
                    .build();

        } catch (Exception e) {
            long durationMs = System.currentTimeMillis() - start;
            log.error("HTTP step '{}' threw exception: {}", step.getStepId(), e.getMessage(), e);

            httpCallLog.setDurationMs(durationMs);
            httpCallLog.setSuccess(false);
            httpCallLog.setErrorMessage("HTTP step failed: " + e.getMessage());

            return StepExecutionResult.builder()
                    .success(false)
                    .errorMessage("HTTP step failed: " + e.getMessage())
                    .httpCallLog(httpCallLog)
                    .resolvedConfig(resolvedConfig)
                    .build();
        }
    }
}
