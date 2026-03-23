package com.flowforge.workflow.dto;

import com.flowforge.workflow.model.EdgeDef;
import com.flowforge.workflow.model.ErrorHandlingConfig;
import com.flowforge.workflow.model.StepDef;

import java.util.List;
import java.util.Map;
import java.util.Objects;

public class UpdateWorkflowRequest {

    private String displayName;
    private String description;
    private String triggerType;
    private String cronExpression;
    private String kafkaTopic;
    private Map<String, Object> inputSchema;
    private Map<String, String> variables;
    private List<StepDef> steps;
    private List<EdgeDef> edges;

    /** ID of the DataModel used to validate trigger input (null = accept any payload) */
    private String inputModelId;

    /** ID of the DataModel describing the expected success response shape */
    private String outputModelId;

    /** Template mapping step outputs to the final API response body */
    private Map<String, Object> outputMapping;

    /** How the workflow behaves when execution or validation fails */
    private ErrorHandlingConfig errorHandlingConfig;

    public UpdateWorkflowRequest() {
    }

    public String getDisplayName() { return displayName; }
    public void setDisplayName(String displayName) { this.displayName = displayName; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getTriggerType() { return triggerType; }
    public void setTriggerType(String triggerType) { this.triggerType = triggerType; }

    public String getCronExpression() { return cronExpression; }
    public void setCronExpression(String cronExpression) { this.cronExpression = cronExpression; }

    public String getKafkaTopic() { return kafkaTopic; }
    public void setKafkaTopic(String kafkaTopic) { this.kafkaTopic = kafkaTopic; }

    public Map<String, Object> getInputSchema() { return inputSchema; }
    public void setInputSchema(Map<String, Object> inputSchema) { this.inputSchema = inputSchema; }

    public Map<String, String> getVariables() { return variables; }
    public void setVariables(Map<String, String> variables) { this.variables = variables; }

    public List<StepDef> getSteps() { return steps; }
    public void setSteps(List<StepDef> steps) { this.steps = steps; }

    public List<EdgeDef> getEdges() { return edges; }
    public void setEdges(List<EdgeDef> edges) { this.edges = edges; }

    public String getInputModelId() { return inputModelId; }
    public void setInputModelId(String inputModelId) { this.inputModelId = inputModelId; }

    public String getOutputModelId() { return outputModelId; }
    public void setOutputModelId(String outputModelId) { this.outputModelId = outputModelId; }

    public Map<String, Object> getOutputMapping() { return outputMapping; }
    public void setOutputMapping(Map<String, Object> outputMapping) { this.outputMapping = outputMapping; }

    public ErrorHandlingConfig getErrorHandlingConfig() { return errorHandlingConfig; }
    public void setErrorHandlingConfig(ErrorHandlingConfig errorHandlingConfig) { this.errorHandlingConfig = errorHandlingConfig; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        UpdateWorkflowRequest that = (UpdateWorkflowRequest) o;
        return Objects.equals(displayName, that.displayName) &&
                Objects.equals(description, that.description) &&
                Objects.equals(triggerType, that.triggerType) &&
                Objects.equals(cronExpression, that.cronExpression) &&
                Objects.equals(kafkaTopic, that.kafkaTopic) &&
                Objects.equals(inputSchema, that.inputSchema) &&
                Objects.equals(variables, that.variables) &&
                Objects.equals(steps, that.steps) &&
                Objects.equals(edges, that.edges);
    }

    @Override
    public int hashCode() {
        return Objects.hash(displayName, description, triggerType, cronExpression, kafkaTopic,
                inputSchema, variables, steps, edges);
    }

    @Override
    public String toString() {
        return "UpdateWorkflowRequest{" +
                "displayName='" + displayName + '\'' +
                ", description='" + description + '\'' +
                ", triggerType='" + triggerType + '\'' +
                ", cronExpression='" + cronExpression + '\'' +
                ", kafkaTopic='" + kafkaTopic + '\'' +
                ", inputSchema=" + inputSchema +
                ", variables=" + variables +
                ", steps=" + steps +
                ", edges=" + edges +
                '}';
    }

    public static Builder builder() { return new Builder(); }

    public static class Builder {
        private String displayName;
        private String description;
        private String triggerType;
        private String cronExpression;
        private String kafkaTopic;
        private Map<String, Object> inputSchema;
        private Map<String, String> variables;
        private List<StepDef> steps;
        private List<EdgeDef> edges;

        public Builder displayName(String displayName) { this.displayName = displayName; return this; }
        public Builder description(String description) { this.description = description; return this; }
        public Builder triggerType(String triggerType) { this.triggerType = triggerType; return this; }
        public Builder cronExpression(String cronExpression) { this.cronExpression = cronExpression; return this; }
        public Builder kafkaTopic(String kafkaTopic) { this.kafkaTopic = kafkaTopic; return this; }
        public Builder inputSchema(Map<String, Object> inputSchema) { this.inputSchema = inputSchema; return this; }
        public Builder variables(Map<String, String> variables) { this.variables = variables; return this; }
        public Builder steps(List<StepDef> steps) { this.steps = steps; return this; }
        public Builder edges(List<EdgeDef> edges) { this.edges = edges; return this; }

        public UpdateWorkflowRequest build() {
            return new UpdateWorkflowRequest(displayName, description, triggerType, cronExpression,
                    kafkaTopic, inputSchema, variables, steps, edges);
        }
    }
}
