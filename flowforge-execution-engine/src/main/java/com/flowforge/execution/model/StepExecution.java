package com.flowforge.execution.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@Document("step_executions")
public class StepExecution {

    @Id
    private String id;

    @Indexed
    private String executionId;

    private String clientId;
    private String stepId;
    private String stepName;
    private String stepType;

    private String status; // PENDING, RUNNING, SUCCESS, FAILED, SKIPPED, RETRYING

    private int attemptNumber;

    private Map<String, Object> input;
    private Map<String, Object> output;
    private String errorMessage;

    private LocalDateTime startedAt;
    private LocalDateTime completedAt;
    private long durationMs;

    private HttpCallLog httpCallLog;
    private Map<String, Object> resolvedConfig;
    private int totalAttempts;

    /**
     * Per-attempt error records accumulated during the retry loop.
     * Contains one entry for every failed attempt (including the final one that
     * triggered dead-lettering). This list is serialised into the
     * {@code STEP_DEAD_LETTERED} Kafka event so the DLQ console can display
     * the complete retry trail without querying the execution engine separately.
     */
    private List<StepRetryAttempt> retryAttempts = new ArrayList<>();

    public StepExecution() {
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getExecutionId() { return executionId; }
    public void setExecutionId(String executionId) { this.executionId = executionId; }

    public String getClientId() { return clientId; }
    public void setClientId(String clientId) { this.clientId = clientId; }

    public String getStepId() { return stepId; }
    public void setStepId(String stepId) { this.stepId = stepId; }

    public String getStepName() { return stepName; }
    public void setStepName(String stepName) { this.stepName = stepName; }

    public String getStepType() { return stepType; }
    public void setStepType(String stepType) { this.stepType = stepType; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public int getAttemptNumber() { return attemptNumber; }
    public void setAttemptNumber(int attemptNumber) { this.attemptNumber = attemptNumber; }

    public Map<String, Object> getInput() { return input; }
    public void setInput(Map<String, Object> input) { this.input = input; }

    public Map<String, Object> getOutput() { return output; }
    public void setOutput(Map<String, Object> output) { this.output = output; }

    public String getErrorMessage() { return errorMessage; }
    public void setErrorMessage(String errorMessage) { this.errorMessage = errorMessage; }

    public LocalDateTime getStartedAt() { return startedAt; }
    public void setStartedAt(LocalDateTime startedAt) { this.startedAt = startedAt; }

    public LocalDateTime getCompletedAt() { return completedAt; }
    public void setCompletedAt(LocalDateTime completedAt) { this.completedAt = completedAt; }

    public long getDurationMs() { return durationMs; }
    public void setDurationMs(long durationMs) { this.durationMs = durationMs; }

    public HttpCallLog getHttpCallLog() { return httpCallLog; }
    public void setHttpCallLog(HttpCallLog httpCallLog) { this.httpCallLog = httpCallLog; }

    public Map<String, Object> getResolvedConfig() { return resolvedConfig; }
    public void setResolvedConfig(Map<String, Object> resolvedConfig) { this.resolvedConfig = resolvedConfig; }

    public int getTotalAttempts() { return totalAttempts; }
    public void setTotalAttempts(int totalAttempts) { this.totalAttempts = totalAttempts; }

    public List<StepRetryAttempt> getRetryAttempts() {
        if (retryAttempts == null) retryAttempts = new ArrayList<>();
        return retryAttempts;
    }
    public void setRetryAttempts(List<StepRetryAttempt> retryAttempts) { this.retryAttempts = retryAttempts; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        StepExecution that = (StepExecution) o;
        return attemptNumber == that.attemptNumber &&
                durationMs == that.durationMs &&
                Objects.equals(id, that.id) &&
                Objects.equals(executionId, that.executionId) &&
                Objects.equals(clientId, that.clientId) &&
                Objects.equals(stepId, that.stepId) &&
                Objects.equals(stepName, that.stepName) &&
                Objects.equals(stepType, that.stepType) &&
                Objects.equals(status, that.status) &&
                Objects.equals(input, that.input) &&
                Objects.equals(output, that.output) &&
                Objects.equals(errorMessage, that.errorMessage) &&
                Objects.equals(startedAt, that.startedAt) &&
                Objects.equals(completedAt, that.completedAt);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id, executionId, clientId, stepId, stepName, stepType, status,
                attemptNumber, input, output, errorMessage, startedAt, completedAt, durationMs);
    }

    @Override
    public String toString() {
        return "StepExecution{id='" + id + '\'' +
                ", executionId='" + executionId + '\'' +
                ", stepId='" + stepId + '\'' +
                ", status='" + status + '\'' + '}';
    }

    public static Builder builder() { return new Builder(); }

    public static class Builder {
        private String id;
        private String executionId;
        private String clientId;
        private String stepId;
        private String stepName;
        private String stepType;
        private String status;
        private int attemptNumber;
        private Map<String, Object> input;
        private Map<String, Object> output;
        private String errorMessage;
        private LocalDateTime startedAt;
        private LocalDateTime completedAt;
        private long durationMs;
        private HttpCallLog httpCallLog;
        private Map<String, Object> resolvedConfig;
        private int totalAttempts;
        private List<StepRetryAttempt> retryAttempts = new ArrayList<>();

        public Builder id(String id) { this.id = id; return this; }
        public Builder executionId(String executionId) { this.executionId = executionId; return this; }
        public Builder clientId(String clientId) { this.clientId = clientId; return this; }
        public Builder stepId(String stepId) { this.stepId = stepId; return this; }
        public Builder stepName(String stepName) { this.stepName = stepName; return this; }
        public Builder stepType(String stepType) { this.stepType = stepType; return this; }
        public Builder status(String status) { this.status = status; return this; }
        public Builder attemptNumber(int attemptNumber) { this.attemptNumber = attemptNumber; return this; }
        public Builder input(Map<String, Object> input) { this.input = input; return this; }
        public Builder output(Map<String, Object> output) { this.output = output; return this; }
        public Builder errorMessage(String errorMessage) { this.errorMessage = errorMessage; return this; }
        public Builder startedAt(LocalDateTime startedAt) { this.startedAt = startedAt; return this; }
        public Builder completedAt(LocalDateTime completedAt) { this.completedAt = completedAt; return this; }
        public Builder durationMs(long durationMs) { this.durationMs = durationMs; return this; }
        public Builder httpCallLog(HttpCallLog httpCallLog) { this.httpCallLog = httpCallLog; return this; }
        public Builder resolvedConfig(Map<String, Object> resolvedConfig) { this.resolvedConfig = resolvedConfig; return this; }
        public Builder totalAttempts(int totalAttempts) { this.totalAttempts = totalAttempts; return this; }
        public Builder retryAttempts(List<StepRetryAttempt> retryAttempts) { this.retryAttempts = retryAttempts; return this; }

        public StepExecution build() {
            StepExecution s = new StepExecution();
            s.id = this.id;
            s.executionId = this.executionId;
            s.clientId = this.clientId;
            s.stepId = this.stepId;
            s.stepName = this.stepName;
            s.stepType = this.stepType;
            s.status = this.status;
            s.attemptNumber = this.attemptNumber;
            s.input = this.input;
            s.output = this.output;
            s.errorMessage = this.errorMessage;
            s.startedAt = this.startedAt;
            s.completedAt = this.completedAt;
            s.durationMs = this.durationMs;
            s.httpCallLog = this.httpCallLog;
            s.resolvedConfig = this.resolvedConfig;
            s.totalAttempts = this.totalAttempts;
            s.retryAttempts = this.retryAttempts != null ? this.retryAttempts : new ArrayList<>();
            return s;
        }
    }
}
