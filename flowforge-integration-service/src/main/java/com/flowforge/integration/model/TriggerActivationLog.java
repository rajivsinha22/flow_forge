package com.flowforge.integration.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.index.Indexed;

import java.time.LocalDateTime;

@Document("trigger_activation_logs")
public class TriggerActivationLog {

    @Id
    private String id;

    @Indexed
    private String triggerId;

    private String clientId;

    private String workflowId;

    private String executionId;

    /**
     * Status: SUCCESS, FAILED, FILTERED
     */
    private String status;

    private String errorMessage;

    private LocalDateTime activatedAt;

    public TriggerActivationLog() {
    }

    public TriggerActivationLog(String id, String triggerId, String clientId, String workflowId,
                                 String executionId, String status, String errorMessage,
                                 LocalDateTime activatedAt) {
        this.id = id;
        this.triggerId = triggerId;
        this.clientId = clientId;
        this.workflowId = workflowId;
        this.executionId = executionId;
        this.status = status;
        this.errorMessage = errorMessage;
        this.activatedAt = activatedAt;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getTriggerId() {
        return triggerId;
    }

    public void setTriggerId(String triggerId) {
        this.triggerId = triggerId;
    }

    public String getClientId() {
        return clientId;
    }

    public void setClientId(String clientId) {
        this.clientId = clientId;
    }

    public String getWorkflowId() {
        return workflowId;
    }

    public void setWorkflowId(String workflowId) {
        this.workflowId = workflowId;
    }

    public String getExecutionId() {
        return executionId;
    }

    public void setExecutionId(String executionId) {
        this.executionId = executionId;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getErrorMessage() {
        return errorMessage;
    }

    public void setErrorMessage(String errorMessage) {
        this.errorMessage = errorMessage;
    }

    public LocalDateTime getActivatedAt() {
        return activatedAt;
    }

    public void setActivatedAt(LocalDateTime activatedAt) {
        this.activatedAt = activatedAt;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof TriggerActivationLog)) return false;
        TriggerActivationLog that = (TriggerActivationLog) o;
        return java.util.Objects.equals(id, that.id);
    }

    @Override
    public int hashCode() {
        return java.util.Objects.hashCode(id);
    }

    @Override
    public String toString() {
        return "TriggerActivationLog{" +
                "id='" + id + '\'' +
                ", triggerId='" + triggerId + '\'' +
                ", clientId='" + clientId + '\'' +
                ", workflowId='" + workflowId + '\'' +
                ", executionId='" + executionId + '\'' +
                ", status='" + status + '\'' +
                ", activatedAt=" + activatedAt +
                '}';
    }

    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private String id;
        private String triggerId;
        private String clientId;
        private String workflowId;
        private String executionId;
        private String status;
        private String errorMessage;
        private LocalDateTime activatedAt;

        public Builder id(String id) { this.id = id; return this; }
        public Builder triggerId(String triggerId) { this.triggerId = triggerId; return this; }
        public Builder clientId(String clientId) { this.clientId = clientId; return this; }
        public Builder workflowId(String workflowId) { this.workflowId = workflowId; return this; }
        public Builder executionId(String executionId) { this.executionId = executionId; return this; }
        public Builder status(String status) { this.status = status; return this; }
        public Builder errorMessage(String errorMessage) { this.errorMessage = errorMessage; return this; }
        public Builder activatedAt(LocalDateTime activatedAt) { this.activatedAt = activatedAt; return this; }

        public TriggerActivationLog build() {
            return new TriggerActivationLog(id, triggerId, clientId, workflowId, executionId,
                    status, errorMessage, activatedAt);
        }
    }
}
