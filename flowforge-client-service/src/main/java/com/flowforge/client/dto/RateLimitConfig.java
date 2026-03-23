package com.flowforge.client.dto;

import java.util.Objects;

public class RateLimitConfig {

    private int execPerMinute;
    private int burstCapacity;

    public RateLimitConfig() {
    }

    public RateLimitConfig(int execPerMinute, int burstCapacity) {
        this.execPerMinute = execPerMinute;
        this.burstCapacity = burstCapacity;
    }

    public int getExecPerMinute() {
        return execPerMinute;
    }

    public void setExecPerMinute(int execPerMinute) {
        this.execPerMinute = execPerMinute;
    }

    public int getBurstCapacity() {
        return burstCapacity;
    }

    public void setBurstCapacity(int burstCapacity) {
        this.burstCapacity = burstCapacity;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        RateLimitConfig that = (RateLimitConfig) o;
        return execPerMinute == that.execPerMinute &&
                burstCapacity == that.burstCapacity;
    }

    @Override
    public int hashCode() {
        return Objects.hash(execPerMinute, burstCapacity);
    }

    @Override
    public String toString() {
        return "RateLimitConfig{" +
                "execPerMinute=" + execPerMinute +
                ", burstCapacity=" + burstCapacity +
                '}';
    }

    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private int execPerMinute;
        private int burstCapacity;

        public Builder execPerMinute(int execPerMinute) {
            this.execPerMinute = execPerMinute;
            return this;
        }

        public Builder burstCapacity(int burstCapacity) {
            this.burstCapacity = burstCapacity;
            return this;
        }

        public RateLimitConfig build() {
            return new RateLimitConfig(execPerMinute, burstCapacity);
        }
    }
}
