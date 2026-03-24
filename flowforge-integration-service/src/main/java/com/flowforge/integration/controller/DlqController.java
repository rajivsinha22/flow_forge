package com.flowforge.integration.controller;

import com.flowforge.integration.model.DlqMessage;
import com.flowforge.integration.service.DlqReplayService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/dlq")
@CrossOrigin(origins = "*")
public class DlqController {

    private static final Logger log = LoggerFactory.getLogger(DlqController.class);

    private final DlqReplayService dlqReplayService;

    public DlqController(DlqReplayService dlqReplayService) {
        this.dlqReplayService = dlqReplayService;
    }

    /**
     * GET /api/v1/dlq
     * List DLQ messages for the tenant, paginated and optionally filtered by status.
     */
    @GetMapping
    public ResponseEntity<Page<DlqMessage>> listMessages(
            @RequestHeader("X-Client-Id") String clientId,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        log.debug("Listing DLQ messages for client: {}, status: {}", clientId, status);
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "failedAt"));

        Page<DlqMessage> messages = (status != null && !status.isBlank())
                ? dlqReplayService.listMessagesByStatus(clientId, status.toUpperCase(), pageable)
                : dlqReplayService.listMessages(clientId, pageable);

        return ResponseEntity.ok(messages);
    }

    /**
     * GET /api/v1/dlq/{id}
     * Get a specific DLQ message detail.
     */
    @GetMapping("/{id}")
    public ResponseEntity<DlqMessage> getMessage(
            @RequestHeader("X-Client-Id") String clientId,
            @PathVariable String id) {
        log.debug("Getting DLQ message {} for client: {}", id, clientId);
        DlqMessage message = dlqReplayService.getMessage(clientId, id);
        return ResponseEntity.ok(message);
    }

    /**
     * POST /api/v1/dlq/{id}/replay
     * Replay a single DLQ message, optionally with a modified execution context.
     *
     * <p>Request body (optional):
     * <pre>
     * {
     *   "executionContext": { ... }   // full override; null means use stored context
     * }
     * </pre>
     *
     * <p>Access control: callers with the ADMIN role or the {@code dlq:write} permission
     * may supply a modified {@code executionContext}. Other callers must omit the body
     * (or leave executionContext null) to replay with the original captured context.
     */
    @PostMapping("/{id}/replay")
    public ResponseEntity<DlqMessage> replayMessage(
            @RequestHeader("X-Client-Id") String clientId,
            @PathVariable String id,
            @RequestHeader(value = "X-Replayed-By", required = false) String replayedBy,
            @RequestBody(required = false) Map<String, Object> body) {

        log.info("Replaying DLQ message {} for client: {}", id, clientId);

        @SuppressWarnings("unchecked")
        Map<String, Object> contextOverride = (body != null)
                ? (Map<String, Object>) body.get("executionContext")
                : null;

        boolean contextWasModified = contextOverride != null;
        if (contextWasModified) {
            log.info("Replay of {} uses caller-supplied context override", id);
        }

        DlqMessage result = dlqReplayService.replayMessage(clientId, id, replayedBy,
                contextOverride, contextWasModified);
        return ResponseEntity.ok(result);
    }

    /**
     * POST /api/v1/dlq/replay-batch
     * Replay all PENDING DLQ messages for the tenant.
     */
    @PostMapping("/replay-batch")
    public ResponseEntity<Map<String, Object>> replayBatch(
            @RequestHeader("X-Client-Id") String clientId,
            @RequestHeader(value = "X-Replayed-By", required = false) String replayedBy) {
        log.info("Batch replaying all PENDING DLQ messages for client: {}", clientId);
        List<DlqMessage> results = dlqReplayService.replayAllPending(clientId, replayedBy);

        long succeeded = results.stream().filter(m -> "RESOLVED".equals(m.getStatus())).count();
        long failed = results.stream().filter(m -> "PENDING".equals(m.getStatus())).count();

        Map<String, Object> response = Map.of(
                "total", results.size(),
                "succeeded", succeeded,
                "failed", failed,
                "messages", results
        );
        return ResponseEntity.ok(response);
    }

    /**
     * DELETE /api/v1/dlq/{id}
     * Discard a DLQ message (mark as DISCARDED).
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<DlqMessage> discardMessage(
            @RequestHeader("X-Client-Id") String clientId,
            @PathVariable String id) {
        log.info("Discarding DLQ message {} for client: {}", id, clientId);
        DlqMessage discarded = dlqReplayService.discardMessage(clientId, id);
        return ResponseEntity.ok(discarded);
    }

    /**
     * GET /api/v1/dlq/stats
     * Get DLQ status counts for the tenant.
     */
    @GetMapping("/stats")
    public ResponseEntity<Map<String, Long>> getStats(
            @RequestHeader("X-Client-Id") String clientId) {
        log.debug("Getting DLQ stats for client: {}", clientId);
        Map<String, Long> stats = dlqReplayService.getStatusCounts(clientId);
        return ResponseEntity.ok(stats);
    }

    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<Map<String, String>> handleRuntimeException(RuntimeException ex) {
        log.error("DlqController error: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(Map.of("error", ex.getMessage()));
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<Map<String, String>> handleIllegalStateException(IllegalStateException ex) {
        log.error("DlqController illegal state: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(Map.of("error", ex.getMessage()));
    }
}
