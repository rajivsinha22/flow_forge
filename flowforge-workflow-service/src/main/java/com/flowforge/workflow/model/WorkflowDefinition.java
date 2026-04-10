package com.flowforge.workflow.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@Document("workflow_definitions")
@CompoundIndexes({
    @CompoundIndex(name = "client_name_idx", def = "{'clientId': 1, 'namespace': 1, 'name': 1}"),
    @CompoundIndex(name = "client_name_active_idx", def = "{'clientId': 1, 'namespace': 1, 'name': 1, 'activeVersion': 1}")
})
public class WorkflowDefinition {

    @Id
    private String id;

    private String clientId;
    private String namespace = "default";
    private String name;          // unique per client + namespace
    private String displayName;
    private String description;
    private int version;
    private boolean activeVersion;
    private String status;        // DRAFT, PUBLISHED, DEPRECATED

    private String triggerType;   // API, WEBHOOK, CRON, KAFKA, SNS
    private String cronExpression;  // for CRON trigger
    private String kafkaTopic;      // for KAFKA trigger

    private Map<String, Object> inputSchema;  // JSON schema
    private Map<String, String> variables;

    private List<StepDef> steps;
    private List<EdgeDef> edges;  // connections between steps

    // ── Schema / model bindings ───────────────────────────────────────────────

    /**
     * ID of the {@link DataModel} used to validate the trigger input before execution.
     * When set, any trigger payload that does not conform to the model's JSON Schema
     * will be rejected with a 422 Unprocessable Entity response.
     */
    private String inputModelId;

    // NOTE: outputModelId, outputMapping, and errorHandlingConfig have been removed.
    // Response mapping is now handled via context keys: responseBody, responseStatus, contentType.
    // These fields are kept as deprecated getters/setters for backward compatibility with
    // existing MongoDB documents (old docs may still contain them), but they are no longer used.

    /**
     * Data sync mode for linked input model records. Only relevant when {@code inputModelId} is set.
     * <ul>
     *   <li>{@code "READ"} — load model record data into execution context before the workflow runs</li>
     *   <li>{@code "WRITE"} — same as READ, plus write updated context back to the model record after successful execution</li>
     *   <li>{@code null} — no data sync (legacy behaviour: schema validation only)</li>
     * </ul>
     */
    private String dataSyncMode;

    // ── These fields are NOT stored in MongoDB; they are populated on read ────

    /**
     * Resolved JSON Schema string for the input model (populated at read time, not persisted).
     * Present only when inputModelId is set and the model is fetched.
     */
    @org.springframework.data.annotation.Transient
    private String resolvedInputSchemaJson;

    // ── Version / audit fields ────────────────────────────────────────────────

    private String publishedBy;
    private LocalDateTime publishedAt;
    private String changeLog;

