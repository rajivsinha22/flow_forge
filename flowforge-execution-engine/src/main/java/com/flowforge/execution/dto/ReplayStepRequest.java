package com.flowforge.execution.dto;

import java.util.Map;

/**
 * Request body for the DLQ step-replay endpoint.
 *
 * <p>Sent by the integration-service DlqReplayService when a user triggers a replay
 * from the Dead Letter Queue console. The execution engine uses this to restore the
 * exact execution context that existed at the point of failure and re-runs the failed
 * step (and all downstream steps) inside the original execution record.
 */
public class ReplayStepRequest {

    /** ID of the originating DLQ message (for audit / tracing). */
    private String dlqMessageId;

    /** ID of the workflow execution that originally failed. */
    private String executionId;

    /** ID of the workflow definition. */
    private String workflowId;

    /** Step ID that should be re-executed. */
    private String stepId;

    /** Step type (e.g. HTTP, SCRIPT, WAIT) — informational. */
    private String stepType;

    /** Resolved step configuration at the time of failure — informational. */
    private Map<String, Object> stepConfig;

    /**
     * Execution context captured at the point of failure.
     * Contains {@code input}, {@code variables}, and {@code stepOutputs} sub-maps so
     * the replay can resume with the same variable state that preceded the failure.
     */
    private Map<String, Object> executionContext;

    /** Tenant / client identifier — must match the {@code X-Client-Id} header. */
    private String clientId;

    // ── Getters / Setters ────────────────────────────────────────────────────

    public String getDlqMessageId() { return dlqMessageId; }
    public void setDlqMessageId(String dlqMessageId) { this.dlqMessageId = dlqMessageId; }

    public String getExecutionId() { return executionId; }
    public void setExecutionId(String executionId) { this.executionId = executionId; }

    public String getWorkflowId() { return workflowId; }
    public void setWorkflowId(String workflowId) { this.workflowId = workflowId; }

    public String getStepId() { return stepId; }
    public void setStepId(String stepId) { this.stepId = stepId; }

    public String getStepType() { return stepType; }
    public void setStepType(String stepType) { this.stepType = stepType; }

    public Map<String, Object> getStepConfig() { return stepConfig; }
    public void setStepConfig(Map<String, Object> stepConfig) { this.stepConfig = stepConfig; }

    public Map<String, Object> getExecutionContext() { return executionContext; }
    public void setExecutionContext(Map<String, Object> executionContext) { this.executionContext = executionContext; }

    public String getClientId() { return clientId; }
    public void setClientId(String clientId) { this.clientId = clientId; }
}
