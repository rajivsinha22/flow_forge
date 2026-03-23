package com.flowforge.workflow.dto;

import java.time.LocalDateTime;
import java.util.Objects;

public class WorkflowSummaryDto {

    private String id;
    private String name;
    private String displayName;
    private String triggerType;
    private int version;
    private String status;
    private int stepCount;
    private LocalDateTime publishedAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public WorkflowSummaryDto() {
    }

    public WorkflowSummaryDto(String id, String name, String displayName, String triggerType,
                               int version, String status, int stepCount,
                               LocalDateTime publishedAt, LocalDateTime createdAt, LocalDateTime updatedAt) {
        this.id = id;
        this.name = name;
        this.displayName = displayName;
        this.triggerType = triggerType;
        this.version = version;
        this.status = status;
        this.stepCount = stepCount;
        this.publishedAt = publishedAt;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getDisplayName() { return displayName; }
    public void setDisplayName(String displayName) { this.displayName = displayName; }

    public String getTriggerType() { return triggerType; }
    public void setTriggerType(String triggerType) { this.triggerType = triggerType; }

    public int getVersion() { return version; }
    public void setVersion(int version) { this.version = version; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public int getStepCount() { return stepCount; }
    public void setStepCount(int stepCount) { this.stepCount = stepCount; }

    public LocalDateTime getPublishedAt() { return publishedAt; }
    public void setPublishedAt(LocalDateTime publishedAt) { this.publishedAt = publishedAt; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        WorkflowSummaryDto that = (WorkflowSummaryDto) o;
        return version == that.version &&
                stepCount == that.stepCount &&
                Objects.equals(id, that.id) &&
                Objects.equals(name, that.name) &&
                Objects.equals(displayName, that.displayName) &&
                Objects.equals(triggerType, that.triggerType) &&
                Objects.equals(status, that.status) &&
                Objects.equals(publishedAt, that.publishedAt) &&
                Objects.equals(createdAt, that.createdAt) &&
                Objects.equals(updatedAt, that.updatedAt);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id, name, displayName, triggerType, version, status,
                stepCount, publishedAt, createdAt, updatedAt);
    }

    @Override
    public String toString() {
        return "WorkflowSummaryDto{" +
                "id='" + id + '\'' +
                ", name='" + name + '\'' +
                ", displayName='" + displayName + '\'' +
                ", triggerType='" + triggerType + '\'' +
                ", version=" + version +
                ", status='" + status + '\'' +
                ", stepCount=" + stepCount +
                ", publishedAt=" + publishedAt +
                ", createdAt=" + createdAt +
                ", updatedAt=" + updatedAt +
                '}';
    }

    public static Builder builder() { return new Builder(); }

    public static class Builder {
        private String id;
        private String name;
        private String displayName;
        private String triggerType;
        private int version;
        private String status;
        private int stepCount;
        private LocalDateTime publishedAt;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;

        public Builder id(String id) { this.id = id; return this; }
        public Builder name(String name) { this.name = name; return this; }
        public Builder displayName(String displayName) { this.displayName = displayName; return this; }
        public Builder triggerType(String triggerType) { this.triggerType = triggerType; return this; }
        public Builder version(int version) { this.version = version; return this; }
        public Builder status(String status) { this.status = status; return this; }
        public Builder stepCount(int stepCount) { this.stepCount = stepCount; return this; }
        public Builder publishedAt(LocalDateTime publishedAt) { this.publishedAt = publishedAt; return this; }
        public Builder createdAt(LocalDateTime createdAt) { this.createdAt = createdAt; return this; }
        public Builder updatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; return this; }

        public WorkflowSummaryDto build() {
            return new WorkflowSummaryDto(id, name, displayName, triggerType, version, status,
                    stepCount, publishedAt, createdAt, updatedAt);
        }
    }
}
