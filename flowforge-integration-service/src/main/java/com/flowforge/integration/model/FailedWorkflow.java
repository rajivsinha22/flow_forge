package com.flowforge.integration.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.index.Indexed;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@Document("failed_workflows")
public class FailedWorkflow {

    @Id
    private String id;

    @Indexed
    private String clientId;

    private String executionId;

    private String workflowId;

    private String workflowName;

    private String stepId;

    private String stepName;

    private String stepType;

    private String failureReason;

    private Map<String, Object> stepConfig;

    private Map<String, Object> executionContext;

    /**
     * Per-attempt error records from the original execution retry loop —
     * populated by the execution engine when the step is dead-lettered and
     * carried in the {@code STEP_DEAD_LETTERED} Kafka event.
     *
     * <p>Each entry is a map with keys: {@code attemptNumber} (int),
     * {@code errorMessage} (String), {@code failedAt} (ISO-8601 String),
     * {@code durationMs} (long).
     *
     * <p>Displayed in the Failed Workflows console as the <em>Execution Retry History</em>
     * phase of the unified error timeline, before any manual replay attempts.
     */
    private List<Map<String, Object>> retryAttempts = new ArrayList<>();

    private int retryCount;

    /**
     * Status: PENDING, REPLAYING, DISCARDED, RESOLVED
     */
    private String status;

    private List<ReplayAttempt> replayHistory;

    private LocalDateTime failedAt;

    private LocalDateTime updatedAt;

    public FailedWorkflow() {
    }

    public FailedWorkflow(String id, String clientId, String executionId, String workflowId,
                      String workflowName, String stepId, String stepName, String stepType,
                      String failureReason, Map<String, Object> stepConfig,
                      Map<String, Object> executionContext,
                      List<Map<String, Object>> retryAttempts,
                      int retryCount, String status,
                      List<ReplayAttempt> replayHistory, LocalDateTime failedAt,
                      LocalDateTime updatedAt) {
        this.id = id;
        this.clientId = clientId;
        this.executionId = executionId;
        this.workflowId = workflowId;
        this.workflowName = workflowName;
        this.stepId = stepId;
        this.stepName = stepName;
        this.stepType = stepType;
        this.failureReason = failureReason;
        this.stepConfig = stepConfig;
        this.executionContext = executionContext;
        this.retryAttempts = retryAttempts != null ? retryAttempts : new ArrayList<>();
        this.retryCount = retryCount;
        this.status = status;
        this.replayHistory = replayHistory;
        this.failedAt = failedAt;
        this.updatedAt = updatedAt;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getClientId() { return clientId; }
    public void setClientId(String clientId) { this.clientId = clientId; }

    public String getExecutionId() { return executionId; }
    public void setExecutionId(String executionId) { this.executionId = executionId; }

    public String getWorkflowId() { return workflowId; }
    public void setWorkflowId(String workflowId) { this.workflowId = workflowId; }

    public String getWorkflowName() { return workflowName; }
    public void setWorkflowName(String workflowName) { this.workflowName = workflowName; }

    public String getStepId() { return stepId; }
    public void setStepId(String stepId) { this.stepId = stepId; }

    public String getStepName() { return stepName; }
    public void setStepName(String stepName) { this.stepName = stepName; }

    public String getStepType() { return stepType; }
    public void setStepType(String stepType) { this.stepType = stepType; }

    public String getFailureReason() { return failureReason; }
    public void setFailureReason(String failureReason) { this.failureReason = failureReason; }

    public Map<String, Object> getStepConfig() { return stepConfig; }
    public void setStepConfig(Map<String, Object> stepConfig) { this.stepConfig = stepConfig; }

    public Map<String, Object> getExecutionContext() { return executionContext; }
    public void setExecutionContext(Map<String, Object> executionContext) { this.executionContext = executionContext; }

    public List<Map<String, Object>> getRetryAttempts() {
        if (retryAttempts == null) retryAttempts = new ArrayList<>();
        return retryAttempts;
    }
    public void setRetryAttempts(List<Map<String, Object>> retryAttempts) { this.retryAttempts = retryAttempts; }

    public int getRetryCount() { return retryCount; }
    public void setRetryCount(int retryCount) { this.retryCount = retryCount; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public List<ReplayAttempt> getReplayHistory() { return replayHistory; }
    public void setReplayHistory(List<ReplayAttempt> replayHistory) { this.replayHistory = replayHistory; }

    public LocalDateTime getFailedAt() { return failedAt; }
    public void setFailedAt(LocalDateTime failedAt) { this.failedAt = failedAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof FailedWorkflow)) return false;
        FailedWorkflow that = (FailedWorkflow) o;
        return Objects.equals(id, that.id);
    }

    @Override
    public int hashCode() {
        return Objects.hashCode(id);
    }

    @Override
    public String toString() {
        return "FailedWorkflow{" +
                "id='" + id + '\'' +
                ", clientId='" + clientId + '\'' +
                ", executionId='" + executionId + '\'' +
                ", workflowId='" + workflowId + '\'' +
                ", stepId='" + stepId + '\'' +
                ", status='" + status + '\'' +
                ", retryCount=" + retryCount +
                ", failedAt=" + failedAt +
                '}';
    }

    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private String id;
        private String clientId;
        private String executionId;
        private String workflowId;
        private String workflowName;
        private String stepId;
        private String stepName;
        private String stepType;
        private String failureReason;
        private Map<String, Object> stepConfig;
        private Map<String, Object> executionContext;
        private List<Map<String, Object>> retryAttempts = new ArrayList<>();
        private int retryCount;
        private String status;
        private List<ReplayAttempt> replayHistory;
        private LocalDateTime failedAt;
        private LocalDateTime updatedAt;

        public Builder id(String id) { this.id = id; return this; }
        public Builder clientId(String clientId) { this.clientId = clientId; return this; }
        public Builder executionId(String executionId) { this.executionId = executionId; return this; }
        public Builder workflowId(String workflowId) { this.workflowId = workflowId; return this; }
        public Builder workflowName(String workflowName) { this.workflowName = workflowName; return this; }
        public Builder stepId(String stepId) { this.stepId = stepId; return this; }
        public Builder stepName(String stepName) { this.stepName = stepName; return this; }
        public Builder stepType(String stepType) { this.stepType = stepType; return this; }
        public Builder failureReason(String failureReason) { this.failureReason = failureReason; return this; }
        public Builder stepConfig(Map<String, Object> stepConfig) { this.stepConfig = stepConfig; return this; }
        public Builder executionContext(Map<String, Object> executionContext) { this.executionContext = executionContext; return this; }
        public Builder retryAttempts(List<Map<String, Object>> retryAttempts) { this.retryAttempts = retryAttempts; return this; }
        public Builder retryCount(int retryCount) { this.retryCount = retryCount; return this; }
        public Builder status(String status) { this.status = status; return this; }
        public Builder replayHistory(List<ReplayAttempt> replayHistory) { this.replayHistory = replayHistory; return this; }
        public Builder failedAt(LocalDateTime failedAt) { this.failedAt = failedAt; return this; }
        public Builder updatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; return this; }

        public FailedWorkflow build() {
            return new FailedWorkflow(id, clientId, executionId, workflowId, workflowName,
                    stepId, stepName, stepType, failureReason, stepConfig,
                    executionContext, retryAttempts, retryCount, status,
                    replayHistory, failedAt, updatedAt);
        }
    }
}
