package com.flowforge.billing.service;

import com.flowforge.common.model.Client;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@ConditionalOnProperty(name = "app.billing.mock", havingValue = "true", matchIfMissing = true)
public class MockPaymentProvider implements PaymentProvider {

    private static final Logger log = LoggerFactory.getLogger(MockPaymentProvider.class);

    @Override
    public String createCustomer(String clientId, String email, String orgName) {
        String customerId = "cus_mock_" + clientId;
        log.info("[MOCK] Created customer {} for clientId={} email={}", customerId, clientId, email);
        return customerId;
    }

    @Override
    public String createCheckoutSession(String customerId, Client.Plan plan, String successUrl, String cancelUrl) {
        String sessionUrl = "https://checkout.stripe.com/mock-session?plan=" + plan;
        log.info("[MOCK] Created checkout session for customer={} plan={}", customerId, plan);
        return sessionUrl;
    }

    @Override
    public Map<String, Object> getSubscription(String subscriptionId) {
        Map<String, Object> result = new HashMap<>();
        result.put("id", subscriptionId);
        result.put("status", "active");
        result.put("current_period_start", Instant.now().minus(15, ChronoUnit.DAYS).getEpochSecond());
        result.put("current_period_end", Instant.now().plus(15, ChronoUnit.DAYS).getEpochSecond());
        result.put("customer", "cus_mock_default");
        result.put("cancel_at_period_end", false);
        log.info("[MOCK] Retrieved subscription {}", subscriptionId);
        return result;
    }

    @Override
    public Map<String, Object> cancelSubscription(String subscriptionId) {
        Map<String, Object> result = new HashMap<>();
        result.put("id", subscriptionId);
        result.put("status", "canceled");
        result.put("canceled_at", Instant.now().getEpochSecond());
        log.info("[MOCK] Cancelled subscription {}", subscriptionId);
        return result;
    }

    @Override
    public Map<String, Object> changePlan(String subscriptionId, Client.Plan newPlan) {
        Map<String, Object> result = new HashMap<>();
        result.put("id", subscriptionId);
        result.put("status", "active");
        result.put("current_period_end", Instant.now().plus(30, ChronoUnit.DAYS).getEpochSecond());
        result.put("plan", newPlan.name());
        log.info("[MOCK] Changed plan for subscription {} to {}", subscriptionId, newPlan);
        return result;
    }

    @Override
    public List<Map<String, Object>> listInvoices(String customerId, int limit) {
        List<Map<String, Object>> invoices = new ArrayList<>();

        for (int i = 1; i <= 3; i++) {
            Map<String, Object> invoice = new HashMap<>();
            invoice.put("id", "in_mock_" + i);
            invoice.put("amount_due", 2900L);
            invoice.put("amount_paid", 2900L);
            invoice.put("currency", "usd");
            invoice.put("status", "paid");
            invoice.put("created", Instant.now().minus(i * 30L, ChronoUnit.DAYS).getEpochSecond());
            invoice.put("hosted_invoice_url", "https://invoice.stripe.com/mock/" + i);
            invoice.put("invoice_pdf", "https://invoice.stripe.com/mock/" + i + "/pdf");
            invoices.add(invoice);
        }

        log.info("[MOCK] Listed {} invoices for customer {}", invoices.size(), customerId);
        return invoices;
    }

    @Override
    public boolean verifyWebhookSignature(String payload, String sigHeader) {
        log.info("[MOCK] Webhook signature verification — always returns true");
        return true;
    }

    @Override
    public Map<String, Object> parseWebhookEvent(String payload, String sigHeader) {
        Map<String, Object> event = new HashMap<>();
        event.put("id", "evt_mock_" + System.currentTimeMillis());
        event.put("type", "invoice.payment_succeeded");
        event.put("created", Instant.now().getEpochSecond());
        event.put("data", Map.of(
                "object", Map.of(
                        "id", "in_mock_latest",
                        "amount_paid", 2900L,
                        "currency", "usd",
                        "customer", "cus_mock_default"
                )
        ));
        log.info("[MOCK] Parsed webhook event");
        return event;
    }
}
