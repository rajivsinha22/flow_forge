package com.flowforge.integration.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.flowforge.integration.model.DeliveryAttempt;
import com.flowforge.integration.model.WebhookDelivery;
import com.flowforge.integration.repository.WebhookDeliveryRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatusCode;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import reactor.core.publisher.Mono;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.*;

@Service
public class WebhookDeliveryService {

    private static final Logger log = LoggerFactory.getLogger(WebhookDeliveryService.class);

    private static final int MAX_ATTEMPTS = 5;
    private static final String STATUS_PENDING = "PENDING";
    private static final String STATUS_DELIVERED = "DELIVERED";
    private static final String STATUS_FAILED = "FAILED";
    private static final String STATUS_DISCARDED = "DISCARDED";

    private final WebhookDeliveryRepository deliveryRepository;
    private final WebClient.Builder webClientBuilder;
    private final ObjectMapper objectMapper;

    public WebhookDeliveryService(WebhookDeliveryRepository deliveryRepository,
                                   WebClient.Builder webClientBuilder,
                                   ObjectMapper objectMapper) {
        this.deliveryRepository = deliveryRepository;
        this.webClientBuilder = webClientBuilder;
        this.objectMapper = objectMapper;
    }

    /**
     * Create and enqueue a new webhook delivery.
     */
    public WebhookDelivery createDelivery(String clientId, String executionId, String eventType,
                                           String targetUrl, Object payload) {
        String payloadJson;
        try {
            payloadJson = objectMapper.writeValueAsString(payload);
        } catch (JsonProcessingException e) {
            log.error("Failed to serialize webhook payload", e);
            payloadJson = "{}";
        }

        WebhookDelivery delivery = WebhookDelivery.builder()
                .id(UUID.randomUUID().toString())
                .clientId(clientId)
                .executionId(executionId)
                .eventType(eventType)
                .targetUrl(targetUrl)
                .payloadJson(payloadJson)
                .signatureHeader(computeSignature(payloadJson))
                .status(STATUS_PENDING)
                .attemptCount(0)
                .maxAttempts(MAX_ATTEMPTS)
                .attempts(new ArrayList<>())
                .createdAt(LocalDateTime.now())
                .nextRetryAt(LocalDateTime.now())
                .build();

        WebhookDelivery saved = deliveryRepository.save(delivery);
        log.info("Created webhook delivery {} for client {} (event: {})", saved.getId(), clientId, eventType);

        // Attempt delivery immediately
        attemptDelivery(saved);
        return saved;
    }

    /**
     * Attempt to deliver a webhook with exponential backoff retry logic.
     */
    public void attemptDelivery(WebhookDelivery delivery) {
        if (STATUS_DELIVERED.equals(delivery.getStatus()) || STATUS_DISCARDED.equals(delivery.getStatus())) {
            return;
        }

        long startMs = System.currentTimeMillis();
        int attemptNumber = delivery.getAttemptCount() + 1;

        log.info("Attempting webhook delivery {} (attempt {}/{})", delivery.getId(), attemptNumber, MAX_ATTEMPTS);

        DeliveryAttempt attempt = DeliveryAttempt.builder()
                .attemptNumber(attemptNumber)
                .attemptedAt(LocalDateTime.now())
                .build();

        try {
            WebClient client = webClientBuilder.build();

            Integer statusCode = client.post()
                    .uri(delivery.getTargetUrl())
                    .header("Content-Type", "application/json")
                    .header("X-FlowForge-Signature", delivery.getSignatureHeader())
                    .header("X-FlowForge-Event", delivery.getEventType())
                    .header("X-FlowForge-Delivery-Id", delivery.getId())
                    .bodyValue(delivery.getPayloadJson())
                    .retrieve()
                    .onStatus(HttpStatusCode::isError, response ->
                            response.bodyToMono(String.class).flatMap(body ->
                                    Mono.error(new WebClientResponseException(
                                            response.statusCode().value(),
                                            "Delivery failed",
                                            null, body.getBytes(), StandardCharsets.UTF_8))))
                    .toBodilessEntity()
                    .map(entity -> entity.getStatusCode().value())
                    .block();

            long durationMs = System.currentTimeMillis() - startMs;
            attempt.setHttpStatus(statusCode != null ? statusCode : 200);
            attempt.setDurationMs(durationMs);

            delivery.setStatus(STATUS_DELIVERED);
            delivery.setAttemptCount(attemptNumber);
            delivery.getAttempts().add(attempt);
            deliveryRepository.save(delivery);

            log.info("Webhook delivery {} succeeded on attempt {} ({}ms)", delivery.getId(), attemptNumber, durationMs);

        } catch (WebClientResponseException e) {
            long durationMs = System.currentTimeMillis() - startMs;
            attempt.setHttpStatus(e.getStatusCode().value());
            attempt.setDurationMs(durationMs);
            attempt.setErrorMessage(e.getMessage());

            handleDeliveryFailure(delivery, attempt, attemptNumber);

        } catch (Exception e) {
            long durationMs = System.currentTimeMillis() - startMs;
            attempt.setHttpStatus(0);
            attempt.setDurationMs(durationMs);
            attempt.setErrorMessage(e.getMessage());

            handleDeliveryFailure(delivery, attempt, attemptNumber);
        }
    }

