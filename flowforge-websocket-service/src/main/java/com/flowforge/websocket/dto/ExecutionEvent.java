package com.flowforge.websocket.dto;

import java.util.Map;
import java.util.Objects;

public class ExecutionEvent {

    /**
     * Event type: EXECUTION_STARTED, STEP_STARTED, STEP_COMPLETED,
     * EXECUTION_COMPLETED, EXECUTION_FAILED, STEP_DEAD_LETTERED
     */
    private String type;

    private String executionId;

    private String clientId;

    private String workflowName;

    private String stepId;

    private String stepName;

    private String status;

    private Map<String, Object> output;

    private String errorMessage;

    private long timestamp;

    public ExecutionEvent() {
    }

    public ExecutionEvent(String type, String executionId, String clientId, String workflowName,
                           String stepId, String stepName, String status,
                           Map<String, Object> output, String errorMessage, long timestamp) {
        this.type = type;
        this.executionId = executionId;
        this.clientId = clientId;
        this.workflowName = workflowName;
        this.stepId = stepId;
        this.stepName = stepName;
        this.status = status;
        this.output = output;
        this.errorMessage = errorMessage;
        this.timestamp = timestamp;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public String getExecutionId() {
        return executionId;
    }

    public void setExecutionId(String executionId) {
        this.executionId = executionId;
    }

    public String getClientId() {
        return clientId;
    }

    public void setClientId(String clientId) {
        this.clientId = clientId;
    }

    public String getWorkflowName() {
        return workflowName;
    }

    public void setWorkflowName(String workflowName) {
        this.workflowName = workflowName;
    }

    public String getStepId() {
        return stepId;
    }

    public void setStepId(String stepId) {
        this.stepId = stepId;
    }

    public String getStepName() {
        return stepName;
    }

    public void setStepName(String stepName) {
        this.stepName = stepName;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public Map<String, Object> getOutput() {
        return output;
    }

    public void setOutput(Map<String, Object> output) {
        this.output = output;
    }

    public String getErrorMessage() {
        return errorMessage;
    }

    public void setErrorMessage(String errorMessage) {
        this.errorMessage = errorMessage;
    }

    public long getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(long timestamp) {
        this.timestamp = timestamp;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof ExecutionEvent)) return false;
        ExecutionEvent that = (ExecutionEvent) o;
        return timestamp == that.timestamp &&
                Objects.equals(type, that.type) &&
                Objects.equals(executionId, that.executionId) &&
                Objects.equals(clientId, that.clientId) &&
                Objects.equals(workflowName, that.workflowName) &&
                Objects.equals(stepId, that.stepId) &&
                Objects.equals(stepName, that.stepName) &&
                Objects.equals(status, that.status) &&
                Objects.equals(output, that.output) &&
                Objects.equals(errorMessage, that.errorMessage);
    }

    @Override
    public int hashCode() {
        return Objects.hash(type, executionId, clientId, workflowName, stepId, stepName,
                status, output, errorMessage, timestamp);
    }

    @Override
    public String toString() {
        return "ExecutionEvent{" +
                "type='" + type + '\'' +
                ", executionId='" + executionId + '\'' +
                ", clientId='" + clientId + '\'' +
                ", workflowName='" + workflowName + '\'' +
                ", stepId='" + stepId + '\'' +
                ", stepName='" + stepName + '\'' +
                ", status='" + status + '\'' +
                ", errorMessage='" + errorMessage + '\'' +
                ", timestamp=" + timestamp +
                '}';
    }
}
