package com.flowforge.billing.service;

import com.flowforge.common.model.Client;
import com.stripe.exception.SignatureVerificationException;
import com.stripe.exception.StripeException;
import com.stripe.model.Customer;
import com.stripe.model.Event;
import com.stripe.model.Invoice;
import com.stripe.model.InvoiceCollection;
import com.stripe.model.Subscription;
import com.stripe.model.checkout.Session;
import com.stripe.net.Webhook;
import com.stripe.param.CustomerCreateParams;
import com.stripe.param.InvoiceListParams;
import com.stripe.param.SubscriptionUpdateParams;
import com.stripe.param.checkout.SessionCreateParams;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@ConditionalOnProperty(name = "app.billing.mock", havingValue = "false")
public class StripePaymentProvider implements PaymentProvider {

    private static final Logger log = LoggerFactory.getLogger(StripePaymentProvider.class);

    @Value("${stripe.webhook-secret}")
    private String webhookSecret;

    @Value("${stripe.prices.pro}")
    private String proPriceId;

    @Value("${stripe.prices.enterprise}")
    private String enterprisePriceId;

    @Override
    public String createCustomer(String clientId, String email, String orgName) {
        try {
            CustomerCreateParams params = CustomerCreateParams.builder()
                    .setEmail(email)
                    .setName(orgName)
                    .putMetadata("clientId", clientId)
                    .build();

            Customer customer = Customer.create(params);
            log.info("Created Stripe customer {} for clientId={}", customer.getId(), clientId);
            return customer.getId();
        } catch (StripeException e) {
            log.error("Failed to create Stripe customer for clientId={}: {}", clientId, e.getMessage());
            throw new RuntimeException("Failed to create Stripe customer", e);
        }
    }

    @Override
    public String createCheckoutSession(String customerId, Client.Plan plan, String successUrl, String cancelUrl) {
        try {
            String priceId = resolvePriceId(plan);

            SessionCreateParams params = SessionCreateParams.builder()
                    .setCustomer(customerId)
                    .setMode(SessionCreateParams.Mode.SUBSCRIPTION)
                    .addLineItem(SessionCreateParams.LineItem.builder()
                            .setPrice(priceId)
                            .setQuantity(1L)
                            .build())
                    .setSuccessUrl(successUrl)
                    .setCancelUrl(cancelUrl)
                    .build();

            Session session = Session.create(params);
            log.info("Created checkout session {} for customer={} plan={}", session.getId(), customerId, plan);
            return session.getUrl();
        } catch (StripeException e) {
            log.error("Failed to create checkout session for customer={}: {}", customerId, e.getMessage());
            throw new RuntimeException("Failed to create checkout session", e);
        }
    }

    @Override
    public Map<String, Object> getSubscription(String subscriptionId) {
        try {
            Subscription subscription = Subscription.retrieve(subscriptionId);
            Map<String, Object> result = new HashMap<>();
            result.put("id", subscription.getId());
            result.put("status", subscription.getStatus());
            result.put("current_period_start", subscription.getCurrentPeriodStart());
            result.put("current_period_end", subscription.getCurrentPeriodEnd());
            result.put("customer", subscription.getCustomer());
            result.put("cancel_at_period_end", subscription.getCancelAtPeriodEnd());
            return result;
        } catch (StripeException e) {
            log.error("Failed to retrieve subscription {}: {}", subscriptionId, e.getMessage());
            throw new RuntimeException("Failed to retrieve subscription", e);
        }
    }

    @Override
    public Map<String, Object> cancelSubscription(String subscriptionId) {
        try {
            Subscription subscription = Subscription.retrieve(subscriptionId);
            Subscription cancelled = subscription.cancel();
            Map<String, Object> result = new HashMap<>();
            result.put("id", cancelled.getId());
            result.put("status", cancelled.getStatus());
            result.put("canceled_at", cancelled.getCanceledAt());
            return result;
        } catch (StripeException e) {
            log.error("Failed to cancel subscription {}: {}", subscriptionId, e.getMessage());
            throw new RuntimeException("Failed to cancel subscription", e);
        }
    }

    @Override
    public Map<String, Object> changePlan(String subscriptionId, Client.Plan newPlan) {
        try {
            String newPriceId = resolvePriceId(newPlan);
            Subscription subscription = Subscription.retrieve(subscriptionId);

            String itemId = subscription.getItems().getData().get(0).getId();

            SubscriptionUpdateParams params = SubscriptionUpdateParams.builder()
                    .addItem(SubscriptionUpdateParams.Item.builder()
                            .setId(itemId)
                            .setPrice(newPriceId)
                            .build())
                    .setProrationBehavior(SubscriptionUpdateParams.ProrationBehavior.CREATE_PRORATIONS)
                    .build();

            Subscription updated = subscription.update(params);
            Map<String, Object> result = new HashMap<>();
            result.put("id", updated.getId());
            result.put("status", updated.getStatus());
            result.put("current_period_end", updated.getCurrentPeriodEnd());
            return result;
        } catch (StripeException e) {
            log.error("Failed to change plan for subscription {}: {}", subscriptionId, e.getMessage());
            throw new RuntimeException("Failed to change subscription plan", e);
        }
    }

    @Override
    public List<Map<String, Object>> listInvoices(String customerId, int limit) {
        try {
            InvoiceListParams params = InvoiceListParams.builder()
                    .setCustomer(customerId)
                    .setLimit((long) limit)
                    .build();

            InvoiceCollection invoices = Invoice.list(params);
            List<Map<String, Object>> result = new ArrayList<>();

            for (Invoice invoice : invoices.getData()) {
                Map<String, Object> inv = new HashMap<>();
                inv.put("id", invoice.getId());
                inv.put("amount_due", invoice.getAmountDue());
                inv.put("amount_paid", invoice.getAmountPaid());
                inv.put("currency", invoice.getCurrency());
                inv.put("status", invoice.getStatus());
                inv.put("created", invoice.getCreated());
                inv.put("hosted_invoice_url", invoice.getHostedInvoiceUrl());
                inv.put("invoice_pdf", invoice.getInvoicePdf());
                result.add(inv);
            }

            return result;
        } catch (StripeException e) {
            log.error("Failed to list invoices for customer {}: {}", customerId, e.getMessage());
            throw new RuntimeException("Failed to list invoices", e);
        }
    }

    @Override
    public boolean verifyWebhookSignature(String payload, String sigHeader) {
        try {
            Webhook.constructEvent(payload, sigHeader, webhookSecret);
            return true;
        } catch (SignatureVerificationException e) {
            log.warn("Webhook signature verification failed: {}", e.getMessage());
            return false;
        }
    }

    @Override
    public Map<String, Object> parseWebhookEvent(String payload, String sigHeader) {
        try {
            Event event = Webhook.constructEvent(payload, sigHeader, webhookSecret);
            Map<String, Object> result = new HashMap<>();
            result.put("id", event.getId());
            result.put("type", event.getType());
            result.put("created", event.getCreated());
            result.put("data", event.getData() != null ? event.getData().toJson() : null);
            return result;
        } catch (SignatureVerificationException e) {
            log.error("Webhook signature verification failed: {}", e.getMessage());
            throw new RuntimeException("Invalid webhook signature", e);
        }
    }

    private String resolvePriceId(Client.Plan plan) {
        return switch (plan) {
            case PRO -> proPriceId;
            case ENTERPRISE -> enterprisePriceId;
            default -> throw new IllegalArgumentException("No Stripe price configured for plan: " + plan);
        };
    }
}
