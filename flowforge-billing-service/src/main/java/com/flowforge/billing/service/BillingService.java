package com.flowforge.billing.service;

import com.flowforge.billing.dto.PlanUsageResponse;
import com.flowforge.billing.dto.SubscriptionStatusResponse;
import com.flowforge.billing.model.PaymentEvent;
import com.flowforge.billing.model.SubscriptionRecord;
import com.flowforge.billing.repository.PaymentEventRepository;
import com.flowforge.billing.repository.SubscriptionRecordRepository;
import com.flowforge.common.model.Client;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.Map;
import java.util.Optional;

@Service
public class BillingService {

    private static final Logger log = LoggerFactory.getLogger(BillingService.class);

    private final PaymentProvider paymentProvider;
    private final PaymentEventRepository paymentEventRepository;
    private final SubscriptionRecordRepository subscriptionRecordRepository;
    private final RestTemplate restTemplate;

    public BillingService(PaymentProvider paymentProvider,
                          PaymentEventRepository paymentEventRepository,
                          SubscriptionRecordRepository subscriptionRecordRepository) {
        this.paymentProvider = paymentProvider;
        this.paymentEventRepository = paymentEventRepository;
        this.subscriptionRecordRepository = subscriptionRecordRepository;
        this.restTemplate = new RestTemplate();
    }

    /**
     * Get the subscription status for a client.
     */
    public SubscriptionStatusResponse getSubscriptionStatus(String clientId) {
        log.debug("Getting subscription status for clientId={}", clientId);

        Optional<SubscriptionRecord> recordOpt = subscriptionRecordRepository.findByClientId(clientId);

        if (recordOpt.isEmpty()) {
            // Return a default FREE plan response when no subscription exists
            return new SubscriptionStatusResponse(
                    Client.Plan.FREE.name(),
                    "none",
                    null,
                    null,
                    null
            );
        }

        SubscriptionRecord record = recordOpt.get();
        return new SubscriptionStatusResponse(
                record.getPlan() != null ? record.getPlan().name() : Client.Plan.FREE.name(),
                record.getStatus(),
                record.getCurrentPeriodEnd(),
                record.getStripeCustomerId(),
                record.getStripeSubscriptionId()
        );
    }

    /**
     * Get usage metrics for a client. Returns mock counts since internal
     * counting endpoints on other services don't exist yet.
     */
    public PlanUsageResponse getUsage(String clientId) {
        log.debug("Getting usage for clientId={}", clientId);

        Optional<SubscriptionRecord> recordOpt = subscriptionRecordRepository.findByClientId(clientId);
        Client.Plan plan = recordOpt.map(SubscriptionRecord::getPlan).orElse(Client.Plan.FREE);

        // Mock usage counts — replace with real REST calls when internal endpoints exist:
        // e.g. restTemplate.getForObject("http://localhost:8082/api/internal/count?clientId=" + clientId, Integer.class)
        int workflowsUsed = 3;
        int modelsUsed = 2;
        int executionsUsed = 150;
        int teamMembersUsed = 2;
        int webhooksUsed = 1;

        // Plan limits
        int workflowLimit, modelLimit, executionLimit, teamMemberLimit, webhookLimit;
        switch (plan) {
            case PRO -> {
                workflowLimit = 50;
                modelLimit = 25;
                executionLimit = 10000;
                teamMemberLimit = 10;
                webhookLimit = 20;
            }
            case ENTERPRISE -> {
                workflowLimit = -1; // unlimited
                modelLimit = -1;
                executionLimit = -1;
                teamMemberLimit = -1;
                webhookLimit = -1;
            }
            default -> { // FREE
                workflowLimit = 5;
                modelLimit = 3;
                executionLimit = 500;
                teamMemberLimit = 2;
                webhookLimit = 2;
            }
        }

        return new PlanUsageResponse(
                plan.name(),
                new PlanUsageResponse.UsageDetail(workflowsUsed, workflowLimit),
                new PlanUsageResponse.UsageDetail(modelsUsed, modelLimit),
                new PlanUsageResponse.UsageDetail(executionsUsed, executionLimit),
                new PlanUsageResponse.UsageDetail(teamMembersUsed, teamMemberLimit),
                new PlanUsageResponse.UsageDetail(webhooksUsed, webhookLimit)
        );
    }

    /**
     * Create a Stripe Checkout session for upgrading to a paid plan.
     */
    public String createCheckoutSession(String clientId, Client.Plan plan, String successUrl, String cancelUrl) {
        log.info("Creating checkout session for clientId={} plan={}", clientId, plan);

        if (plan == Client.Plan.FREE) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot create checkout session for FREE plan");
        }

