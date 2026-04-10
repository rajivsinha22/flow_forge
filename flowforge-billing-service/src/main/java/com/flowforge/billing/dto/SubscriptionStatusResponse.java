package com.flowforge.billing.dto;

import java.time.Instant;

public class SubscriptionStatusResponse {

    private String plan;
    private String subscriptionStatus;
    private Instant currentPeriodEnd;
    private String stripeCustomerId;
    private String subscriptionId;

    public SubscriptionStatusResponse() {
    }

    public SubscriptionStatusResponse(String plan, String subscriptionStatus, Instant currentPeriodEnd,
                                      String stripeCustomerId, String subscriptionId) {
        this.plan = plan;
        this.subscriptionStatus = subscriptionStatus;
        this.currentPeriodEnd = currentPeriodEnd;
        this.stripeCustomerId = stripeCustomerId;
        this.subscriptionId = subscriptionId;
    }

    public String getPlan() { return plan; }
    public void setPlan(String plan) { this.plan = plan; }

    public String getSubscriptionStatus() { return subscriptionStatus; }
    public void setSubscriptionStatus(String subscriptionStatus) { this.subscriptionStatus = subscriptionStatus; }

    public Instant getCurrentPeriodEnd() { return currentPeriodEnd; }
    public void setCurrentPeriodEnd(Instant currentPeriodEnd) { this.currentPeriodEnd = currentPeriodEnd; }

    public String getStripeCustomerId() { return stripeCustomerId; }
    public void setStripeCustomerId(String stripeCustomerId) { this.stripeCustomerId = stripeCustomerId; }

    public String getSubscriptionId() { return subscriptionId; }
    public void setSubscriptionId(String subscriptionId) { this.subscriptionId = subscriptionId; }
}
