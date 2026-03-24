package com.flowforge.execution.model;

import java.time.LocalDateTime;
import java.util.Objects;

/**
 * Records the outcome of a single execution attempt for a step.
 *
 * <p>A {@link StepExecution} accumulates one {@code StepRetryAttempt} entry per
 * failed attempt before the step is either retried or dead-lettered. This gives
 * operators a complete per-attempt error trail rather than only seeing the last
 * error message.
 *
 * <p>The full list is also serialised into the {@code STEP_DEAD_LETTERED} Kafka
 * event and stored on the {@code DlqMessage} in the integration service so the
 * DLQ console can show the complete retry history without making a second call
 * back to the execution engine.
 */
public class StepRetryAttempt {

    /** 1-based attempt number (1 = first try, 2 = first retry, …). */
    private int attemptNumber;

    /** Error message produced by this attempt. */
    private String errorMessage;

    /** Wall-clock time when this attempt failed. */
    private LocalDateTime failedAt;

    /**
     * How long this attempt ran before failing.
     * May be 0 if timing is unavailable (e.g. a thrown exception before any I/O).
     */
    private long durationMs;

    public StepRetryAttempt() {}

    public StepRetryAttempt(int attemptNumber, String errorMessage,
                             LocalDateTime failedAt, long durationMs) {
        this.attemptNumber = attemptNumber;
        this.errorMessage = errorMessage;
        this.failedAt = failedAt;
        this.durationMs = durationMs;
    }

    // ─── Getters / Setters ──────────────────────────────────────────────────

    public int getAttemptNumber() { return attemptNumber; }
    public void setAttemptNumber(int attemptNumber) { this.attemptNumber = attemptNumber; }

    public String getErrorMessage() { return errorMessage; }
    public void setErrorMessage(String errorMessage) { this.errorMessage = errorMessage; }

    public LocalDateTime getFailedAt() { return failedAt; }
    public void setFailedAt(LocalDateTime failedAt) { this.failedAt = failedAt; }

    public long getDurationMs() { return durationMs; }
    public void setDurationMs(long durationMs) { this.durationMs = durationMs; }

    // ─── equals / hashCode / toString ───────────────────────────────────────

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof StepRetryAttempt)) return false;
        StepRetryAttempt that = (StepRetryAttempt) o;
        return attemptNumber == that.attemptNumber
                && durationMs == that.durationMs
                && Objects.equals(errorMessage, that.errorMessage)
                && Objects.equals(failedAt, that.failedAt);
    }

    @Override
    public int hashCode() {
        return Objects.hash(attemptNumber, errorMessage, failedAt, durationMs);
    }

    @Override
    public String toString() {
        return "StepRetryAttempt{attemptNumber=" + attemptNumber
                + ", failedAt=" + failedAt
                + ", errorMessage='" + errorMessage + '\'' + '}';
    }

    // ─── Builder ────────────────────────────────────────────────────────────

    public static Builder builder() { return new Builder(); }

    public static class Builder {
        private int attemptNumber;
        private String errorMessage;
        private LocalDateTime failedAt;
        private long durationMs;

        public Builder attemptNumber(int n) { this.attemptNumber = n; return this; }
        public Builder errorMessage(String m) { this.errorMessage = m; return this; }
        public Builder failedAt(LocalDateTime t) { this.failedAt = t; return this; }
        public Builder durationMs(long d) { this.durationMs = d; return this; }

        public StepRetryAttempt build() {
            return new StepRetryAttempt(attemptNumber, errorMessage, failedAt, durationMs);
        }
    }
}
