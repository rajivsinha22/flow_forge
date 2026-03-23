package com.flowforge.execution.dto;

import java.util.Map;
import java.util.Objects;

public class TriggerExecutionRequest {

    private Map<String, Object> input;
    private String triggerType; // API, WEBHOOK, CRON, KAFKA, SNS - defaults to API

    public TriggerExecutionRequest() {
    }

    public TriggerExecutionRequest(Map<String, Object> input, String triggerType) {
        this.input = input;
        this.triggerType = triggerType;
    }

    public Map<String, Object> getInput() { return input; }
    public void setInput(Map<String, Object> input) { this.input = input; }

    public String getTriggerType() { return triggerType; }
    public void setTriggerType(String triggerType) { this.triggerType = triggerType; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        TriggerExecutionRequest that = (TriggerExecutionRequest) o;
        return Objects.equals(input, that.input) &&
                Objects.equals(triggerType, that.triggerType);
    }

    @Override
    public int hashCode() {
        return Objects.hash(input, triggerType);
    }

    @Override
    public String toString() {
        return "TriggerExecutionRequest{input=" + input + ", triggerType='" + triggerType + '\'' + '}';
    }

    public static Builder builder() { return new Builder(); }

    public static class Builder {
        private Map<String, Object> input;
        private String triggerType;

        public Builder input(Map<String, Object> input) { this.input = input; return this; }
        public Builder triggerType(String triggerType) { this.triggerType = triggerType; return this; }

        public TriggerExecutionRequest build() {
            return new TriggerExecutionRequest(input, triggerType);
        }
    }
}
