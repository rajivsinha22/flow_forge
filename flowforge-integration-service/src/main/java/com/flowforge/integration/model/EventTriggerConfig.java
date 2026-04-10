package com.flowforge.integration.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.index.Indexed;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Objects;
import com.flowforge.integration.model.TriggerCondition;

@Document("event_triggers")
public class EventTriggerConfig {

    @Id
    private String id;

    @Indexed
    private String clientId;

    private String namespace = "default";

    private String name;

    /**
     * Source type: KAFKA, CRON
     */
    private String sourceType;

    private String workflowId;

    private String workflowName;

    /**
     * Kafka topic name or cron expression
     */
    private String topicOrUrl;

    /**
     * SpEL expression for filtering events
     */
    private String filterExpression;

    /**
     * Maps workflow input fields to JSON paths in the incoming payload
     * Key: workflowInputField, Value: jsonPath
     */
    private Map<String, String> payloadMapping;

    /**
     * Structured condition tree (replaces or complements filterExpression).
     * If both are set, BOTH must pass.
     */
    private TriggerCondition condition;

    /**
     * What to do when the trigger fires:
     *   FIRE_WORKFLOW  — start a new workflow execution (default)
     *   RESUME_WAIT    — resume an existing wait state
     */
    private String triggerAction;  // "FIRE_WORKFLOW" | "RESUME_WAIT"

    /**
     * For RESUME_WAIT action — the execution ID to resume.
     * Can be a literal ID or a JSON path expression like "${event.executionId}".
     */
    private String resumeExecutionId;

    /**
     * For RESUME_WAIT action — the stepId of the wait state to resume.
     */
    private String resumeStepId;

    /**
     * For RESUME_WAIT action — alternatively, the wait token field path in the event.
     * e.g. "data.waitToken" means extract the token from event.data.waitToken
     */
    private String resumeTokenPath;

    private boolean enabled;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    public EventTriggerConfig() {
    }

