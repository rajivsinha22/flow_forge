package com.flowforge.billing.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.Map;
import java.util.Objects;

@Document(collection = "payment_events")
public class PaymentEvent {

    @Id
    private String id;

    private String clientId;

    private String stripeEventId;

    private String eventType;

    private String description;

    private long amount;

    private String currency;

    private String status;

    private Map<String, Object> metadata;

    private Instant receivedAt;

    public PaymentEvent() {
    }

    public PaymentEvent(String id, String clientId, String stripeEventId, String eventType,
                        String description, long amount, String currency, String status,
                        Map<String, Object> metadata, Instant receivedAt) {
        this.id = id;
        this.clientId = clientId;
        this.stripeEventId = stripeEventId;
        this.eventType = eventType;
        this.description = description;
        this.amount = amount;
        this.currency = currency;
        this.status = status;
        this.metadata = metadata;
        this.receivedAt = receivedAt;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getClientId() { return clientId; }
    public void setClientId(String clientId) { this.clientId = clientId; }

    public String getStripeEventId() { return stripeEventId; }
    public void setStripeEventId(String stripeEventId) { this.stripeEventId = stripeEventId; }

    public String getEventType() { return eventType; }
    public void setEventType(String eventType) { this.eventType = eventType; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public long getAmount() { return amount; }
    public void setAmount(long amount) { this.amount = amount; }

    public String getCurrency() { return currency; }
    public void setCurrency(String currency) { this.currency = currency; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public Map<String, Object> getMetadata() { return metadata; }
    public void setMetadata(Map<String, Object> metadata) { this.metadata = metadata; }

    public Instant getReceivedAt() { return receivedAt; }
    public void setReceivedAt(Instant receivedAt) { this.receivedAt = receivedAt; }

    @Override
    public String toString() {
        return "PaymentEvent{" +
                "id='" + id + '\'' +
                ", clientId='" + clientId + '\'' +
                ", stripeEventId='" + stripeEventId + '\'' +
                ", eventType='" + eventType + '\'' +
                ", description='" + description + '\'' +
                ", amount=" + amount +
                ", currency='" + currency + '\'' +
                ", status='" + status + '\'' +
                ", receivedAt=" + receivedAt +
                '}';
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        PaymentEvent that = (PaymentEvent) o;
        return amount == that.amount &&
                Objects.equals(id, that.id) &&
                Objects.equals(clientId, that.clientId) &&
                Objects.equals(stripeEventId, that.stripeEventId) &&
                Objects.equals(eventType, that.eventType) &&
                Objects.equals(description, that.description) &&
                Objects.equals(currency, that.currency) &&
                Objects.equals(status, that.status) &&
                Objects.equals(metadata, that.metadata) &&
                Objects.equals(receivedAt, that.receivedAt);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id, clientId, stripeEventId, eventType, description,
                amount, currency, status, metadata, receivedAt);
    }

    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private String id;
        private String clientId;
        private String stripeEventId;
        private String eventType;
        private String description;
        private long amount;
        private String currency;
        private String status;
        private Map<String, Object> metadata;
        private Instant receivedAt;

        public Builder id(String id) { this.id = id; return this; }
        public Builder clientId(String clientId) { this.clientId = clientId; return this; }
        public Builder stripeEventId(String stripeEventId) { this.stripeEventId = stripeEventId; return this; }
        public Builder eventType(String eventType) { this.eventType = eventType; return this; }
        public Builder description(String description) { this.description = description; return this; }
        public Builder amount(long amount) { this.amount = amount; return this; }
        public Builder currency(String currency) { this.currency = currency; return this; }
        public Builder status(String status) { this.status = status; return this; }
        public Builder metadata(Map<String, Object> metadata) { this.metadata = metadata; return this; }
        public Builder receivedAt(Instant receivedAt) { this.receivedAt = receivedAt; return this; }

        public PaymentEvent build() {
            return new PaymentEvent(id, clientId, stripeEventId, eventType, description,
                    amount, currency, status, metadata, receivedAt);
        }
    }
}
