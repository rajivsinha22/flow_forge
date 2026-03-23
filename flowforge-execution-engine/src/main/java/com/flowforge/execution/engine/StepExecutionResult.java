package com.flowforge.execution.engine;

import com.flowforge.execution.model.HttpCallLog;

import java.util.Map;
import java.util.Objects;

public class StepExecutionResult {

    private boolean success;
    private Map<String, Object> output;
    private String errorMessage;
    private String nextStepId; // resolved by orchestrator based on success/failure
    private String branchLabel; // for CONDITION steps: the branch taken
    private HttpCallLog httpCallLog;
    private Map<String, Object> resolvedConfig;

    public StepExecutionResult() {
    }

    public StepExecutionResult(boolean success, Map<String, Object> output, String errorMessage,
                                String nextStepId, String branchLabel) {
        this.success = success;
        this.output = output;
        this.errorMessage = errorMessage;
        this.nextStepId = nextStepId;
        this.branchLabel = branchLabel;
    }

    public boolean isSuccess() { return success; }
    public void setSuccess(boolean success) { this.success = success; }

    public Map<String, Object> getOutput() { return output; }
    public void setOutput(Map<String, Object> output) { this.output = output; }

    public String getErrorMessage() { return errorMessage; }
    public void setErrorMessage(String errorMessage) { this.errorMessage = errorMessage; }

    public String getNextStepId() { return nextStepId; }
    public void setNextStepId(String nextStepId) { this.nextStepId = nextStepId; }

    public String getBranchLabel() { return branchLabel; }
    public void setBranchLabel(String branchLabel) { this.branchLabel = branchLabel; }

    public HttpCallLog getHttpCallLog() { return httpCallLog; }
    public void setHttpCallLog(HttpCallLog httpCallLog) { this.httpCallLog = httpCallLog; }

    public Map<String, Object> getResolvedConfig() { return resolvedConfig; }
    public void setResolvedConfig(Map<String, Object> resolvedConfig) { this.resolvedConfig = resolvedConfig; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        StepExecutionResult that = (StepExecutionResult) o;
        return success == that.success &&
                Objects.equals(output, that.output) &&
                Objects.equals(errorMessage, that.errorMessage) &&
                Objects.equals(nextStepId, that.nextStepId) &&
                Objects.equals(branchLabel, that.branchLabel);
    }

    @Override
    public int hashCode() {
        return Objects.hash(success, output, errorMessage, nextStepId, branchLabel);
    }

    @Override
    public String toString() {
        return "StepExecutionResult{success=" + success +
                ", errorMessage='" + errorMessage + '\'' +
                ", branchLabel='" + branchLabel + '\'' + '}';
    }

    public static Builder builder() { return new Builder(); }

    public static class Builder {
        private boolean success;
        private Map<String, Object> output;
        private String errorMessage;
        private String nextStepId;
        private String branchLabel;
        private HttpCallLog httpCallLog;
        private Map<String, Object> resolvedConfig;

        public Builder success(boolean success) { this.success = success; return this; }
        public Builder output(Map<String, Object> output) { this.output = output; return this; }
        public Builder errorMessage(String errorMessage) { this.errorMessage = errorMessage; return this; }
        public Builder nextStepId(String nextStepId) { this.nextStepId = nextStepId; return this; }
        public Builder branchLabel(String branchLabel) { this.branchLabel = branchLabel; return this; }
        public Builder httpCallLog(HttpCallLog httpCallLog) { this.httpCallLog = httpCallLog; return this; }
        public Builder resolvedConfig(Map<String, Object> resolvedConfig) { this.resolvedConfig = resolvedConfig; return this; }

        public StepExecutionResult build() {
            StepExecutionResult r = new StepExecutionResult(success, output, errorMessage, nextStepId, branchLabel);
            r.httpCallLog = this.httpCallLog;
            r.resolvedConfig = this.resolvedConfig;
            return r;
        }
    }
}