    private String createdBy;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public WorkflowDefinition() {
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getClientId() { return clientId; }
    public void setClientId(String clientId) { this.clientId = clientId; }

    public String getNamespace() { return namespace; }
    public void setNamespace(String namespace) { this.namespace = namespace; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getDisplayName() { return displayName; }
    public void setDisplayName(String displayName) { this.displayName = displayName; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public int getVersion() { return version; }
    public void setVersion(int version) { this.version = version; }

    public boolean isActiveVersion() { return activeVersion; }
    public void setActiveVersion(boolean activeVersion) { this.activeVersion = activeVersion; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

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

    /** @deprecated No longer used — kept for backward compatibility with old MongoDB docs */
    @Deprecated public String getOutputModelId() { return null; }
    @Deprecated public void setOutputModelId(String outputModelId) { /* no-op */ }

    /** @deprecated Response mapping is now context-based (responseBody/responseStatus/contentType) */
    @Deprecated public Map<String, Object> getOutputMapping() { return null; }
    @Deprecated public void setOutputMapping(Map<String, Object> outputMapping) { /* no-op */ }

    /** @deprecated Error handling config is no longer configurable per workflow */
    @Deprecated public ErrorHandlingConfig getErrorHandlingConfig() { return null; }
    @Deprecated public void setErrorHandlingConfig(ErrorHandlingConfig errorHandlingConfig) { /* no-op */ }

    public String getDataSyncMode() { return dataSyncMode; }
    public void setDataSyncMode(String dataSyncMode) { this.dataSyncMode = dataSyncMode; }

    public String getResolvedInputSchemaJson() { return resolvedInputSchemaJson; }
    public void setResolvedInputSchemaJson(String resolvedInputSchemaJson) { this.resolvedInputSchemaJson = resolvedInputSchemaJson; }

    /** @deprecated Output schema resolution removed */
    @Deprecated public String getResolvedOutputSchemaJson() { return null; }
    @Deprecated public void setResolvedOutputSchemaJson(String s) { /* no-op */ }

    public String getPublishedBy() { return publishedBy; }
    public void setPublishedBy(String publishedBy) { this.publishedBy = publishedBy; }

    public LocalDateTime getPublishedAt() { return publishedAt; }
    public void setPublishedAt(LocalDateTime publishedAt) { this.publishedAt = publishedAt; }

    public String getChangeLog() { return changeLog; }
    public void setChangeLog(String changeLog) { this.changeLog = changeLog; }

    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        WorkflowDefinition that = (WorkflowDefinition) o;
        return version == that.version &&
                activeVersion == that.activeVersion &&
                Objects.equals(id, that.id) &&
                Objects.equals(clientId, that.clientId) &&
                Objects.equals(namespace, that.namespace) &&
                Objects.equals(name, that.name) &&
                Objects.equals(displayName, that.displayName) &&
                Objects.equals(description, that.description) &&
                Objects.equals(status, that.status) &&
                Objects.equals(triggerType, that.triggerType) &&
                Objects.equals(cronExpression, that.cronExpression) &&
                Objects.equals(kafkaTopic, that.kafkaTopic) &&
                Objects.equals(inputSchema, that.inputSchema) &&
                Objects.equals(variables, that.variables) &&
                Objects.equals(steps, that.steps) &&
                Objects.equals(edges, that.edges) &&
                Objects.equals(publishedBy, that.publishedBy) &&
                Objects.equals(publishedAt, that.publishedAt) &&
                Objects.equals(changeLog, that.changeLog) &&
                Objects.equals(createdBy, that.createdBy) &&
                Objects.equals(createdAt, that.createdAt) &&
                Objects.equals(updatedAt, that.updatedAt);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id, clientId, namespace, name, displayName, description, version, activeVersion,
                status, triggerType, cronExpression, kafkaTopic, inputSchema, variables, steps,
                edges, publishedBy, publishedAt, changeLog, createdBy, createdAt, updatedAt);
    }

    @Override
    public String toString() {
        return "WorkflowDefinition{" +
                "id='" + id + '\'' +
                ", clientId='" + clientId + '\'' +
                ", namespace='" + namespace + '\'' +
                ", name='" + name + '\'' +
                ", version=" + version +
                ", activeVersion=" + activeVersion +
                ", status='" + status + '\'' +
                ", triggerType='" + triggerType + '\'' +
                '}';
    }

    public static Builder builder() { return new Builder(); }

    public static class Builder {
        private String id;
        private String clientId;
        private String namespace = "default";
        private String name;
        private String displayName;
        private String description;
        private int version;
        private boolean activeVersion;
        private String status;
        private String triggerType;
        private String cronExpression;
        private String kafkaTopic;
        private Map<String, Object> inputSchema;
        private Map<String, String> variables;
        private List<StepDef> steps;
        private List<EdgeDef> edges;
        private String inputModelId;
        private String dataSyncMode;
        private String publishedBy;
        private LocalDateTime publishedAt;
        private String changeLog;
        private String createdBy;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;

        public Builder id(String id) { this.id = id; return this; }
        public Builder clientId(String clientId) { this.clientId = clientId; return this; }
        public Builder namespace(String namespace) { this.namespace = namespace; return this; }
        public Builder name(String name) { this.name = name; return this; }
        public Builder displayName(String displayName) { this.displayName = displayName; return this; }
        public Builder description(String description) { this.description = description; return this; }
        public Builder version(int version) { this.version = version; return this; }
        public Builder activeVersion(boolean activeVersion) { this.activeVersion = activeVersion; return this; }
        public Builder status(String status) { this.status = status; return this; }
        public Builder triggerType(String triggerType) { this.triggerType = triggerType; return this; }
        public Builder cronExpression(String cronExpression) { this.cronExpression = cronExpression; return this; }
        public Builder kafkaTopic(String kafkaTopic) { this.kafkaTopic = kafkaTopic; return this; }
        public Builder inputSchema(Map<String, Object> inputSchema) { this.inputSchema = inputSchema; return this; }
        public Builder variables(Map<String, String> variables) { this.variables = variables; return this; }
        public Builder steps(List<StepDef> steps) { this.steps = steps; return this; }
        public Builder edges(List<EdgeDef> edges) { this.edges = edges; return this; }
        public Builder inputModelId(String inputModelId) { this.inputModelId = inputModelId; return this; }
        public Builder dataSyncMode(String dataSyncMode) { this.dataSyncMode = dataSyncMode; return this; }
        public Builder publishedBy(String publishedBy) { this.publishedBy = publishedBy; return this; }
        public Builder publishedAt(LocalDateTime publishedAt) { this.publishedAt = publishedAt; return this; }
        public Builder changeLog(String changeLog) { this.changeLog = changeLog; return this; }
        public Builder createdBy(String createdBy) { this.createdBy = createdBy; return this; }
        public Builder createdAt(LocalDateTime createdAt) { this.createdAt = createdAt; return this; }
        public Builder updatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; return this; }

        public WorkflowDefinition build() {
            WorkflowDefinition w = new WorkflowDefinition();
            w.id = this.id;
            w.clientId = this.clientId;
            w.namespace = this.namespace;
            w.name = this.name;
            w.displayName = this.displayName;
            w.description = this.description;
            w.version = this.version;
            w.activeVersion = this.activeVersion;
            w.status = this.status;
            w.triggerType = this.triggerType;
            w.cronExpression = this.cronExpression;
            w.kafkaTopic = this.kafkaTopic;
            w.inputSchema = this.inputSchema;
            w.variables = this.variables;
            w.steps = this.steps;
            w.edges = this.edges;
            w.inputModelId = this.inputModelId;
            w.dataSyncMode = this.dataSyncMode;
            w.publishedBy = this.publishedBy;
            w.publishedAt = this.publishedAt;
            w.changeLog = this.changeLog;
            w.createdBy = this.createdBy;
            w.createdAt = this.createdAt;
            w.updatedAt = this.updatedAt;
            return w;
        }
    }
}
