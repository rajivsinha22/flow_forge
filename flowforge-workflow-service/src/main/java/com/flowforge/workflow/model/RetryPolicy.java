package com.flowforge.workflow.model;

import java.util.Objects;

public class RetryPolicy {

    private int maxRetries;
    private String strategy; // FIXED, EXPONENTIAL, LINEAR
    private long initialDelayMs;
    private long maxDelayMs;

    public RetryPolicy() {
    }

    public RetryPolicy(int maxRetries, String strategy, long initialDelayMs, long maxDelayMs) {
        this.maxRetries = maxRetries;
        this.strategy = strategy;
        this.initialDelayMs = initialDelayMs;
        this.maxDelayMs = maxDelayMs;
    }

    public int getMaxRetries() { return maxRetries; }
    public void setMaxRetries(int maxRetries) { this.maxRetries = maxRetries; }

    public String getStrategy() { return strategy; }
    public void setStrategy(String strategy) { this.strategy = strategy; }

    public long getInitialDelayMs() { return initialDelayMs; }
    public void setInitialDelayMs(long initialDelayMs) { this.initialDelayMs = initialDelayMs; }

    public long getMaxDelayMs() { return maxDelayMs; }
    public void setMaxDelayMs(long maxDelayMs) { this.maxDelayMs = maxDelayMs; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        RetryPolicy that = (RetryPolicy) o;
        return maxRetries == that.maxRetries &&
                initialDelayMs == that.initialDelayMs &&
                maxDelayMs == that.maxDelayMs &&
                Objects.equals(strategy, that.strategy);
    }

    @Override
    public int hashCode() {
        return Objects.hash(maxRetries, strategy, initialDelayMs, maxDelayMs);
    }

    @Override
    public String toString() {
        return "RetryPolicy{maxRetries=" + maxRetries +
                ", strategy='" + strategy + '\'' +
                ", initialDelayMs=" + initialDelayMs +
                ", maxDelayMs=" + maxDelayMs + '}';
    }

    public static Builder builder() { return new Builder(); }

    public static class Builder {
        private int maxRetries;
        private String strategy;
        private long initialDelayMs;
        private long maxDelayMs;

        public Builder maxRetries(int maxRetries) { this.maxRetries = maxRetries; return this; }
        public Builder strategy(String strategy) { this.strategy = strategy; return this; }
        public Builder initialDelayMs(long initialDelayMs) { this.initialDelayMs = initialDelayMs; return this; }
        public Builder maxDelayMs(long maxDelayMs) { this.maxDelayMs = maxDelayMs; return this; }

        public RetryPolicy build() {
            return new RetryPolicy(maxRetries, strategy, initialDelayMs, maxDelayMs);
        }
    }
}
