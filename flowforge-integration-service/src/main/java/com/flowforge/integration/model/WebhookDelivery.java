package com.flowforge.integration.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.index.Indexed;

import java.time.LocalDateTime;
import java.util.List;

@Document("webhook_deliveries")
public class WebhookDelivery {

    @Id
    private String id;

    @Indexed
    private String clientId;

    private String executionId;

    /**
     * Event type: EXECUTION_COMPLETED, EXECUTION_FAILED, STEP_DEAD_LETTERED, etc.
     */
    private String eventType;

    private String targetUrl;

    private String payloadJson;

    private String signatureHeader;

    /**
     * Status: PENDING, DELIVERED, FAILED, DISCARDED
     */
    private String status;

    private int attemptCount;

    private int maxAttempts;

    private List<DeliveryAttempt> attempts;

    private LocalDateTime createdAt;

    private LocalDateTime nextRetryAt;

    public WebhookDelivery() {
    }

    public WebhookDelivery(String id, String clientId, String executionId, String eventType,
                            String targetUrl, String payloadJson, String signatureHeader,
                            String status, int attemptCount, int maxAttempts,
                            List<DeliveryAttempt> attempts, LocalDateTime createdAt,
                            LocalDateTime nextRetryAt) {
        this.id = id;
        this.clientId = clientId;
        this.executionId = executionId;
        this.eventType = eventType;
        this.targetUrl = targetUrl;
        this.payloadJson = payloadJson;
        this.signatureHeader = signatureHeader;
        this.status = status;
        this.attemptCount = attemptCount;
        this.maxAttempts = maxAttempts;
        this.attempts = attempts;
        this.createdAt = createdAt;
        this.nextRetryAt = nextRetryAt;
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

    public String getExecutionId() {
        return executionId;
    }

    public void setExecutionId(String executionId) {
        this.executionId = executionId;
    }

    public String getEventType() {
        return eventType;
    }

    public void setEventType(String eventType) {
        this.eventType = eventType;
    }

    public String getTargetUrl() {
        return targetUrl;
    }

    public void setTargetUrl(String targetUrl) {
        this.targetUrl = targetUrl;
    }

    public String getPayloadJson() {
        return payloadJson;
    }

    public void setPayloadJson(String payloadJson) {
        this.payloadJson = payloadJson;
    }

    public String getSignatureHeader() {
        return signatureHeader;
    }

    public void setSignatureHeader(String signatureHeader) {
        this.signatureHeader = signatureHeader;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public int getAttemptCount() {
        return attemptCount;
    }

    public void setAttemptCount(int attemptCount) {
        this.attemptCount = attemptCount;
    }

    public int getMaxAttempts() {
        return maxAttempts;
    }

    public void setMaxAttempts(int maxAttempts) {
        this.maxAttempts = maxAttempts;
    }

    public List<DeliveryAttempt> getAttempts() {
        return attempts;
    }

    public void setAttempts(List<DeliveryAttempt> attempts) {
        this.attempts = attempts;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getNextRetryAt() {
        return nextRetryAt;
    }

    public void setNextRetryAt(LocalDateTime nextRetryAt) {
        this.nextRetryAt = nextRetryAt;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof WebhookDelivery)) return false;
        WebhookDelivery that = (WebhookDelivery) o;
        return java.util.Objects.equals(id, that.id);
    }

    @Override
    public int hashCode() {
        return java.util.Objects.hashCode(id);
    }

    @Override
    public String toString() {
        return "WebhookDelivery{" +
                "id='" + id + '\'' +
                ", clientId='" + clientId + '\'' +
                ", executionId='" + executionId + '\'' +
                ", eventType='" + eventType + '\'' +
                ", targetUrl='" + targetUrl + '\'' +
                ", status='" + status + '\'' +
                ", attemptCount=" + attemptCount +
                '}';
    }

    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private String id;
        private String clientId;
        private String executionId;
        private String eventType;
        private String targetUrl;
        private String payloadJson;
        private String signatureHeader;
        private String status;
        private int attemptCount;
        private int maxAttempts;
        private List<DeliveryAttempt> attempts;
        private LocalDateTime createdAt;
        private LocalDateTime nextRetryAt;

        public Builder id(String id) { this.id = id; return this; }
        public Builder clientId(String clientId) { this.clientId = clientId; return this; }
        public Builder executionId(String executionId) { this.executionId = executionId; return this; }
        public Builder eventType(String eventType) { this.eventType = eventType; return this; }
        public Builder targetUrl(String targetUrl) { this.targetUrl = targetUrl; return this; }
        public Builder payloadJson(String payloadJson) { this.payloadJson = payloadJson; return this; }
        public Builder signatureHeader(String signatureHeader) { this.signatureHeader = signatureHeader; return this; }
        public Builder status(String status) { this.status = status; return this; }
        public Builder attemptCount(int attemptCount) { this.attemptCount = attemptCount; return this; }
        public Builder maxAttempts(int maxAttempts) { this.maxAttempts = maxAttempts; return this; }
        public Builder attempts(List<DeliveryAttempt> attempts) { this.attempts = attempts; return this; }
        public Builder createdAt(LocalDateTime createdAt) { this.createdAt = createdAt; return this; }
        public Builder nextRetryAt(LocalDateTime nextRetryAt) { this.nextRetryAt = nextRetryAt; return this; }

        public WebhookDelivery build() {
            return new WebhookDelivery(id, clientId, executionId, eventType, targetUrl, payloadJson,
                    signatureHeader, status, attemptCount, maxAttempts, attempts, createdAt, nextRetryAt);
        }
    }
}
