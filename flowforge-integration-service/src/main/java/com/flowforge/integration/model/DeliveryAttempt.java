package com.flowforge.integration.model;

import java.time.LocalDateTime;
import java.util.Objects;

public class DeliveryAttempt {

    private int attemptNumber;

    private int httpStatus;

    private long durationMs;

    private String errorMessage;

    private LocalDateTime attemptedAt;

    public DeliveryAttempt() {
    }

    public DeliveryAttempt(int attemptNumber, int httpStatus, long durationMs,
                            String errorMessage, LocalDateTime attemptedAt) {
        this.attemptNumber = attemptNumber;
        this.httpStatus = httpStatus;
        this.durationMs = durationMs;
        this.errorMessage = errorMessage;
        this.attemptedAt = attemptedAt;
    }

    public int getAttemptNumber() {
        return attemptNumber;
    }

    public void setAttemptNumber(int attemptNumber) {
        this.attemptNumber = attemptNumber;
    }

    public int getHttpStatus() {
        return httpStatus;
    }

    public void setHttpStatus(int httpStatus) {
        this.httpStatus = httpStatus;
    }

    public long getDurationMs() {
        return durationMs;
    }

    public void setDurationMs(long durationMs) {
        this.durationMs = durationMs;
    }

    public String getErrorMessage() {
        return errorMessage;
    }

    public void setErrorMessage(String errorMessage) {
        this.errorMessage = errorMessage;
    }

    public LocalDateTime getAttemptedAt() {
        return attemptedAt;
    }

    public void setAttemptedAt(LocalDateTime attemptedAt) {
        this.attemptedAt = attemptedAt;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof DeliveryAttempt)) return false;
        DeliveryAttempt that = (DeliveryAttempt) o;
        return attemptNumber == that.attemptNumber &&
                httpStatus == that.httpStatus &&
                durationMs == that.durationMs &&
                Objects.equals(errorMessage, that.errorMessage) &&
                Objects.equals(attemptedAt, that.attemptedAt);
    }

    @Override
    public int hashCode() {
        return Objects.hash(attemptNumber, httpStatus, durationMs, errorMessage, attemptedAt);
    }

    @Override
    public String toString() {
        return "DeliveryAttempt{" +
                "attemptNumber=" + attemptNumber +
                ", httpStatus=" + httpStatus +
                ", durationMs=" + durationMs +
                ", errorMessage='" + errorMessage + '\'' +
                ", attemptedAt=" + attemptedAt +
                '}';
    }

    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private int attemptNumber;
        private int httpStatus;
        private long durationMs;
        private String errorMessage;
        private LocalDateTime attemptedAt;

        public Builder attemptNumber(int attemptNumber) {
            this.attemptNumber = attemptNumber;
            return this;
        }

        public Builder httpStatus(int httpStatus) {
            this.httpStatus = httpStatus;
            return this;
        }

        public Builder durationMs(long durationMs) {
            this.durationMs = durationMs;
            return this;
        }

        public Builder errorMessage(String errorMessage) {
            this.errorMessage = errorMessage;
            return this;
        }

        public Builder attemptedAt(LocalDateTime attemptedAt) {
            this.attemptedAt = attemptedAt;
            return this;
        }

        public DeliveryAttempt build() {
            return new DeliveryAttempt(attemptNumber, httpStatus, durationMs, errorMessage, attemptedAt);
        }
    }
}
