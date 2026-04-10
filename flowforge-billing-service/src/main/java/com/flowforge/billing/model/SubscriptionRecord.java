package com.flowforge.billing.model;

import com.flowforge.common.model.Client;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.Objects;

@Document(collection = "subscriptions")
public class SubscriptionRecord {

    @Id
    private String id;

    private String clientId;

    private String stripeSubscriptionId;

    private String stripeCustomerId;

    private Client.Plan plan;

    /** active | past_due | canceled | trialing */
    private String status;

    private Instant currentPeriodStart;

    private Instant currentPeriodEnd;

    private Instant cancelledAt;

    public SubscriptionRecord() {
    }

    public SubscriptionRecord(String id, String clientId, String stripeSubscriptionId,
                              String stripeCustomerId, Client.Plan plan, String status,
                              Instant currentPeriodStart, Instant currentPeriodEnd,
                              Instant cancelledAt) {
        this.id = id;
        this.clientId = clientId;
        this.stripeSubscriptionId = stripeSubscriptionId;
        this.stripeCustomerId = stripeCustomerId;
        this.plan = plan;
        this.status = status;
        this.currentPeriodStart = currentPeriodStart;
        this.currentPeriodEnd = currentPeriodEnd;
        this.cancelledAt = cancelledAt;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getClientId() { return clientId; }
    public void setClientId(String clientId) { this.clientId = clientId; }

    public String getStripeSubscriptionId() { return stripeSubscriptionId; }
    public void setStripeSubscriptionId(String stripeSubscriptionId) { this.stripeSubscriptionId = stripeSubscriptionId; }

    public String getStripeCustomerId() { return stripeCustomerId; }
    public void setStripeCustomerId(String stripeCustomerId) { this.stripeCustomerId = stripeCustomerId; }

    public Client.Plan getPlan() { return plan; }
    public void setPlan(Client.Plan plan) { this.plan = plan; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public Instant getCurrentPeriodStart() { return currentPeriodStart; }
    public void setCurrentPeriodStart(Instant currentPeriodStart) { this.currentPeriodStart = currentPeriodStart; }

    public Instant getCurrentPeriodEnd() { return currentPeriodEnd; }
    public void setCurrentPeriodEnd(Instant currentPeriodEnd) { this.currentPeriodEnd = currentPeriodEnd; }

    public Instant getCancelledAt() { return cancelledAt; }
    public void setCancelledAt(Instant cancelledAt) { this.cancelledAt = cancelledAt; }

    @Override
    public String toString() {
        return "SubscriptionRecord{" +
                "id='" + id + '\'' +
                ", clientId='" + clientId + '\'' +
                ", stripeSubscriptionId='" + stripeSubscriptionId + '\'' +
                ", stripeCustomerId='" + stripeCustomerId + '\'' +
                ", plan=" + plan +
                ", status='" + status + '\'' +
                ", currentPeriodStart=" + currentPeriodStart +
                ", currentPeriodEnd=" + currentPeriodEnd +
                ", cancelledAt=" + cancelledAt +
                '}';
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        SubscriptionRecord that = (SubscriptionRecord) o;
        return Objects.equals(id, that.id) &&
                Objects.equals(clientId, that.clientId) &&
                Objects.equals(stripeSubscriptionId, that.stripeSubscriptionId) &&
                Objects.equals(stripeCustomerId, that.stripeCustomerId) &&
                plan == that.plan &&
                Objects.equals(status, that.status) &&
                Objects.equals(currentPeriodStart, that.currentPeriodStart) &&
                Objects.equals(currentPeriodEnd, that.currentPeriodEnd) &&
                Objects.equals(cancelledAt, that.cancelledAt);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id, clientId, stripeSubscriptionId, stripeCustomerId, plan,
                status, currentPeriodStart, currentPeriodEnd, cancelledAt);
    }

    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private String id;
        private String clientId;
        private String stripeSubscriptionId;
        private String stripeCustomerId;
        private Client.Plan plan;
        private String status;
        private Instant currentPeriodStart;
        private Instant currentPeriodEnd;
        private Instant cancelledAt;

        public Builder id(String id) { this.id = id; return this; }
        public Builder clientId(String clientId) { this.clientId = clientId; return this; }
        public Builder stripeSubscriptionId(String stripeSubscriptionId) { this.stripeSubscriptionId = stripeSubscriptionId; return this; }
        public Builder stripeCustomerId(String stripeCustomerId) { this.stripeCustomerId = stripeCustomerId; return this; }
        public Builder plan(Client.Plan plan) { this.plan = plan; return this; }
        public Builder status(String status) { this.status = status; return this; }
        public Builder currentPeriodStart(Instant currentPeriodStart) { this.currentPeriodStart = currentPeriodStart; return this; }
        public Builder currentPeriodEnd(Instant currentPeriodEnd) { this.currentPeriodEnd = currentPeriodEnd; return this; }
        public Builder cancelledAt(Instant cancelledAt) { this.cancelledAt = cancelledAt; return this; }

        public SubscriptionRecord build() {
            return new SubscriptionRecord(id, clientId, stripeSubscriptionId, stripeCustomerId,
                    plan, status, currentPeriodStart, currentPeriodEnd, cancelledAt);
        }
    }
}
