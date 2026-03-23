package com.flowforge.integration.model;

import java.time.LocalDateTime;
import java.util.Objects;

public class ReplayAttempt {

    private String replayedBy;

    /**
     * Result: SUCCESS, FAILED
     */
    private String result;

    private String errorMessage;

    private LocalDateTime replayedAt;

    public ReplayAttempt() {
    }

    public ReplayAttempt(String replayedBy, String result, String errorMessage, LocalDateTime replayedAt) {
        this.replayedBy = replayedBy;
        this.result = result;
        this.errorMessage = errorMessage;
        this.replayedAt = replayedAt;
    }

    public String getReplayedBy() {
        return replayedBy;
    }

    public void setReplayedBy(String replayedBy) {
        this.replayedBy = replayedBy;
    }

    public String getResult() {
        return result;
    }

    public void setResult(String result) {
        this.result = result;
    }

    public String getErrorMessage() {
        return errorMessage;
    }

    public void setErrorMessage(String errorMessage) {
        this.errorMessage = errorMessage;
    }

    public LocalDateTime getReplayedAt() {
        return replayedAt;
    }

    public void setReplayedAt(LocalDateTime replayedAt) {
        this.replayedAt = replayedAt;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof ReplayAttempt)) return false;
        ReplayAttempt that = (ReplayAttempt) o;
        return Objects.equals(replayedBy, that.replayedBy) &&
                Objects.equals(result, that.result) &&
                Objects.equals(errorMessage, that.errorMessage) &&
                Objects.equals(replayedAt, that.replayedAt);
    }

    @Override
    public int hashCode() {
        return Objects.hash(replayedBy, result, errorMessage, replayedAt);
    }

    @Override
    public String toString() {
        return "ReplayAttempt{" +
                "replayedBy='" + replayedBy + '\'' +
                ", result='" + result + '\'' +
                ", errorMessage='" + errorMessage + '\'' +
                ", replayedAt=" + replayedAt +
                '}';
    }

    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private String replayedBy;
        private String result;
        private String errorMessage;
        private LocalDateTime replayedAt;

        public Builder replayedBy(String replayedBy) {
            this.replayedBy = replayedBy;
            return this;
        }

        public Builder result(String result) {
            this.result = result;
            return this;
        }

        public Builder errorMessage(String errorMessage) {
            this.errorMessage = errorMessage;
            return this;
        }

        public Builder replayedAt(LocalDateTime replayedAt) {
            this.replayedAt = replayedAt;
            return this;
        }

        public ReplayAttempt build() {
            return new ReplayAttempt(replayedBy, result, errorMessage, replayedAt);
        }
    }
}
