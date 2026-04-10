package com.flowforge.workflow.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Objects;

/**
 * A data record instance that conforms to a {@link DataModel} JSON Schema.
 * <p>
 * Each ModelRecord stores actual JSON data validated against the linked DataModel's schema.
 * Model records can be linked to workflow executions via {@code modelRecordId}:
 * <ul>
 *   <li>READ scope — data is loaded into execution context before the workflow runs</li>
 *   <li>WRITE scope — same as READ, plus updated data is written back after successful execution</li>
 * </ul>
 */
@Document("model_records")
@CompoundIndex(name = "client_model_name_idx", def = "{'clientId': 1, 'namespace': 1, 'dataModelId': 1, 'name': 1}", unique = true)
public class ModelRecord {

    @Id
    private String id;

    @Indexed
    private String clientId;

    private String namespace = "default";

    /** Reference to the DataModel whose schema this record conforms to. */
    @Indexed
    private String dataModelId;

    /** Human-readable name for this record (unique per client + dataModel). */
    private String name;

    /** The actual data payload — a JSON object validated against the DataModel schema. */
    private Map<String, Object> data;

    private String createdBy;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public ModelRecord() {
    }

    // ── Getters / Setters ──────────────────────────────────────────────────────

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getClientId() { return clientId; }
    public void setClientId(String clientId) { this.clientId = clientId; }

    public String getNamespace() { return namespace; }
    public void setNamespace(String namespace) { this.namespace = namespace; }

    public String getDataModelId() { return dataModelId; }
    public void setDataModelId(String dataModelId) { this.dataModelId = dataModelId; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public Map<String, Object> getData() { return data; }
    public void setData(Map<String, Object> data) { this.data = data; }

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
        ModelRecord that = (ModelRecord) o;
        return Objects.equals(id, that.id) &&
                Objects.equals(clientId, that.clientId) &&
                Objects.equals(namespace, that.namespace) &&
                Objects.equals(dataModelId, that.dataModelId) &&
                Objects.equals(name, that.name);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id, clientId, namespace, dataModelId, name);
    }

    @Override
    public String toString() {
        return "ModelRecord{id='" + id + "', clientId='" + clientId +
                "', namespace='" + namespace + "', dataModelId='" + dataModelId + "', name='" + name + "'}";
    }

    public static Builder builder() { return new Builder(); }

    public static class Builder {
        private String id, clientId, namespace = "default", dataModelId, name, createdBy;
        private Map<String, Object> data;
        private LocalDateTime createdAt, updatedAt;

        public Builder id(String id) { this.id = id; return this; }
        public Builder clientId(String clientId) { this.clientId = clientId; return this; }
        public Builder namespace(String namespace) { this.namespace = namespace; return this; }
        public Builder dataModelId(String dataModelId) { this.dataModelId = dataModelId; return this; }
        public Builder name(String name) { this.name = name; return this; }
        public Builder data(Map<String, Object> data) { this.data = data; return this; }
        public Builder createdBy(String createdBy) { this.createdBy = createdBy; return this; }
        public Builder createdAt(LocalDateTime createdAt) { this.createdAt = createdAt; return this; }
        public Builder updatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; return this; }

        public ModelRecord build() {
            ModelRecord r = new ModelRecord();
            r.id = this.id;
            r.clientId = this.clientId;
            r.namespace = this.namespace;
            r.dataModelId = this.dataModelId;
            r.name = this.name;
            r.data = this.data;
            r.createdBy = this.createdBy;
            r.createdAt = this.createdAt;
            r.updatedAt = this.updatedAt;
            return r;
        }
    }
}
