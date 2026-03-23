package com.flowforge.execution.engine;

import java.util.HashMap;
import java.util.Map;
import java.util.Objects;

public class ExecutionContext {

    private String clientId;
    private String executionId;
    private String workflowId;
    private String workflowName;
    private Map<String, Object> input;
    private Map<String, Object> variables;
    private Map<String, Object> stepOutputs;
    private Map<String, String> envVars;

    public ExecutionContext() {
    }

    public ExecutionContext(String clientId, String executionId, String workflowId, String workflowName,
                            Map<String, Object> input, Map<String, Object> variables,
                            Map<String, Object> stepOutputs, Map<String, String> envVars) {
        this.clientId = clientId;
        this.executionId = executionId;
        this.workflowId = workflowId;
        this.workflowName = workflowName;
        this.input = input;
        this.variables = variables;
        this.stepOutputs = stepOutputs;
        this.envVars = envVars;
    }

    public String getClientId() { return clientId; }
    public void setClientId(String clientId) { this.clientId = clientId; }

    public String getExecutionId() { return executionId; }
    public void setExecutionId(String executionId) { this.executionId = executionId; }

    public String getWorkflowId() { return workflowId; }
    public void setWorkflowId(String workflowId) { this.workflowId = workflowId; }

    public String getWorkflowName() { return workflowName; }
    public void setWorkflowName(String workflowName) { this.workflowName = workflowName; }

    public Map<String, Object> getInput() { return input; }
    public void setInput(Map<String, Object> input) { this.input = input; }

    public Map<String, Object> getVariables() { return variables; }
    public void setVariables(Map<String, Object> variables) { this.variables = variables; }

    public Map<String, Object> getStepOutputs() { return stepOutputs; }
    public void setStepOutputs(Map<String, Object> stepOutputs) { this.stepOutputs = stepOutputs; }

    public Map<String, String> getEnvVars() { return envVars; }
    public void setEnvVars(Map<String, String> envVars) { this.envVars = envVars; }

    /**
     * Stores a value in stepOutputs under the given key.
     * Initializes stepOutputs if it is null.
     */
    public void setStepOutput(String key, Object value) {
        if (this.stepOutputs == null) {
            this.stepOutputs = new HashMap<>();
        }
        this.stepOutputs.put(key, value);
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        ExecutionContext that = (ExecutionContext) o;
        return Objects.equals(clientId, that.clientId) &&
                Objects.equals(executionId, that.executionId) &&
                Objects.equals(workflowId, that.workflowId) &&
                Objects.equals(workflowName, that.workflowName) &&
                Objects.equals(input, that.input) &&
                Objects.equals(variables, that.variables) &&
                Objects.equals(stepOutputs, that.stepOutputs) &&
                Objects.equals(envVars, that.envVars);
    }

    @Override
    public int hashCode() {
        return Objects.hash(clientId, executionId, workflowId, workflowName, input, variables, stepOutputs, envVars);
    }

    @Override
    public String toString() {
        return "ExecutionContext{clientId='" + clientId + '\'' +
                ", executionId='" + executionId + '\'' +
                ", workflowId='" + workflowId + '\'' +
                ", workflowName='" + workflowName + '\'' + '}';
    }

    public static Builder builder() { return new Builder(); }

    public static class Builder {
        private String clientId;
        private String executionId;
        private String workflowId;
        private String workflowName;
        private Map<String, Object> input;
        private Map<String, Object> variables;
        private Map<String, Object> stepOutputs;
        private Map<String, String> envVars;

        public Builder clientId(String clientId) { this.clientId = clientId; return this; }
        public Builder executionId(String executionId) { this.executionId = executionId; return this; }
        public Builder workflowId(String workflowId) { this.workflowId = workflowId; return this; }
        public Builder workflowName(String workflowName) { this.workflowName = workflowName; return this; }
        public Builder input(Map<String, Object> input) { this.input = input; return this; }
        public Builder variables(Map<String, Object> variables) { this.variables = variables; return this; }
        public Builder stepOutputs(Map<String, Object> stepOutputs) { this.stepOutputs = stepOutputs; return this; }
        public Builder envVars(Map<String, String> envVars) { this.envVars = envVars; return this; }

        public ExecutionContext build() {
            return new ExecutionContext(clientId, executionId, workflowId, workflowName,
                    input, variables, stepOutputs, envVars);
        }
    }
}
