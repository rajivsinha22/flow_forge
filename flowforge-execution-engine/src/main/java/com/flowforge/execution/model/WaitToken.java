package com.flowforge.execution.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.Objects;

/**
 * Represents an active wait state for a workflow execution.
 * Created by WaitStepExecutor, destroyed when the execution is resumed or times out.
 *
 * Status lifecycle: WAITING → RESUMED | TIMED_OUT | CANCELLED
 */
@Document("wait_tokens")
public class WaitToken {

    @Id
    private String id;

    @Indexed
    private String executionId;

    @Indexed
    private String clientId;

    private String workflowId;
    private String workflowName;

    /** The stepId of the WAIT step that created this token */
    private String stepId;
    private String stepName;

    /**
     * Opaque token that external systems can use to resume this wait state.
     * Clients can use this token in the resume API instead of knowing executionId+stepId.
     */
    @Indexed(unique = true)
    private String token;

    /** WAITING | RESUMED | TIMED_OUT | CANCELLED */
    private String status;

    /** Optional: data injected by the resume caller, made available as ${waitState.stepName.*} in context */
    private Map<String, Object> resumeData;

    /** How the wait was resumed: MANUAL_API | KAFKA_EVENT | TIMEOUT */
    private String resumedBy;

    private String resumedByUserId;

    private LocalDateTime expiresAt;    // null = no timeout
    private LocalDateTime createdAt;
    private LocalDateTime resumedAt;

    public WaitToken() {}

    // All-args constructor
    public WaitToken(String id, String executionId, String clientId, String workflowId,
                     String workflowName, String stepId, String stepName, String token,
                     String status, Map<String, Object> resumeData, String resumedBy,
                     String resumedByUserId, LocalDateTime expiresAt, LocalDateTime createdAt,
                     LocalDateTime resumedAt) {
        this.id = id; this.executionId = executionId; this.clientId = clientId;
        this.workflowId = workflowId; this.workflowName = workflowName;
        this.stepId = stepId; this.stepName = stepName; this.token = token;
        this.status = status; this.resumeData = resumeData; this.resumedBy = resumedBy;
        this.resumedByUserId = resumedByUserId; this.expiresAt = expiresAt;
        this.createdAt = createdAt; this.resumedAt = resumedAt;
    }

    // All getters and setters
    public String getId() { return id; } public void setId(String id) { this.id = id; }
    public String getExecutionId() { return executionId; } public void setExecutionId(String v) { this.executionId = v; }
    public String getClientId() { return clientId; } public void setClientId(String v) { this.clientId = v; }
    public String getWorkflowId() { return workflowId; } public void setWorkflowId(String v) { this.workflowId = v; }
    public String getWorkflowName() { return workflowName; } public void setWorkflowName(String v) { this.workflowName = v; }
    public String getStepId() { return stepId; } public void setStepId(String v) { this.stepId = v; }
    public String getStepName() { return stepName; } public void setStepName(String v) { this.stepName = v; }
    public String getToken() { return token; } public void setToken(String v) { this.token = v; }
    public String getStatus() { return status; } public void setStatus(String v) { this.status = v; }
    public Map<String, Object> getResumeData() { return resumeData; } public void setResumeData(Map<String, Object> v) { this.resumeData = v; }
    public String getResumedBy() { return resumedBy; } public void setResumedBy(String v) { this.resumedBy = v; }
    public String getResumedByUserId() { return resumedByUserId; } public void setResumedByUserId(String v) { this.resumedByUserId = v; }
    public LocalDateTime getExpiresAt() { return expiresAt; } public void setExpiresAt(LocalDateTime v) { this.expiresAt = v; }
    public LocalDateTime getCreatedAt() { return createdAt; } public void setCreatedAt(LocalDateTime v) { this.createdAt = v; }
    public LocalDateTime getResumedAt() { return resumedAt; } public void setResumedAt(LocalDateTime v) { this.resumedAt = v; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof WaitToken)) return false;
        return Objects.equals(id, ((WaitToken)o).id);
    }
    @Override public int hashCode() { return Objects.hashCode(id); }

    public static Builder builder() { return new Builder(); }
    public static class Builder {
        private String id, executionId, clientId, workflowId, workflowName, stepId, stepName, token, status, resumedBy, resumedByUserId;
        private Map<String, Object> resumeData;
        private LocalDateTime expiresAt, createdAt, resumedAt;
        public Builder id(String v) { id=v; return this; }
        public Builder executionId(String v) { executionId=v; return this; }
        public Builder clientId(String v) { clientId=v; return this; }
        public Builder workflowId(String v) { workflowId=v; return this; }
        public Builder workflowName(String v) { workflowName=v; return this; }
        public Builder stepId(String v) { stepId=v; return this; }
        public Builder stepName(String v) { stepName=v; return this; }
        public Builder token(String v) { token=v; return this; }
        public Builder status(String v) { status=v; return this; }
        public Builder resumeData(Map<String,Object> v) { resumeData=v; return this; }
        public Builder resumedBy(String v) { resumedBy=v; return this; }
        public Builder resumedByUserId(String v) { resumedByUserId=v; return this; }
        public Builder expiresAt(LocalDateTime v) { expiresAt=v; return this; }
        public Builder createdAt(LocalDateTime v) { createdAt=v; return this; }
        public Builder resumedAt(LocalDateTime v) { resumedAt=v; return this; }
        public WaitToken build() {
            return new WaitToken(id,executionId,clientId,workflowId,workflowName,stepId,stepName,
                    token,status,resumeData,resumedBy,resumedByUserId,expiresAt,createdAt,resumedAt);
        }
    }
}
