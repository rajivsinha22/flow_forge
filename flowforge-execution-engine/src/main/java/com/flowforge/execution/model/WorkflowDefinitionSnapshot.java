package com.flowforge.execution.model;

import java.util.List;
import java.util.Map;
import java.util.Objects;

/**
 * A snapshot of the workflow definition used during execution.
 * Fetched from the workflow service at execution start time.
 */
public class WorkflowDefinitionSnapshot {

    private String id;
    private String clientId;
    private String name;
    private String displayName;
    private int version;
    private String triggerType;
    private Map<String, Object> inputSchema;
    private Map<String, String> variables;
    private List<StepDef> steps;

    // ── Schema model bindings ─────────────────────────────────────────────────

    /** ID of the linked input DataModel (for reference) */
    private String inputModelId;

    /** ID of the linked output DataModel (for reference) */
    private String outputModelId;

    /**
     * Resolved JSON Schema Draft-07 string for input validation.
     * Populated by WorkflowDefinitionLoader from the workflow service response.
     * Null when no input model is bound.
     */
    private String resolvedInputSchemaJson;

    /**
     * Resolved JSON Schema Draft-07 string for output validation / documentation.
     */
    private String resolvedOutputSchemaJson;

    /**
     * Output mapping template: key → {{stepId.field}} expressions.
     * Used to shape the final API response on workflow success.
     */
    private Map<String, Object> outputMapping;

    /**
     * Error handling configuration serialised from the workflow definition.
     */
    private Map<String, Object> errorHandlingConfig;

    public WorkflowDefinitionSnapshot() {
    }

    public WorkflowDefinitionSnapshot(String id, String clientId, String name, String displayName,
                                       int version, String triggerType, Map<String, Object> inputSchema,
                                       Map<String, String> variables, List<StepDef> steps) {
        this.id = id;
        this.clientId = clientId;
        this.name = name;
        this.displayName = displayName;
        this.version = version;
        this.triggerType = triggerType;
        this.inputSchema = inputSchema;
        this.variables = variables;
        this.steps = steps;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getClientId() { return clientId; }
    public void setClientId(String clientId) { this.clientId = clientId; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getDisplayName() { return displayName; }
    public void setDisplayName(String displayName) { this.displayName = displayName; }

    public int getVersion() { return version; }
    public void setVersion(int version) { this.version = version; }

    public String getTriggerType() { return triggerType; }
    public void setTriggerType(String triggerType) { this.triggerType = triggerType; }

    public Map<String, Object> getInputSchema() { return inputSchema; }
    public void setInputSchema(Map<String, Object> inputSchema) { this.inputSchema = inputSchema; }

    public Map<String, String> getVariables() { return variables; }
    public void setVariables(Map<String, String> variables) { this.variables = variables; }

    public List<StepDef> getSteps() { return steps; }
    public void setSteps(List<StepDef> steps) { this.steps = steps; }

    public String getInputModelId() { return inputModelId; }
    public void setInputModelId(String inputModelId) { this.inputModelId = inputModelId; }

    public String getOutputModelId() { return outputModelId; }
    public void setOutputModelId(String outputModelId) { this.outputModelId = outputModelId; }

    public String getResolvedInputSchemaJson() { return resolvedInputSchemaJson; }
    public void setResolvedInputSchemaJson(String resolvedInputSchemaJson) { this.resolvedInputSchemaJson = resolvedInputSchemaJson; }

    public String getResolvedOutputSchemaJson() { return resolvedOutputSchemaJson; }
    public void setResolvedOutputSchemaJson(String resolvedOutputSchemaJson) { this.resolvedOutputSchemaJson = resolvedOutputSchemaJson; }

    public Map<String, Object> getOutputMapping() { return outputMapping; }
    public void setOutputMapping(Map<String, Object> outputMapping) { this.outputMapping = outputMapping; }

    public Map<String, Object> getErrorHandlingConfig() { return errorHandlingConfig; }
    public void setErrorHandlingConfig(Map<String, Object> errorHandlingConfig) { this.errorHandlingConfig = errorHandlingConfig; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        WorkflowDefinitionSnapshot that = (WorkflowDefinitionSnapshot) o;
        return version == that.version &&
                Objects.equals(id, that.id) &&
                Objects.equals(clientId, that.clientId) &&
                Objects.equals(name, that.name) &&
                Objects.equals(displayName, that.displayName) &&
                Objects.equals(triggerType, that.triggerType) &&
                Objects.equals(inputSchema, that.inputSchema) &&
                Objects.equals(variables, that.variables) &&
                Objects.equals(steps, that.steps);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id, clientId, name, displayName, version, triggerType, inputSchema, variables, steps);
    }

    @Override
    public String toString() {
        return "WorkflowDefinitionSnapshot{id='" + id + '\'' +
                ", name='" + name + '\'' +
                ", version=" + version + '}';
    }

    public static Builder builder() { return new Builder(); }

    public static class Builder {
        private String id;
        private String clientId;
        private String name;
        private String displayName;
        private int version;
        private String triggerType;
        private Map<String, Object> inputSchema;
        private Map<String, String> variables;
        private List<StepDef> steps;
        private String inputModelId;
        private String outputModelId;
        private String resolvedInputSchemaJson;
        private String resolvedOutputSchemaJson;
        private Map<String, Object> outputMapping;
        private Map<String, Object> errorHandlingConfig;

        public Builder id(String id) { this.id = id; return this; }
        public Builder clientId(String clientId) { this.clientId = clientId; return this; }
        public Builder name(String name) { this.name = name; return this; }
        public Builder displayName(String displayName) { this.displayName = displayName; return this; }
        public Builder version(int version) { this.version = version; return this; }
        public Builder triggerType(String triggerType) { this.triggerType = triggerType; return this; }
        public Builder inputSchema(Map<String, Object> inputSchema) { this.inputSchema = inputSchema; return this; }
        public Builder variables(Map<String, String> variables) { this.variables = variables; return this; }
        public Builder steps(List<StepDef> steps) { this.steps = steps; return this; }
        public Builder inputModelId(String inputModelId) { this.inputModelId = inputModelId; return this; }
        public Builder outputModelId(String outputModelId) { this.outputModelId = outputModelId; return this; }
        public Builder resolvedInputSchemaJson(String resolvedInputSchemaJson) { this.resolvedInputSchemaJson = resolvedInputSchemaJson; return this; }
        public Builder resolvedOutputSchemaJson(String resolvedOutputSchemaJson) { this.resolvedOutputSchemaJson = resolvedOutputSchemaJson; return this; }
        public Builder outputMapping(Map<String, Object> outputMapping) { this.outputMapping = outputMapping; return this; }
        public Builder errorHandlingConfig(Map<String, Object> errorHandlingConfig) { this.errorHandlingConfig = errorHandlingConfig; return this; }

        public WorkflowDefinitionSnapshot build() {
            WorkflowDefinitionSnapshot s = new WorkflowDefinitionSnapshot(id, clientId, name, displayName,
                    version, triggerType, inputSchema, variables, steps);
            s.inputModelId = this.inputModelId;
            s.outputModelId = this.outputModelId;
            s.resolvedInputSchemaJson = this.resolvedInputSchemaJson;
            s.resolvedOutputSchemaJson = this.resolvedOutputSchemaJson;
            s.outputMapping = this.outputMapping;
            s.errorHandlingConfig = this.errorHandlingConfig;
            return s;
        }
    }
}
