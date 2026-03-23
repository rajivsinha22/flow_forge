package com.flowforge.workflow.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;

/**
 * Represents a named, reusable JSON Schema data model owned by a client (org).
 * <p>
 * A DataModel can be linked to a {@link WorkflowDefinition} as:
 * <ul>
 *   <li>inputModelId  — validates trigger input before execution starts</li>
 *   <li>outputModelId — validates / shapes the workflow response on success</li>
 * </ul>
 *
 * The {@code schemaJson} field stores a JSON Schema Draft-07 document as a raw string.
 */
@Document("data_models")
@CompoundIndex(name = "client_name_unique_idx", def = "{'clientId': 1, 'name': 1}", unique = true)
public class DataModel {

    @Id
    private String id;

    private String clientId;

    /** Human-readable unique name within the org (e.g. "OrderRequest", "UserPayload") */
    private String name;

    private String description;

    /**
     * JSON Schema Draft-07 document stored as a raw JSON string.
     * Example minimal schema:
     * <pre>
     * {
     *   "$schema": "http://json-schema.org/draft-07/schema#",
     *   "type": "object",
     *   "required": ["orderId", "amount"],
     *   "properties": {
     *     "orderId": { "type": "string" },
     *     "amount":  { "type": "number", "minimum": 0 }
     *   },
     *   "additionalProperties": false
     * }
     * </pre>
     */
    private String schemaJson;

    /** Friendly list of field names derived from the schema (denormalised for display). */
    private List<String> fieldNames;

    /** Comma-separated tag labels for organisation and filtering */
    private String tags;

    private boolean active = true;

    private String createdBy;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public DataModel() {
    }

    // ── Getters / Setters ──────────────────────────────────────────────────────

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getClientId() { return clientId; }
    public void setClientId(String clientId) { this.clientId = clientId; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getSchemaJson() { return schemaJson; }
    public void setSchemaJson(String schemaJson) { this.schemaJson = schemaJson; }

    public List<String> getFieldNames() { return fieldNames; }
    public void setFieldNames(List<String> fieldNames) { this.fieldNames = fieldNames; }

    public String getTags() { return tags; }
    public void setTags(String tags) { this.tags = tags; }

    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }

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
        DataModel that = (DataModel) o;
        return active == that.active &&
                Objects.equals(id, that.id) &&
                Objects.equals(clientId, that.clientId) &&
                Objects.equals(name, that.name);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id, clientId, name);
    }

    @Override
    public String toString() {
        return "DataModel{id='" + id + "', clientId='" + clientId + "', name='" + name + "'}";
    }

    public static Builder builder() { return new Builder(); }

    public static class Builder {
        private String id, clientId, name, description, schemaJson, tags, createdBy;
        private List<String> fieldNames;
        private boolean active = true;
        private LocalDateTime createdAt, updatedAt;

        public Builder id(String id) { this.id = id; return this; }
        public Builder clientId(String clientId) { this.clientId = clientId; return this; }
        public Builder name(String name) { this.name = name; return this; }
        public Builder description(String description) { this.description = description; return this; }
        public Builder schemaJson(String schemaJson) { this.schemaJson = schemaJson; return this; }
        public Builder fieldNames(List<String> fieldNames) { this.fieldNames = fieldNames; return this; }
        public Builder tags(String tags) { this.tags = tags; return this; }
        public Builder active(boolean active) { this.active = active; return this; }
        public Builder createdBy(String createdBy) { this.createdBy = createdBy; return this; }
        public Builder createdAt(LocalDateTime createdAt) { this.createdAt = createdAt; return this; }
        public Builder updatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; return this; }

        public DataModel build() {
            DataModel m = new DataModel();
            m.id = this.id;
            m.clientId = this.clientId;
            m.name = this.name;
            m.description = this.description;
            m.schemaJson = this.schemaJson;
            m.fieldNames = this.fieldNames;
            m.tags = this.tags;
            m.active = this.active;
            m.createdBy = this.createdBy;
            m.createdAt = this.createdAt;
            m.updatedAt = this.updatedAt;
            return m;
        }
    }
}