        Optional<SubscriptionRecord> existingOpt = subscriptionRecordRepository.findByClientId(clientId);
        String customerId;

        if (existingOpt.isPresent() && existingOpt.get().getStripeCustomerId() != null) {
            customerId = existingOpt.get().getStripeCustomerId();
        } else {
            // Create a new Stripe customer
            customerId = paymentProvider.createCustomer(clientId, clientId + "@flowforge.io", "FlowForge Client " + clientId);

            // Save or update the subscription record with the customer ID
            SubscriptionRecord record = existingOpt.orElse(SubscriptionRecord.builder()
                    .clientId(clientId)
                    .plan(Client.Plan.FREE)
                    .status("none")
                    .build());
            record.setStripeCustomerId(customerId);
            subscriptionRecordRepository.save(record);
        }

        return paymentProvider.createCheckoutSession(customerId, plan, successUrl, cancelUrl);
    }

    /**
     * Change an existing subscription to a new plan.
     */
    public SubscriptionStatusResponse changePlan(String clientId, Client.Plan newPlan) {
        log.info("Changing plan for clientId={} to {}", clientId, newPlan);

        SubscriptionRecord record = subscriptionRecordRepository.findByClientId(clientId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "No subscription found for client: " + clientId));

        if (record.getStripeSubscriptionId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Client does not have an active subscription to change");
        }

        Map<String, Object> updated = paymentProvider.changePlan(record.getStripeSubscriptionId(), newPlan);

        record.setPlan(newPlan);
        record.setStatus((String) updated.getOrDefault("status", record.getStatus()));
        subscriptionRecordRepository.save(record);

        return new SubscriptionStatusResponse(
                record.getPlan().name(),
                record.getStatus(),
                record.getCurrentPeriodEnd(),
                record.getStripeCustomerId(),
                record.getStripeSubscriptionId()
        );
    }

    /**
     * Cancel a client's subscription.
     */
    public SubscriptionStatusResponse cancelSubscription(String clientId) {
        log.info("Cancelling subscription for clientId={}", clientId);

        SubscriptionRecord record = subscriptionRecordRepository.findByClientId(clientId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "No subscription found for client: " + clientId));

        if (record.getStripeSubscriptionId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Client does not have an active subscription to cancel");
        }

        Map<String, Object> cancelled = paymentProvider.cancelSubscription(record.getStripeSubscriptionId());

        record.setStatus("canceled");
        record.setCancelledAt(Instant.now());
        subscriptionRecordRepository.save(record);

        return new SubscriptionStatusResponse(
                record.getPlan().name(),
                "canceled",
                record.getCurrentPeriodEnd(),
                record.getStripeCustomerId(),
                record.getStripeSubscriptionId()
        );
    }

    /**
     * Get paginated payment history for a client.
     */
    public Page<PaymentEvent> getPaymentHistory(String clientId, int page, int size) {
        log.debug("Getting payment history for clientId={} page={} size={}", clientId, page, size);
        return paymentEventRepository.findByClientIdOrderByReceivedAtDesc(clientId, PageRequest.of(page, size));
    }

    /**
     * Handle an incoming Stripe webhook event.
     */
    public void handleWebhookEvent(String payload, String sigHeader) {
        log.info("Processing webhook event");

        if (!paymentProvider.verifyWebhookSignature(payload, sigHeader)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid webhook signature");
        }

        Map<String, Object> event = paymentProvider.parseWebhookEvent(payload, sigHeader);
        String eventId = (String) event.get("id");
        String eventType = (String) event.get("type");

        log.info("Received webhook event: id={} type={}", eventId, eventType);

        // Persist the raw event
        PaymentEvent paymentEvent = PaymentEvent.builder()
                .stripeEventId(eventId)
                .eventType(eventType)
                .description("Stripe webhook: " + eventType)
                .status("received")
                .currency("usd")
                .receivedAt(Instant.now())
                .build();

        // Dispatch based on event type
        switch (eventType) {
            case "checkout.session.completed" -> handleCheckoutCompleted(event, paymentEvent);
            case "invoice.payment_succeeded" -> handlePaymentSucceeded(event, paymentEvent);
            case "invoice.payment_failed" -> handlePaymentFailed(event, paymentEvent);
            case "customer.subscription.updated" -> handleSubscriptionUpdated(event, paymentEvent);
            case "customer.subscription.deleted" -> handleSubscriptionDeleted(event, paymentEvent);
            default -> {
                log.info("Unhandled webhook event type: {}", eventType);
                paymentEvent.setStatus("ignored");
            }
        }

        paymentEventRepository.save(paymentEvent);
    }

    // ── Private webhook handlers ──────────────────────────────────────────

    @SuppressWarnings("unchecked")
    private void handleCheckoutCompleted(Map<String, Object> event, PaymentEvent paymentEvent) {
        log.info("Handling checkout.session.completed");
        Map<String, Object> data = (Map<String, Object>) event.get("data");
        if (data != null) {
            Map<String, Object> object = (Map<String, Object>) data.get("object");
            if (object != null) {
                String customerId = (String) object.get("customer");
                String subscriptionId = (String) object.get("subscription");
                paymentEvent.setClientId(customerId);
                paymentEvent.setStatus("processed");

                // Find and update subscription record by customer ID
                subscriptionRecordRepository.findByClientId(customerId).ifPresent(record -> {
                    record.setStripeSubscriptionId(subscriptionId);
                    record.setStatus("active");
                    record.setCurrentPeriodStart(Instant.now());
                    record.setCurrentPeriodEnd(Instant.now().plus(30, java.time.temporal.ChronoUnit.DAYS));
                    subscriptionRecordRepository.save(record);
                });
            }
        }
    }

    @SuppressWarnings("unchecked")
    private void handlePaymentSucceeded(Map<String, Object> event, PaymentEvent paymentEvent) {
        log.info("Handling invoice.payment_succeeded");
        Map<String, Object> data = (Map<String, Object>) event.get("data");
        if (data != null) {
            Map<String, Object> object = (Map<String, Object>) data.get("object");
            if (object != null) {
                paymentEvent.setClientId((String) object.get("customer"));
                Object amountPaid = object.get("amount_paid");
                if (amountPaid instanceof Number) {
                    paymentEvent.setAmount(((Number) amountPaid).longValue());
                }
                paymentEvent.setCurrency((String) object.getOrDefault("currency", "usd"));
                paymentEvent.setStatus("processed");
            }
        }
    }

    @SuppressWarnings("unchecked")
    private void handlePaymentFailed(Map<String, Object> event, PaymentEvent paymentEvent) {
        log.info("Handling invoice.payment_failed");
        Map<String, Object> data = (Map<String, Object>) event.get("data");
        if (data != null) {
            Map<String, Object> object = (Map<String, Object>) data.get("object");
            if (object != null) {
                String customerId = (String) object.get("customer");
                paymentEvent.setClientId(customerId);
                paymentEvent.setStatus("failed");

                // Mark subscription as past_due
                subscriptionRecordRepository.findByClientId(customerId).ifPresent(record -> {
                    record.setStatus("past_due");
                    subscriptionRecordRepository.save(record);
                });
            }
        }
    }

    @SuppressWarnings("unchecked")
    private void handleSubscriptionUpdated(Map<String, Object> event, PaymentEvent paymentEvent) {
        log.info("Handling customer.subscription.updated");
        Map<String, Object> data = (Map<String, Object>) event.get("data");
        if (data != null) {
            Map<String, Object> object = (Map<String, Object>) data.get("object");
            if (object != null) {
                String customerId = (String) object.get("customer");
                String status = (String) object.get("status");
                paymentEvent.setClientId(customerId);
                paymentEvent.setStatus("processed");

                subscriptionRecordRepository.findByClientId(customerId).ifPresent(record -> {
                    if (status != null) {
                        record.setStatus(status);
                    }
                    subscriptionRecordRepository.save(record);
                });
            }
        }
    }

    @SuppressWarnings("unchecked")
    private void handleSubscriptionDeleted(Map<String, Object> event, PaymentEvent paymentEvent) {
        log.info("Handling customer.subscription.deleted");
        Map<String, Object> data = (Map<String, Object>) event.get("data");
        if (data != null) {
            Map<String, Object> object = (Map<String, Object>) data.get("object");
            if (object != null) {
                String customerId = (String) object.get("customer");
                paymentEvent.setClientId(customerId);
                paymentEvent.setStatus("processed");

                subscriptionRecordRepository.findByClientId(customerId).ifPresent(record -> {
                    record.setStatus("canceled");
                    record.setCancelledAt(Instant.now());
                    subscriptionRecordRepository.save(record);
                });
            }
        }
    }
}
