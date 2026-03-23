package com.flowforge.execution.model;

import java.util.Map;
import java.util.Objects;

/**
 * Mirrors WorkflowDefinition.StepDef from the workflow service.
 * Received as part of the workflow definition when starting an execution.
 */
public class StepDef {

    private String stepId;
    private String name;
    private String type; // HTTP, CONDITION, LOOP, DELAY, SCRIPT, NOTIFY, SUB_WORKFLOW
    private Map<String, Object> config;
    private RetryPolicy retryPolicy;
    private String onSuccess;
    private String onFailure;
    private double positionX;
    private double positionY;

    public StepDef() {
    }

    public StepDef(String stepId, String name, String type, Map<String, Object> config,
                   RetryPolicy retryPolicy, String onSuccess, String onFailure,
                   double positionX, double positionY) {
        this.stepId = stepId;
        this.name = name;
        this.type = type;
        this.config = config;
        this.retryPolicy = retryPolicy;
        this.onSuccess = onSuccess;
        this.onFailure = onFailure;
        this.positionX = positionX;
        this.positionY = positionY;
    }

    public String getStepId() { return stepId; }
    public void setStepId(String stepId) { this.stepId = stepId; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public Map<String, Object> getConfig() { return config; }
    public void setConfig(Map<String, Object> config) { this.config = config; }

    public RetryPolicy getRetryPolicy() { return retryPolicy; }
    public void setRetryPolicy(RetryPolicy retryPolicy) { this.retryPolicy = retryPolicy; }

    public String getOnSuccess() { return onSuccess; }
    public void setOnSuccess(String onSuccess) { this.onSuccess = onSuccess; }

    public String getOnFailure() { return onFailure; }
    public void setOnFailure(String onFailure) { this.onFailure = onFailure; }

    public double getPositionX() { return positionX; }
    public void setPositionX(double positionX) { this.positionX = positionX; }

    public double getPositionY() { return positionY; }
    public void setPositionY(double positionY) { this.positionY = positionY; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        StepDef that = (StepDef) o;
        return Double.compare(that.positionX, positionX) == 0 &&
                Double.compare(that.positionY, positionY) == 0 &&
                Objects.equals(stepId, that.stepId) &&
                Objects.equals(name, that.name) &&
                Objects.equals(type, that.type) &&
                Objects.equals(config, that.config) &&
                Objects.equals(retryPolicy, that.retryPolicy) &&
                Objects.equals(onSuccess, that.onSuccess) &&
                Objects.equals(onFailure, that.onFailure);
    }

    @Override
    public int hashCode() {
        return Objects.hash(stepId, name, type, config, retryPolicy, onSuccess, onFailure, positionX, positionY);
    }

    @Override
    public String toString() {
        return "StepDef{stepId='" + stepId + '\'' +
                ", name='" + name + '\'' +
                ", type='" + type + '\'' + '}';
    }

    public static Builder builder() { return new Builder(); }

    public static class Builder {
        private String stepId;
        private String name;
        private String type;
        private Map<String, Object> config;
        private RetryPolicy retryPolicy;
        private String onSuccess;
        private String onFailure;
        private double positionX;
        private double positionY;

        public Builder stepId(String stepId) { this.stepId = stepId; return this; }
        public Builder name(String name) { this.name = name; return this; }
        public Builder type(String type) { this.type = type; return this; }
        public Builder config(Map<String, Object> config) { this.config = config; return this; }
        public Builder retryPolicy(RetryPolicy retryPolicy) { this.retryPolicy = retryPolicy; return this; }
        public Builder onSuccess(String onSuccess) { this.onSuccess = onSuccess; return this; }
        public Builder onFailure(String onFailure) { this.onFailure = onFailure; return this; }
        public Builder positionX(double positionX) { this.positionX = positionX; return this; }
        public Builder positionY(double positionY) { this.positionY = positionY; return this; }

        public StepDef build() {
            return new StepDef(stepId, name, type, config, retryPolicy, onSuccess, onFailure, positionX, positionY);
        }
    }
}
