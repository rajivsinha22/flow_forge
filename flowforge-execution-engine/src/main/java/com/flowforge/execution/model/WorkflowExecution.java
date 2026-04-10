package com.flowforge.execution.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@Document("workflow_executions")
public class WorkflowExecution {

    @Id
    private String id;

    @Indexed
    private String clientId;

    private String workflowId;
    private String workflowName;
    private int workflowVersion;

    private String status; // PENDING, RUNNING, SUCCESS, FAILED, PAUSED, CANCELLED

    private String triggerType; // API, WEBHOOK, CRON, KAFKA, SNS
    private String triggeredBy; // userId or system

    private Map<String, Object> input;
    private Map<String, Object> variables;
    private Map<String, Object> stepOutputs; // stepId -> output

    private String currentStepId;
    private List<String> completedSteps;

    private LocalDateTime startedAt;
    private LocalDateTime completedAt;
    private long durationMs;
    private String errorMessage;

    private Map<String, Object> executionContext; // final resolved execution context
    private WorkflowDefinitionSnapshot workflowDefinition; // snapshot used for DAG rendering

    /**
     * Resolved output map produced by applying the workflow's outputMapping template.
     * Null when no output mapping is configured or when the workflow failed.
     */
    private Map<String, Object> output;

    // ── Model record linking ───────────────────────────────────────────────────

    /** ID of the linked model record (may be pre-existing or auto-created from raw input). */
    private String modelRecordId;

    /** Data sync mode copied from the workflow definition: "READ" or "WRITE". */
    private String dataSyncMode;

    /** Snapshot of the model record data loaded before execution started. */
    private Map<String, Object> modelDataSnapshot;

    /** Updated model data written back after successful WRITE-scope execution. */
    private Map<String, Object> modelDataAfter;

