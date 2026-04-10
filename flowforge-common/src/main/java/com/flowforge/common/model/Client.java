package com.flowforge.common.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.Objects;

@Document(collection = "clients")
public class Client {

    @Id
    private String id;

    private String name;

    private Plan plan;

    private String webhookUrl;

    private String webhookSecret;

    /**
     * When false (default), outbound webhook delivery is suppressed even if webhookUrl is set.
     * Users must explicitly enable it in Settings → Webhook Configuration.
     */
    private boolean webhookEnabled = false;

    // ── Billing / Stripe fields ──────────────────────────────────────────
    private String stripeCustomerId;
    private String subscriptionId;
    /** active | past_due | canceled | trialing | incomplete */
    private String subscriptionStatus;
    private Instant currentPeriodEnd;

    private Instant createdAt;

    public Client() {
    }

    public Client(String id, String name, Plan plan, String webhookUrl,
                  String webhookSecret, boolean webhookEnabled,
                  String stripeCustomerId, String subscriptionId,
                  String subscriptionStatus, Instant currentPeriodEnd,
                  Instant createdAt) {
        this.id = id;
        this.name = name;
        this.plan = plan;
        this.webhookUrl = webhookUrl;
        this.webhookSecret = webhookSecret;
        this.webhookEnabled = webhookEnabled;
        this.stripeCustomerId = stripeCustomerId;
        this.subscriptionId = subscriptionId;
        this.subscriptionStatus = subscriptionStatus;
        this.currentPeriodEnd = currentPeriodEnd;
        this.createdAt = createdAt;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public Plan getPlan() {
        return plan;
    }

    public void setPlan(Plan plan) {
        this.plan = plan;
    }

    public String getWebhookUrl() {
        return webhookUrl;
    }

    public void setWebhookUrl(String webhookUrl) {
        this.webhookUrl = webhookUrl;
    }

    public String getWebhookSecret() {
        return webhookSecret;
    }

    public void setWebhookSecret(String webhookSecret) {
        this.webhookSecret = webhookSecret;
    }

    public boolean isWebhookEnabled() {
        return webhookEnabled;
    }

    public void setWebhookEnabled(boolean webhookEnabled) {
        this.webhookEnabled = webhookEnabled;
    }

    public String getStripeCustomerId() { return stripeCustomerId; }
    public void setStripeCustomerId(String stripeCustomerId) { this.stripeCustomerId = stripeCustomerId; }

    public String getSubscriptionId() { return subscriptionId; }
    public void setSubscriptionId(String subscriptionId) { this.subscriptionId = subscriptionId; }

    public String getSubscriptionStatus() { return subscriptionStatus; }
    public void setSubscriptionStatus(String subscriptionStatus) { this.subscriptionStatus = subscriptionStatus; }

    public Instant getCurrentPeriodEnd() { return currentPeriodEnd; }
    public void setCurrentPeriodEnd(Instant currentPeriodEnd) { this.currentPeriodEnd = currentPeriodEnd; }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    @Override
    public String toString() {
        return "Client{" +
                "id='" + id + '\'' +
                ", name='" + name + '\'' +
                ", plan=" + plan +
                ", webhookUrl='" + webhookUrl + '\'' +
                ", webhookEnabled=" + webhookEnabled +
                ", stripeCustomerId='" + stripeCustomerId + '\'' +
                ", subscriptionId='" + subscriptionId + '\'' +
                ", subscriptionStatus='" + subscriptionStatus + '\'' +
                ", currentPeriodEnd=" + currentPeriodEnd +
                ", createdAt=" + createdAt +
                '}';
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Client that = (Client) o;
        return webhookEnabled == that.webhookEnabled &&
                Objects.equals(id, that.id) &&
                Objects.equals(name, that.name) &&
                plan == that.plan &&
                Objects.equals(webhookUrl, that.webhookUrl) &&
                Objects.equals(webhookSecret, that.webhookSecret) &&
                Objects.equals(stripeCustomerId, that.stripeCustomerId) &&
                Objects.equals(subscriptionId, that.subscriptionId) &&
                Objects.equals(subscriptionStatus, that.subscriptionStatus) &&
                Objects.equals(currentPeriodEnd, that.currentPeriodEnd) &&
                Objects.equals(createdAt, that.createdAt);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id, name, plan, webhookUrl, webhookSecret, webhookEnabled,
                stripeCustomerId, subscriptionId, subscriptionStatus, currentPeriodEnd, createdAt);
    }

    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private String id;
        private String name;
        private Plan plan;
        private String webhookUrl;
        private String webhookSecret;
        private boolean webhookEnabled = false;
        private String stripeCustomerId;
        private String subscriptionId;
        private String subscriptionStatus;
        private Instant currentPeriodEnd;
        private Instant createdAt;

        public Builder id(String id) { this.id = id; return this; }
        public Builder name(String name) { this.name = name; return this; }
        public Builder plan(Plan plan) { this.plan = plan; return this; }
        public Builder webhookUrl(String webhookUrl) { this.webhookUrl = webhookUrl; return this; }
        public Builder webhookSecret(String webhookSecret) { this.webhookSecret = webhookSecret; return this; }
        public Builder webhookEnabled(boolean webhookEnabled) { this.webhookEnabled = webhookEnabled; return this; }
        public Builder stripeCustomerId(String stripeCustomerId) { this.stripeCustomerId = stripeCustomerId; return this; }
        public Builder subscriptionId(String subscriptionId) { this.subscriptionId = subscriptionId; return this; }
        public Builder subscriptionStatus(String subscriptionStatus) { this.subscriptionStatus = subscriptionStatus; return this; }
        public Builder currentPeriodEnd(Instant currentPeriodEnd) { this.currentPeriodEnd = currentPeriodEnd; return this; }
        public Builder createdAt(Instant createdAt) { this.createdAt = createdAt; return this; }

        public Client build() {
            return new Client(id, name, plan, webhookUrl, webhookSecret, webhookEnabled,
                    stripeCustomerId, subscriptionId, subscriptionStatus, currentPeriodEnd, createdAt);
        }
    }

    public enum Plan {
        FREE, PRO, ENTERPRISE
    }
}
