package com.flowforge.integration.controller;

import com.flowforge.integration.model.EventTriggerConfig;
import com.flowforge.integration.model.TriggerActivationLog;
import com.flowforge.integration.service.TriggerService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/triggers")
@CrossOrigin(origins = "*")
public class TriggerController {

    private static final Logger log = LoggerFactory.getLogger(TriggerController.class);

    private final TriggerService triggerService;

    public TriggerController(TriggerService triggerService) {
        this.triggerService = triggerService;
    }

    /**
     * GET /api/v1/triggers
     * List all triggers for the authenticated tenant.
     */
    @GetMapping
    public ResponseEntity<List<EventTriggerConfig>> listTriggers(
            @RequestHeader("X-Client-Id") String clientId) {
        log.debug("Listing triggers for client: {}", clientId);
        List<EventTriggerConfig> triggers = triggerService.listTriggers(clientId);
        return ResponseEntity.ok(triggers);
    }

    /**
     * POST /api/v1/triggers
     * Create a new trigger.
     */
    @PostMapping
    public ResponseEntity<EventTriggerConfig> createTrigger(
            @RequestHeader("X-Client-Id") String clientId,
            @Valid @RequestBody EventTriggerConfig config) {
        log.info("Creating trigger for client: {}, type: {}", clientId, config.getSourceType());
        EventTriggerConfig created = triggerService.createTrigger(clientId, config);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    /**
     * PUT /api/v1/triggers/{id}
     * Update an existing trigger.
     */
    @PutMapping("/{id}")
    public ResponseEntity<EventTriggerConfig> updateTrigger(
            @RequestHeader("X-Client-Id") String clientId,
            @PathVariable String id,
            @Valid @RequestBody EventTriggerConfig config) {
        log.info("Updating trigger {} for client: {}", id, clientId);
        EventTriggerConfig updated = triggerService.updateTrigger(clientId, id, config);
        return ResponseEntity.ok(updated);
    }

    /**
     * DELETE /api/v1/triggers/{id}
     * Delete a trigger.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> deleteTrigger(
            @RequestHeader("X-Client-Id") String clientId,
            @PathVariable String id) {
        log.info("Deleting trigger {} for client: {}", id, clientId);
        triggerService.deleteTrigger(clientId, id);
        return ResponseEntity.ok(Map.of("message", "Trigger deleted successfully", "triggerId", id));
    }

    /**
     * POST /api/v1/triggers/{id}/enable
     * Enable a trigger.
     */
    @PostMapping("/{id}/enable")
    public ResponseEntity<EventTriggerConfig> enableTrigger(
            @RequestHeader("X-Client-Id") String clientId,
            @PathVariable String id) {
        log.info("Enabling trigger {} for client: {}", id, clientId);
        EventTriggerConfig enabled = triggerService.enableTrigger(clientId, id);
        return ResponseEntity.ok(enabled);
    }

    /**
     * POST /api/v1/triggers/{id}/disable
     * Disable (pause) a trigger.
     */
    @PostMapping("/{id}/disable")
    public ResponseEntity<EventTriggerConfig> disableTrigger(
            @RequestHeader("X-Client-Id") String clientId,
            @PathVariable String id) {
        log.info("Disabling trigger {} for client: {}", id, clientId);
        EventTriggerConfig disabled = triggerService.disableTrigger(clientId, id);
        return ResponseEntity.ok(disabled);
    }

    /**
     * GET /api/v1/triggers/{id}/logs
     * Get the last 10 activation logs for a trigger.
     */
    @GetMapping("/{id}/logs")
    public ResponseEntity<List<TriggerActivationLog>> getActivationLogs(
            @RequestHeader("X-Client-Id") String clientId,
            @PathVariable String id) {
        log.debug("Getting activation logs for trigger {} (client: {})", id, clientId);
        List<TriggerActivationLog> logs = triggerService.getActivationLogs(clientId, id);
        return ResponseEntity.ok(logs);
    }

    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<Map<String, String>> handleRuntimeException(RuntimeException ex) {
        log.error("TriggerController error: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(Map.of("error", ex.getMessage()));
    }
}
