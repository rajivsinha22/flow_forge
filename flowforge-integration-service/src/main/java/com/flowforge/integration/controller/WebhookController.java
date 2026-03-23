package com.flowforge.integration.controller;

import com.flowforge.integration.model.WebhookDelivery;
import com.flowforge.integration.service.WebhookDeliveryService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/webhooks")
@CrossOrigin(origins = "*")
public class WebhookController {

    private static final Logger log = LoggerFactory.getLogger(WebhookController.class);

    private final WebhookDeliveryService webhookDeliveryService;

    public WebhookController(WebhookDeliveryService webhookDeliveryService) {
        this.webhookDeliveryService = webhookDeliveryService;
    }

    /**
     * GET /api/v1/webhooks/deliveries
     * List webhook deliveries for the tenant, paginated.
     */
    @GetMapping("/deliveries")
    public ResponseEntity<Page<WebhookDelivery>> listDeliveries(
            @RequestHeader("X-Client-Id") String clientId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        log.debug("Listing webhook deliveries for client: {}", clientId);
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<WebhookDelivery> deliveries = webhookDeliveryService.listDeliveries(clientId, pageable);
        return ResponseEntity.ok(deliveries);
    }

    /**
     * GET /api/v1/webhooks/deliveries/{id}
     * Get a specific delivery detail.
     */
    @GetMapping("/deliveries/{id}")
    public ResponseEntity<WebhookDelivery> getDelivery(
            @RequestHeader("X-Client-Id") String clientId,
            @PathVariable String id) {
        log.debug("Getting webhook delivery {} for client: {}", id, clientId);
        WebhookDelivery delivery = webhookDeliveryService.getDelivery(clientId, id);
        return ResponseEntity.ok(delivery);
    }

    /**
     * POST /api/v1/webhooks/deliveries/{id}/retry
     * Manually retry a delivery.
     */
    @PostMapping("/deliveries/{id}/retry")
    public ResponseEntity<WebhookDelivery> retryDelivery(
            @RequestHeader("X-Client-Id") String clientId,
            @PathVariable String id) {
        log.info("Manual retry of webhook delivery {} for client: {}", id, clientId);
        WebhookDelivery retried = webhookDeliveryService.retryDelivery(clientId, id);
        return ResponseEntity.ok(retried);
    }

    /**
     * GET /api/v1/webhooks/stats
     * Get delivery statistics (sent, delivered, failed, etc.).
     */
    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getStats(
            @RequestHeader("X-Client-Id") String clientId) {
        log.debug("Getting webhook delivery stats for client: {}", clientId);
        Map<String, Object> stats = webhookDeliveryService.getDeliveryStats(clientId);
        return ResponseEntity.ok(stats);
    }

    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<Map<String, String>> handleRuntimeException(RuntimeException ex) {
        log.error("WebhookController error: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(Map.of("error", ex.getMessage()));
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<Map<String, String>> handleIllegalStateException(IllegalStateException ex) {
        log.error("WebhookController illegal state: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(Map.of("error", ex.getMessage()));
    }
}
