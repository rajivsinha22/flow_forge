package com.flowforge.workflow.dto;

import com.flowforge.workflow.model.EdgeDef;
import com.flowforge.workflow.model.StepDef;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.List;
import java.util.Map;
import java.util.Objects;

public class CreateWorkflowRequest {

    @NotBlank(message = "Workflow name is required")
    private String name;

    @NotBlank(message = "Display name is required")
    private String displayName;

    private String description;

    @NotBlank(message = "Trigger type is required")
    private String triggerType; // API, WEBHOOK, CRON, KAFKA, SNS

    private String cronExpression;  // required if triggerType = CRON
    private String kafkaTopic;      // required if triggerType = KAFKA

    private Map<String, Object> inputSchema;
    private Map<String, String> variables;

    @NotNull(message = "Steps are required")
    private List<StepDef> steps;

    private List<EdgeDef> edges;

    public CreateWorkflowRequest() {
    }

    public CreateWorkflowRequest(String name, String displayName, String description, String triggerType,
                                  String cronExpression, String kafkaTopic, Map<String, Object> inputSchema,
                                  Map<String, String> variables, List<StepDef> steps, List<EdgeDef> edges) {
        this.name = name;
        this.displayName = displayName;
        this.description = description;
        this.triggerType = triggerType;
        this.cronExpression = cronExpression;
        this.kafkaTopic = kafkaTopic;
        this.inputSchema = inputSchema;
        this.variables = variables;
        this.steps = steps;
        this.edges = edges;
    }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

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

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        CreateWorkflowRequest that = (CreateWorkflowRequest) o;
        return Objects.equals(name, that.name) &&
                Objects.equals(displayName, that.displayName) &&
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
        return Objects.hash(name, displayName, description, triggerType, cronExpression,
                kafkaTopic, inputSchema, variables, steps, edges);
    }

    @Override
    public String toString() {
        return "CreateWorkflowRequest{" +
                "name='" + name + '\'' +
                ", displayName='" + displayName + '\'' +
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
        private String name;
        private String displayName;
        private String description;
        private String triggerType;
        private String cronExpression;
        private String kafkaTopic;
        private Map<String, Object> inputSchema;
        private Map<String, String> variables;
        private List<StepDef> steps;
        private List<EdgeDef> edges;

        public Builder name(String name) { this.name = name; return this; }
        public Builder displayName(String displayName) { this.displayName = displayName; return this; }
        public Builder description(String description) { this.description = description; return this; }
        public Builder triggerType(String triggerType) { this.triggerType = triggerType; return this; }
        public Builder cronExpression(String cronExpression) { this.cronExpression = cronExpression; return this; }
        public Builder kafkaTopic(String kafkaTopic) { this.kafkaTopic = kafkaTopic; return this; }
        public Builder inputSchema(Map<String, Object> inputSchema) { this.inputSchema = inputSchema; return this; }
        public Builder variables(Map<String, String> variables) { this.variables = variables; return this; }
        public Builder steps(List<StepDef> steps) { this.steps = steps; return this; }
        public Builder edges(List<EdgeDef> edges) { this.edges = edges; return this; }

        public CreateWorkflowRequest build() {
            return new CreateWorkflowRequest(name, displayName, description, triggerType,
                    cronExpression, kafkaTopic, inputSchema, variables, steps, edges);
        }
    }
}