    public WorkflowExecution() {
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getClientId() { return clientId; }
    public void setClientId(String clientId) { this.clientId = clientId; }

    public String getWorkflowId() { return workflowId; }
    public void setWorkflowId(String workflowId) { this.workflowId = workflowId; }

    public String getWorkflowName() { return workflowName; }
    public void setWorkflowName(String workflowName) { this.workflowName = workflowName; }

    public int getWorkflowVersion() { return workflowVersion; }
    public void setWorkflowVersion(int workflowVersion) { this.workflowVersion = workflowVersion; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getTriggerType() { return triggerType; }
    public void setTriggerType(String triggerType) { this.triggerType = triggerType; }

    public String getTriggeredBy() { return triggeredBy; }
    public void setTriggeredBy(String triggeredBy) { this.triggeredBy = triggeredBy; }

    public Map<String, Object> getInput() { return input; }
    public void setInput(Map<String, Object> input) { this.input = input; }

    public Map<String, Object> getVariables() { return variables; }
    public void setVariables(Map<String, Object> variables) { this.variables = variables; }

    public Map<String, Object> getStepOutputs() { return stepOutputs; }
    public void setStepOutputs(Map<String, Object> stepOutputs) { this.stepOutputs = stepOutputs; }

    public Map<String, Object> getOutput() { return output; }
    public void setOutput(Map<String, Object> output) { this.output = output; }

    public String getModelRecordId() { return modelRecordId; }
    public void setModelRecordId(String modelRecordId) { this.modelRecordId = modelRecordId; }

    public String getDataSyncMode() { return dataSyncMode; }
    public void setDataSyncMode(String dataSyncMode) { this.dataSyncMode = dataSyncMode; }

    public Map<String, Object> getModelDataSnapshot() { return modelDataSnapshot; }
    public void setModelDataSnapshot(Map<String, Object> modelDataSnapshot) { this.modelDataSnapshot = modelDataSnapshot; }

    public Map<String, Object> getModelDataAfter() { return modelDataAfter; }
    public void setModelDataAfter(Map<String, Object> modelDataAfter) { this.modelDataAfter = modelDataAfter; }

    public String getCurrentStepId() { return currentStepId; }
    public void setCurrentStepId(String currentStepId) { this.currentStepId = currentStepId; }

    public List<String> getCompletedSteps() { return completedSteps; }
    public void setCompletedSteps(List<String> completedSteps) { this.completedSteps = completedSteps; }

    public LocalDateTime getStartedAt() { return startedAt; }
    public void setStartedAt(LocalDateTime startedAt) { this.startedAt = startedAt; }

    public LocalDateTime getCompletedAt() { return completedAt; }
    public void setCompletedAt(LocalDateTime completedAt) { this.completedAt = completedAt; }

    public long getDurationMs() { return durationMs; }
    public void setDurationMs(long durationMs) { this.durationMs = durationMs; }

    public String getErrorMessage() { return errorMessage; }
    public void setErrorMessage(String errorMessage) { this.errorMessage = errorMessage; }

    public Map<String, Object> getExecutionContext() { return executionContext; }
    public void setExecutionContext(Map<String, Object> executionContext) { this.executionContext = executionContext; }

    public WorkflowDefinitionSnapshot getWorkflowDefinition() { return workflowDefinition; }
    public void setWorkflowDefinition(WorkflowDefinitionSnapshot workflowDefinition) { this.workflowDefinition = workflowDefinition; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        WorkflowExecution that = (WorkflowExecution) o;
        return workflowVersion == that.workflowVersion &&
                durationMs == that.durationMs &&
                Objects.equals(id, that.id) &&
                Objects.equals(clientId, that.clientId) &&
                Objects.equals(workflowId, that.workflowId) &&
                Objects.equals(workflowName, that.workflowName) &&
                Objects.equals(status, that.status) &&
                Objects.equals(triggerType, that.triggerType) &&
                Objects.equals(triggeredBy, that.triggeredBy) &&
                Objects.equals(input, that.input) &&
                Objects.equals(variables, that.variables) &&
                Objects.equals(stepOutputs, that.stepOutputs) &&
                Objects.equals(currentStepId, that.currentStepId) &&
                Objects.equals(completedSteps, that.completedSteps) &&
                Objects.equals(startedAt, that.startedAt) &&
                Objects.equals(completedAt, that.completedAt) &&
                Objects.equals(errorMessage, that.errorMessage);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id, clientId, workflowId, workflowName, workflowVersion, status,
                triggerType, triggeredBy, input, variables, stepOutputs, currentStepId,
                completedSteps, startedAt, completedAt, durationMs, errorMessage);
    }

    @Override
    public String toString() {
        return "WorkflowExecution{id='" + id + '\'' +
                ", clientId='" + clientId + '\'' +
                ", workflowName='" + workflowName + '\'' +
                ", status='" + status + '\'' + '}';
    }

    public static Builder builder() { return new Builder(); }

    public static class Builder {
        private String id;
        private String clientId;
        private String workflowId;
        private String workflowName;
        private int workflowVersion;
        private String status;
        private String triggerType;
        private String triggeredBy;
        private Map<String, Object> input;
        private Map<String, Object> variables;
        private Map<String, Object> stepOutputs;
        private String currentStepId;
        private List<String> completedSteps;
        private LocalDateTime startedAt;
        private LocalDateTime completedAt;
        private long durationMs;
        private String errorMessage;
        private Map<String, Object> executionContext;
        private WorkflowDefinitionSnapshot workflowDefinition;
        private String modelRecordId;
        private String dataSyncMode;
        private Map<String, Object> modelDataSnapshot;
        private Map<String, Object> modelDataAfter;

        public Builder id(String id) { this.id = id; return this; }
        public Builder clientId(String clientId) { this.clientId = clientId; return this; }
        public Builder workflowId(String workflowId) { this.workflowId = workflowId; return this; }
        public Builder workflowName(String workflowName) { this.workflowName = workflowName; return this; }
        public Builder workflowVersion(int workflowVersion) { this.workflowVersion = workflowVersion; return this; }
        public Builder status(String status) { this.status = status; return this; }
        public Builder triggerType(String triggerType) { this.triggerType = triggerType; return this; }
        public Builder triggeredBy(String triggeredBy) { this.triggeredBy = triggeredBy; return this; }
        public Builder input(Map<String, Object> input) { this.input = input; return this; }
        public Builder variables(Map<String, Object> variables) { this.variables = variables; return this; }
        public Builder stepOutputs(Map<String, Object> stepOutputs) { this.stepOutputs = stepOutputs; return this; }
        public Builder currentStepId(String currentStepId) { this.currentStepId = currentStepId; return this; }
        public Builder completedSteps(List<String> completedSteps) { this.completedSteps = completedSteps; return this; }
        public Builder startedAt(LocalDateTime startedAt) { this.startedAt = startedAt; return this; }
        public Builder completedAt(LocalDateTime completedAt) { this.completedAt = completedAt; return this; }
        public Builder durationMs(long durationMs) { this.durationMs = durationMs; return this; }
        public Builder errorMessage(String errorMessage) { this.errorMessage = errorMessage; return this; }
        public Builder executionContext(Map<String, Object> executionContext) { this.executionContext = executionContext; return this; }
        public Builder workflowDefinition(WorkflowDefinitionSnapshot workflowDefinition) { this.workflowDefinition = workflowDefinition; return this; }
        public Builder modelRecordId(String modelRecordId) { this.modelRecordId = modelRecordId; return this; }
        public Builder dataSyncMode(String dataSyncMode) { this.dataSyncMode = dataSyncMode; return this; }
        public Builder modelDataSnapshot(Map<String, Object> modelDataSnapshot) { this.modelDataSnapshot = modelDataSnapshot; return this; }
        public Builder modelDataAfter(Map<String, Object> modelDataAfter) { this.modelDataAfter = modelDataAfter; return this; }

        public WorkflowExecution build() {
            WorkflowExecution e = new WorkflowExecution();
            e.id = this.id;
            e.clientId = this.clientId;
            e.workflowId = this.workflowId;
            e.workflowName = this.workflowName;
            e.workflowVersion = this.workflowVersion;
            e.status = this.status;
            e.triggerType = this.triggerType;
            e.triggeredBy = this.triggeredBy;
            e.input = this.input;
            e.variables = this.variables;
            e.stepOutputs = this.stepOutputs;
            e.currentStepId = this.currentStepId;
            e.completedSteps = this.completedSteps;
            e.startedAt = this.startedAt;
            e.completedAt = this.completedAt;
            e.durationMs = this.durationMs;
            e.errorMessage = this.errorMessage;
            e.executionContext = this.executionContext;
            e.workflowDefinition = this.workflowDefinition;
            e.modelRecordId = this.modelRecordId;
            e.dataSyncMode = this.dataSyncMode;
            e.modelDataSnapshot = this.modelDataSnapshot;
            e.modelDataAfter = this.modelDataAfter;
            return e;
        }
    }
}
