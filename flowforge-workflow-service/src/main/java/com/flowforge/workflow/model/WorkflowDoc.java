package com.flowforge.workflow.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.Objects;

@Document("workflow_docs")
@CompoundIndexes({
    @CompoundIndex(name = "client_ns_workflow_unique_idx", def = "{'clientId': 1, 'namespace': 1, 'workflowId': 1}", unique = true)
})
public class WorkflowDoc {

    @Id
    private String id;

    private String clientId;
    private String namespace;
    private String workflowId;
    private Integer workflowVersion;
    private String markdown;
    private Instant generatedAt;
    private String editedBy;
    private Instant editedAt;
    private Instant createdAt;

    public WorkflowDoc() {
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getClientId() { return clientId; }
    public void setClientId(String clientId) { this.clientId = clientId; }

    public String getNamespace() { return namespace; }
    public void setNamespace(String namespace) { this.namespace = namespace; }

    public String getWorkflowId() { return workflowId; }
    public void setWorkflowId(String workflowId) { this.workflowId = workflowId; }

    public Integer getWorkflowVersion() { return workflowVersion; }
    public void setWorkflowVersion(Integer workflowVersion) { this.workflowVersion = workflowVersion; }

    public String getMarkdown() { return markdown; }
    public void setMarkdown(String markdown) { this.markdown = markdown; }

    public Instant getGeneratedAt() { return generatedAt; }
    public void setGeneratedAt(Instant generatedAt) { this.generatedAt = generatedAt; }

    public String getEditedBy() { return editedBy; }
    public void setEditedBy(String editedBy) { this.editedBy = editedBy; }

    public Instant getEditedAt() { return editedAt; }
    public void setEditedAt(Instant editedAt) { this.editedAt = editedAt; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        WorkflowDoc that = (WorkflowDoc) o;
        return Objects.equals(id, that.id) &&
                Objects.equals(clientId, that.clientId) &&
                Objects.equals(namespace, that.namespace) &&
                Objects.equals(workflowId, that.workflowId) &&
                Objects.equals(workflowVersion, that.workflowVersion) &&
                Objects.equals(markdown, that.markdown) &&
                Objects.equals(generatedAt, that.generatedAt) &&
                Objects.equals(editedBy, that.editedBy) &&
                Objects.equals(editedAt, that.editedAt) &&
                Objects.equals(createdAt, that.createdAt);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id, clientId, namespace, workflowId, workflowVersion, markdown,
                generatedAt, editedBy, editedAt, createdAt);
    }

    @Override
    public String toString() {
        return "WorkflowDoc{" +
                "id='" + id + '\'' +
                ", clientId='" + clientId + '\'' +
                ", namespace='" + namespace + '\'' +
                ", workflowId='" + workflowId + '\'' +
                ", workflowVersion=" + workflowVersion +
                ", generatedAt=" + generatedAt +
                ", editedBy='" + editedBy + '\'' +
                ", editedAt=" + editedAt +
                '}';
    }

    public static Builder builder() { return new Builder(); }

    public static class Builder {
        private String id;
        private String clientId;
        private String namespace;
        private String workflowId;
        private Integer workflowVersion;
        private String markdown;
        private Instant generatedAt;
        private String editedBy;
        private Instant editedAt;
        private Instant createdAt;

        public Builder id(String id) { this.id = id; return this; }
        public Builder clientId(String clientId) { this.clientId = clientId; return this; }
        public Builder namespace(String namespace) { this.namespace = namespace; return this; }
        public Builder workflowId(String workflowId) { this.workflowId = workflowId; return this; }
        public Builder workflowVersion(Integer workflowVersion) { this.workflowVersion = workflowVersion; return this; }
        public Builder markdown(String markdown) { this.markdown = markdown; return this; }
        public Builder generatedAt(Instant generatedAt) { this.generatedAt = generatedAt; return this; }
        public Builder editedBy(String editedBy) { this.editedBy = editedBy; return this; }
        public Builder editedAt(Instant editedAt) { this.editedAt = editedAt; return this; }
        public Builder createdAt(Instant createdAt) { this.createdAt = createdAt; return this; }

        public WorkflowDoc build() {
            WorkflowDoc d = new WorkflowDoc();
            d.id = this.id;
            d.clientId = this.clientId;
            d.namespace = this.namespace;
            d.workflowId = this.workflowId;
            d.workflowVersion = this.workflowVersion;
            d.markdown = this.markdown;
            d.generatedAt = this.generatedAt;
            d.editedBy = this.editedBy;
            d.editedAt = this.editedAt;
            d.createdAt = this.createdAt;
            return d;
        }
    }
}
