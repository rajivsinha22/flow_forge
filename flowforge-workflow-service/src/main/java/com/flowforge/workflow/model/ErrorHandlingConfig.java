package com.flowforge.workflow.model;

import java.util.Map;
import java.util.Objects;

/**
 * Defines how a workflow responds to execution failures or schema validation errors.
 * <p>
 * Modes:
 * <ul>
 *   <li>FAIL_FAST      — stop immediately and return HTTP 422 / 500 with the error</li>
 *   <li>CONTINUE       — log the error, mark execution FAILED, but return 200 with an error body</li>
 *   <li>CUSTOM_RESPONSE — return a user-defined HTTP status + body when the execution fails</li>
 * </ul>
 */
public class ErrorHandlingConfig {

    /** FAIL_FAST | CONTINUE | CUSTOM_RESPONSE */
    private String mode = "FAIL_FAST";

    /** HTTP status code to return when mode = CUSTOM_RESPONSE (default 422) */
    private int customStatusCode = 422;

    /**
     * Template body returned when mode = CUSTOM_RESPONSE.
     * Supports {{error.message}}, {{error.step}}, {{execution.id}} placeholders.
     * Example: { "error": "{{error.message}}", "code": "WORKFLOW_ERROR" }
     */
    private Map<String, Object> customBody;

    /** Whether to emit an error notification event when the workflow fails */
    private boolean notifyOnError = false;

    public ErrorHandlingConfig() {
    }

    public ErrorHandlingConfig(String mode, int customStatusCode,
                                Map<String, Object> customBody, boolean notifyOnError) {
        this.mode = mode;
        this.customStatusCode = customStatusCode;
        this.customBody = customBody;
        this.notifyOnError = notifyOnError;
    }

    public String getMode() { return mode; }
    public void setMode(String mode) { this.mode = mode; }

    public int getCustomStatusCode() { return customStatusCode; }
    public void setCustomStatusCode(int customStatusCode) { this.customStatusCode = customStatusCode; }

    public Map<String, Object> getCustomBody() { return customBody; }
    public void setCustomBody(Map<String, Object> customBody) { this.customBody = customBody; }

    public boolean isNotifyOnError() { return notifyOnError; }
    public void setNotifyOnError(boolean notifyOnError) { this.notifyOnError = notifyOnError; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        ErrorHandlingConfig that = (ErrorHandlingConfig) o;
        return customStatusCode == that.customStatusCode &&
                notifyOnError == that.notifyOnError &&
                Objects.equals(mode, that.mode) &&
                Objects.equals(customBody, that.customBody);
    }

    @Override
    public int hashCode() {
        return Objects.hash(mode, customStatusCode, customBody, notifyOnError);
    }

    @Override
    public String toString() {
        return "ErrorHandlingConfig{mode='" + mode + "', customStatusCode=" + customStatusCode + '}';
    }
}
