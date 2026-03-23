package com.flowforge.execution.model;

import java.util.Map;

/**
 * Captures full HTTP request/response details for HTTP step executions.
 * Embedded inside StepExecution.
 */
public class HttpCallLog {

    private String url;
    private String method;
    private Map<String, String> requestHeaders;
    private String requestBody;
    private int responseStatus;
    private Map<String, String> responseHeaders;
    private String responseBody;
    private long durationMs;
    private boolean success;
    private String errorMessage;

    public HttpCallLog() {}

    public HttpCallLog(String url, String method, Map<String, String> requestHeaders,
                       String requestBody, int responseStatus, Map<String, String> responseHeaders,
                       String responseBody, long durationMs, boolean success, String errorMessage) {
        this.url = url;
        this.method = method;
        this.requestHeaders = requestHeaders;
        this.requestBody = requestBody;
        this.responseStatus = responseStatus;
        this.responseHeaders = responseHeaders;
        this.responseBody = responseBody;
        this.durationMs = durationMs;
        this.success = success;
        this.errorMessage = errorMessage;
    }

    public String getUrl() { return url; }
    public void setUrl(String url) { this.url = url; }

    public String getMethod() { return method; }
    public void setMethod(String method) { this.method = method; }

    public Map<String, String> getRequestHeaders() { return requestHeaders; }
    public void setRequestHeaders(Map<String, String> requestHeaders) { this.requestHeaders = requestHeaders; }

    public String getRequestBody() { return requestBody; }
    public void setRequestBody(String requestBody) { this.requestBody = requestBody; }

    public int getResponseStatus() { return responseStatus; }
    public void setResponseStatus(int responseStatus) { this.responseStatus = responseStatus; }

    public Map<String, String> getResponseHeaders() { return responseHeaders; }
    public void setResponseHeaders(Map<String, String> responseHeaders) { this.responseHeaders = responseHeaders; }

    public String getResponseBody() { return responseBody; }
    public void setResponseBody(String responseBody) { this.responseBody = responseBody; }

    public long getDurationMs() { return durationMs; }
    public void setDurationMs(long durationMs) { this.durationMs = durationMs; }

    public boolean isSuccess() { return success; }
    public void setSuccess(boolean success) { this.success = success; }

    public String getErrorMessage() { return errorMessage; }
    public void setErrorMessage(String errorMessage) { this.errorMessage = errorMessage; }

    @Override
    public String toString() {
        return "HttpCallLog{method=" + method + ", url=" + url + ", status=" + responseStatus
                + ", durationMs=" + durationMs + "}";
    }

    public static Builder builder() { return new Builder(); }

    public static class Builder {
        private String url;
        private String method;
        private String requestBody;
        private String responseBody;
        private String errorMessage;
        private Map<String, String> requestHeaders;
        private Map<String, String> responseHeaders;
        private int responseStatus;
        private long durationMs;
        private boolean success;

        public Builder url(String url) { this.url = url; return this; }
        public Builder method(String method) { this.method = method; return this; }
        public Builder requestHeaders(Map<String, String> h) { this.requestHeaders = h; return this; }
        public Builder requestBody(String b) { this.requestBody = b; return this; }
        public Builder responseStatus(int s) { this.responseStatus = s; return this; }
        public Builder responseHeaders(Map<String, String> h) { this.responseHeaders = h; return this; }
        public Builder responseBody(String b) { this.responseBody = b; return this; }
        public Builder durationMs(long d) { this.durationMs = d; return this; }
        public Builder success(boolean s) { this.success = s; return this; }
        public Builder errorMessage(String e) { this.errorMessage = e; return this; }

        public HttpCallLog build() {
            return new HttpCallLog(url, method, requestHeaders, requestBody, responseStatus,
                    responseHeaders, responseBody, durationMs, success, errorMessage);
        }
    }
}