    public EventTriggerConfig(String id, String clientId, String name, String sourceType,
                               String workflowId, String workflowName, String topicOrUrl,
                               String filterExpression, Map<String, String> payloadMapping,
                               TriggerCondition condition, String triggerAction,
                               String resumeExecutionId, String resumeStepId, String resumeTokenPath,
                               boolean enabled, LocalDateTime createdAt, LocalDateTime updatedAt) {
        this.id = id;
        this.clientId = clientId;
        this.name = name;
        this.sourceType = sourceType;
        this.workflowId = workflowId;
        this.workflowName = workflowName;
        this.topicOrUrl = topicOrUrl;
        this.filterExpression = filterExpression;
        this.payloadMapping = payloadMapping;
        this.condition = condition;
        this.triggerAction = triggerAction;
        this.resumeExecutionId = resumeExecutionId;
        this.resumeStepId = resumeStepId;
        this.resumeTokenPath = resumeTokenPath;
        this.enabled = enabled;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getClientId() {
        return clientId;
    }

    public void setClientId(String clientId) {
        this.clientId = clientId;
    }

    public String getNamespace() {
        return namespace;
    }

    public void setNamespace(String namespace) {
        this.namespace = namespace;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getSourceType() {
        return sourceType;
    }

    public void setSourceType(String sourceType) {
        this.sourceType = sourceType;
    }

    public String getWorkflowId() {
        return workflowId;
    }

    public void setWorkflowId(String workflowId) {
        this.workflowId = workflowId;
    }

    public String getWorkflowName() {
        return workflowName;
    }

    public void setWorkflowName(String workflowName) {
        this.workflowName = workflowName;
    }

    public String getTopicOrUrl() {
        return topicOrUrl;
    }

    public void setTopicOrUrl(String topicOrUrl) {
        this.topicOrUrl = topicOrUrl;
    }

    public String getFilterExpression() {
        return filterExpression;
    }

    public void setFilterExpression(String filterExpression) {
        this.filterExpression = filterExpression;
    }

    public Map<String, String> getPayloadMapping() {
        return payloadMapping;
    }

    public void setPayloadMapping(Map<String, String> payloadMapping) {
        this.payloadMapping = payloadMapping;
    }

    public TriggerCondition getCondition() {
        return condition;
    }

    public void setCondition(TriggerCondition condition) {
        this.condition = condition;
    }

    public String getTriggerAction() {
        return triggerAction;
    }

    public void setTriggerAction(String triggerAction) {
        this.triggerAction = triggerAction;
    }

    public String getResumeExecutionId() {
        return resumeExecutionId;
    }

    public void setResumeExecutionId(String resumeExecutionId) {
        this.resumeExecutionId = resumeExecutionId;
    }

    public String getResumeStepId() {
        return resumeStepId;
    }

    public void setResumeStepId(String resumeStepId) {
        this.resumeStepId = resumeStepId;
    }

    public String getResumeTokenPath() {
        return resumeTokenPath;
    }

    public void setResumeTokenPath(String resumeTokenPath) {
        this.resumeTokenPath = resumeTokenPath;
    }

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof EventTriggerConfig)) return false;
        EventTriggerConfig that = (EventTriggerConfig) o;
        return java.util.Objects.equals(id, that.id);
    }

    @Override
    public int hashCode() {
        return java.util.Objects.hashCode(id);
    }

    @Override
    public String toString() {
        return "EventTriggerConfig{" +
                "id='" + id + '\'' +
                ", clientId='" + clientId + '\'' +
                ", name='" + name + '\'' +
                ", sourceType='" + sourceType + '\'' +
                ", workflowId='" + workflowId + '\'' +
                ", enabled=" + enabled +
                '}';
    }

    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private String id;
        private String clientId;
        private String namespace = "default";
        private String name;
        private String sourceType;
        private String workflowId;
        private String workflowName;
        private String topicOrUrl;
        private String filterExpression;
        private Map<String, String> payloadMapping;
        private TriggerCondition condition;
        private String triggerAction;
        private String resumeExecutionId;
        private String resumeStepId;
        private String resumeTokenPath;
        private boolean enabled;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;

        public Builder id(String id) { this.id = id; return this; }
        public Builder clientId(String clientId) { this.clientId = clientId; return this; }
        public Builder namespace(String namespace) { this.namespace = namespace; return this; }
        public Builder name(String name) { this.name = name; return this; }
        public Builder sourceType(String sourceType) { this.sourceType = sourceType; return this; }
        public Builder workflowId(String workflowId) { this.workflowId = workflowId; return this; }
        public Builder workflowName(String workflowName) { this.workflowName = workflowName; return this; }
        public Builder topicOrUrl(String topicOrUrl) { this.topicOrUrl = topicOrUrl; return this; }
        public Builder filterExpression(String filterExpression) { this.filterExpression = filterExpression; return this; }
        public Builder payloadMapping(Map<String, String> payloadMapping) { this.payloadMapping = payloadMapping; return this; }
        public Builder condition(TriggerCondition condition) { this.condition = condition; return this; }
        public Builder triggerAction(String triggerAction) { this.triggerAction = triggerAction; return this; }
        public Builder resumeExecutionId(String resumeExecutionId) { this.resumeExecutionId = resumeExecutionId; return this; }
        public Builder resumeStepId(String resumeStepId) { this.resumeStepId = resumeStepId; return this; }
        public Builder resumeTokenPath(String resumeTokenPath) { this.resumeTokenPath = resumeTokenPath; return this; }
        public Builder enabled(boolean enabled) { this.enabled = enabled; return this; }
        public Builder createdAt(LocalDateTime createdAt) { this.createdAt = createdAt; return this; }
        public Builder updatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; return this; }

        public EventTriggerConfig build() {
            EventTriggerConfig config = new EventTriggerConfig(id, clientId, name, sourceType, workflowId, workflowName,
                    topicOrUrl, filterExpression, payloadMapping, condition, triggerAction,
                    resumeExecutionId, resumeStepId, resumeTokenPath, enabled, createdAt, updatedAt);
            config.setNamespace(this.namespace);
            return config;
        }
    }
}
