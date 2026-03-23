package com.flowforge.execution.executor.script;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Base64;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Runtime proxy for a single user-configured HTTP service.
 *
 * Exposed to Groovy scripts as:
 *   http.services.myApi.get('/users/123')
 *   http.services.myApi.post('/orders', [items: ['a','b']])
 *   http.services.myApi.put('/orders/1', payload)
 *   http.services.myApi.delete('/orders/1')
 *
 * Response shape: [statusCode: 200, data: <parsed JSON or string>, headers: [...]]
 */
public class ScriptHttpProxy {

    private static final Logger log = LoggerFactory.getLogger(ScriptHttpProxy.class);
    private static final ObjectMapper MAPPER = new ObjectMapper();

    private final String name;
    private final String baseUrl;
    private final String authType;      // NONE, BEARER, BASIC, API_KEY
    private final String authValue;     // resolved token / base64 creds
    private final String apiKeyHeader;  // e.g. "X-Api-Key"
    private final Map<String, String> defaultHeaders;
    private final int timeoutSeconds;
    private final HttpClient httpClient;

    @SuppressWarnings("unchecked")
    public ScriptHttpProxy(Map<String, Object> serviceConfig,
                           Map<String, String> envVars,
                           int timeoutSeconds) {
        this.name          = str(serviceConfig, "name", "unnamed");
        String rawBaseUrl  = stripTrailingSlash(str(serviceConfig, "baseUrl", ""));
        // Validate base URL at construction time (SSRF check on the configured root URL)
        if (!rawBaseUrl.isBlank()) {
            SsrfGuard.validate(rawBaseUrl);
        }
        this.baseUrl       = rawBaseUrl;
        this.authType      = str(serviceConfig, "authType", "NONE").toUpperCase();
        this.authValue     = resolveEnvRefs(str(serviceConfig, "authValue", ""), envVars);
        this.apiKeyHeader  = str(serviceConfig, "apiKeyHeader", "X-Api-Key");
        this.timeoutSeconds = timeoutSeconds;

        // Resolve env var references in header values
        Map<String, Object> rawHeaders = serviceConfig.get("headers") instanceof Map<?, ?>
                ? (Map<String, Object>) serviceConfig.get("headers")
                : new HashMap<>();
        Map<String, String> resolved = new LinkedHashMap<>();
        rawHeaders.forEach((k, v) -> resolved.put(String.valueOf(k),
                resolveEnvRefs(String.valueOf(v), envVars)));
        this.defaultHeaders = resolved;

        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(timeoutSeconds))
                .followRedirects(HttpClient.Redirect.NORMAL)
                .build();
    }

    // ─── Public API (called from Groovy scripts) ───────────────────────────────

    public Map<String, Object> get(String path) {
        return get(path, Map.of());
    }

    public Map<String, Object> get(String path, Map<String, String> extraHeaders) {
        return execute("GET", path, null, extraHeaders);
    }

    public Map<String, Object> post(String path, Object body) {
        return post(path, body, Map.of());
    }

    public Map<String, Object> post(String path, Object body, Map<String, String> extraHeaders) {
        return execute("POST", path, body, extraHeaders);
    }

    public Map<String, Object> put(String path, Object body) {
        return put(path, body, Map.of());
    }

    public Map<String, Object> put(String path, Object body, Map<String, String> extraHeaders) {
        return execute("PUT", path, body, extraHeaders);
    }

    public Map<String, Object> patch(String path, Object body) {
        return execute("PATCH", path, body, Map.of());
    }

    public Map<String, Object> delete(String path) {
        return execute("DELETE", path, null, Map.of());
    }

    // ─── Internal ─────────────────────────────────────────────────────────────

    private Map<String, Object> execute(String method, String path,
                                         Object body,
                                         Map<String, String> extraHeaders) {
        String url = baseUrl + (path.startsWith("/") ? path : "/" + path);
        // Re-validate the full URL at call time — path segment could carry a redirect
        // or contain a host override (e.g. path = "//evil.com/steal")
        SsrfGuard.validate(url);
        log.debug("[ScriptHttpProxy:{}] {} {}", name, method, url);

        try {
            String bodyJson = body != null ? MAPPER.writeValueAsString(body) : null;

            HttpRequest.Builder rb = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .timeout(Duration.ofSeconds(timeoutSeconds));

            // Auth header
            switch (authType) {
                case "BEARER"  -> rb.header("Authorization", "Bearer " + authValue);
                case "BASIC"   -> rb.header("Authorization", "Basic " + authValue);
                case "API_KEY" -> rb.header(apiKeyHeader, authValue);
            }

            // Default headers
            defaultHeaders.forEach(rb::header);

            // Per-call extra headers
            if (extraHeaders != null) {
                extraHeaders.forEach(rb::header);
            }

            // Method + body
            if (bodyJson != null) {
                rb.header("Content-Type", "application/json");
                rb.method(method, HttpRequest.BodyPublishers.ofString(bodyJson, StandardCharsets.UTF_8));
            } else {
                rb.method(method, HttpRequest.BodyPublishers.noBody());
            }

            HttpResponse<String> response = httpClient.send(rb.build(),
                    HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));

            // Parse response body
            Object parsedData;
            String rawBody = response.body();
            if (rawBody != null && !rawBody.isBlank() &&
                    (rawBody.trim().startsWith("{") || rawBody.trim().startsWith("["))) {
                try {
                    parsedData = MAPPER.readValue(rawBody, new TypeReference<Object>() {});
                } catch (Exception e) {
                    parsedData = rawBody;
                }
            } else {
                parsedData = rawBody;
            }

            // Flatten response headers to Map<String, String>
            Map<String, String> responseHeaders = new LinkedHashMap<>();
            response.headers().map().forEach((k, vals) ->
                    responseHeaders.put(k, String.join(", ", vals)));

            Map<String, Object> result = new LinkedHashMap<>();
            result.put("statusCode", response.statusCode());
            result.put("ok", response.statusCode() >= 200 && response.statusCode() < 300);
            result.put("data", parsedData);
            result.put("headers", responseHeaders);
            return result;

        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException("[ScriptHttpProxy:" + name + "] Request interrupted: " + e.getMessage(), e);
        } catch (Exception e) {
            log.error("[ScriptHttpProxy:{}] {} {} failed: {}", name, method, url, e.getMessage());
            throw new RuntimeException("[ScriptHttpProxy:" + name + "] HTTP call failed: " + e.getMessage(), e);
        }
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    /** Resolve ${ENV_VAR} references in a string using the execution context's env vars. */
    static String resolveEnvRefs(String value, Map<String, String> envVars) {
        if (value == null || !value.contains("${")) return value;
        String result = value;
        for (Map.Entry<String, String> e : envVars.entrySet()) {
            result = result.replace("${" + e.getKey() + "}", e.getValue());
        }
        return result;
    }

    private static String str(Map<String, Object> m, String key, String defaultVal) {
        Object v = m.get(key);
        return v != null ? String.valueOf(v) : defaultVal;
    }

    private static String stripTrailingSlash(String url) {
        return url.endsWith("/") ? url.substring(0, url.length() - 1) : url;
    }
}
