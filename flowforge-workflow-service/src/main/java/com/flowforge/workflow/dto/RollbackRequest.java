package com.flowforge.workflow.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.util.Objects;

public class RollbackRequest {

    @NotNull(message = "Target version is required")
    @Min(value = 1, message = "Target version must be at least 1")
    private Integer targetVersion;

    public RollbackRequest() {
    }

    public RollbackRequest(Integer targetVersion) {
        this.targetVersion = targetVersion;
    }

    public Integer getTargetVersion() { return targetVersion; }
    public void setTargetVersion(Integer targetVersion) { this.targetVersion = targetVersion; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        RollbackRequest that = (RollbackRequest) o;
        return Objects.equals(targetVersion, that.targetVersion);
    }

    @Override
    public int hashCode() {
        return Objects.hash(targetVersion);
    }

    @Override
    public String toString() {
        return "RollbackRequest{targetVersion=" + targetVersion + '}';
    }

    public static Builder builder() { return new Builder(); }

    public static class Builder {
        private Integer targetVersion;

        public Builder targetVersion(Integer targetVersion) { this.targetVersion = targetVersion; return this; }

        public RollbackRequest build() {
            return new RollbackRequest(targetVersion);
        }
    }
}
