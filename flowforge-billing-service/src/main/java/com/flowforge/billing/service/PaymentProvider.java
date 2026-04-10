package com.flowforge.billing.service;

import com.flowforge.common.model.Client;

import java.util.List;
import java.util.Map;

public interface PaymentProvider {

    String createCustomer(String clientId, String email, String orgName);

    String createCheckoutSession(String customerId, Client.Plan plan, String successUrl, String cancelUrl);

    Map<String, Object> getSubscription(String subscriptionId);

    Map<String, Object> cancelSubscription(String subscriptionId);

    Map<String, Object> changePlan(String subscriptionId, Client.Plan newPlan);

    List<Map<String, Object>> listInvoices(String customerId, int limit);

    boolean verifyWebhookSignature(String payload, String sigHeader);

    Map<String, Object> parseWebhookEvent(String payload, String sigHeader);
}
