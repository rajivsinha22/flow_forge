package com.flowforge.workflow.dto;

import jakarta.validation.constraints.NotBlank;

import java.util.Objects;

public class PublishRequest {

    @NotBlank(message = "Change log is required when publishing a workflow")
    private String changeLog;

    public PublishRequest() {
    }

    public PublishRequest(String changeLog) {
        this.changeLog = changeLog;
    }

    public String getChangeLog() { return changeLog; }
    public void setChangeLog(String changeLog) { this.changeLog = changeLog; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        PublishRequest that = (PublishRequest) o;
        return Objects.equals(changeLog, that.changeLog);
    }

    @Override
    public int hashCode() {
        return Objects.hash(changeLog);
    }

    @Override
    public String toString() {
        return "PublishRequest{changeLog='" + changeLog + '\'' + '}';
    }

    public static Builder builder() { return new Builder(); }

    public static class Builder {
        private String changeLog;

        public Builder changeLog(String changeLog) { this.changeLog = changeLog; return this; }

        public PublishRequest build() {
            return new PublishRequest(changeLog);
        }
    }
}