    private void handleDeliveryFailure(WebhookDelivery delivery, DeliveryAttempt attempt, int attemptNumber) {
        delivery.setAttemptCount(attemptNumber);
        delivery.getAttempts().add(attempt);

        if (attemptNumber >= MAX_ATTEMPTS) {
            delivery.setStatus(STATUS_FAILED);
            delivery.setNextRetryAt(null);
            log.warn("Webhook delivery {} permanently failed after {} attempts", delivery.getId(), attemptNumber);
        } else {
            delivery.setStatus(STATUS_PENDING);
            long backoffSeconds = (long) Math.pow(2, attemptNumber) * 30L;
            delivery.setNextRetryAt(LocalDateTime.now().plusSeconds(backoffSeconds));
            log.warn("Webhook delivery {} failed (attempt {}), retrying in {}s",
                    delivery.getId(), attemptNumber, backoffSeconds);
        }

        deliveryRepository.save(delivery);
    }

    /**
     * Scheduled task to retry pending deliveries whose nextRetryAt is past due.
     */
    @Scheduled(fixedDelay = 60000)
    public void retryPendingDeliveries() {
        List<WebhookDelivery> pending = deliveryRepository
                .findByStatusAndNextRetryAtBefore(STATUS_PENDING, LocalDateTime.now());

        if (!pending.isEmpty()) {
            log.info("Retrying {} pending webhook deliveries", pending.size());
            pending.forEach(this::attemptDelivery);
        }
    }

    /**
     * Manual retry for a specific delivery.
     */
    public WebhookDelivery retryDelivery(String clientId, String deliveryId) {
        WebhookDelivery delivery = deliveryRepository.findById(deliveryId)
                .filter(d -> clientId.equals(d.getClientId()))
                .orElseThrow(() -> new RuntimeException("Delivery not found: " + deliveryId));

        if (STATUS_DISCARDED.equals(delivery.getStatus())) {
            throw new IllegalStateException("Cannot retry a DISCARDED delivery");
        }

        delivery.setStatus(STATUS_PENDING);
        delivery.setNextRetryAt(LocalDateTime.now());
        deliveryRepository.save(delivery);

        attemptDelivery(delivery);
        return deliveryRepository.findById(deliveryId).orElse(delivery);
    }

    /**
     * List paginated deliveries for a client.
     */
    public Page<WebhookDelivery> listDeliveries(String clientId, Pageable pageable) {
        return deliveryRepository.findByClientId(clientId, pageable);
    }

    /**
     * Get a single delivery by ID.
     */
    public WebhookDelivery getDelivery(String clientId, String deliveryId) {
        return deliveryRepository.findById(deliveryId)
                .filter(d -> clientId.equals(d.getClientId()))
                .orElseThrow(() -> new RuntimeException("Delivery not found: " + deliveryId));
    }

    /**
     * Get delivery statistics for a client.
     */
    public Map<String, Object> getDeliveryStats(String clientId) {
        long sent = deliveryRepository.countByClientIdAndStatus(clientId, STATUS_DELIVERED)
                + deliveryRepository.countByClientIdAndStatus(clientId, STATUS_FAILED)
                + deliveryRepository.countByClientIdAndStatus(clientId, STATUS_PENDING);
        long delivered = deliveryRepository.countByClientIdAndStatus(clientId, STATUS_DELIVERED);
        long failed = deliveryRepository.countByClientIdAndStatus(clientId, STATUS_FAILED);
        long pending = deliveryRepository.countByClientIdAndStatus(clientId, STATUS_PENDING);

        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("sent", sent);
        stats.put("delivered", delivered);
        stats.put("failed", failed);
        stats.put("pending", pending);
        stats.put("successRate", sent > 0 ? String.format("%.1f%%", (delivered * 100.0 / sent)) : "N/A");
        return stats;
    }

    /**
     * Compute HMAC-SHA256 signature for the payload.
     */
    private String computeSignature(String payload) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            SecretKeySpec secretKey = new SecretKeySpec(
                    "flowforge-webhook-secret".getBytes(StandardCharsets.UTF_8), "HmacSHA256");
            mac.init(secretKey);
            byte[] hash = mac.doFinal(payload.getBytes(StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            return "sha256=" + hexString;
        } catch (Exception e) {
            log.error("Failed to compute webhook signature", e);
            return "";
        }
    }
}
