package com.flowforge.integration.controller;

import com.flowforge.integration.model.FailedWorkflow;
import com.flowforge.integration.service.FailedWorkflowService;
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
@RequestMapping("/api/v1/failed-workflows")
@CrossOrigin(origins = "*")
public class FailedWorkflowController {

    private static final Logger log = LoggerFactory.getLogger(FailedWorkflowController.class);

    private final FailedWorkflowService failedWorkflowService;

    public FailedWorkflowController(FailedWorkflowService failedWorkflowService) {
        this.failedWorkflowService = failedWorkflowService;
    }

    /**
     * GET /api/v1/failed-workflows
     * List failed workflow entries for the tenant, paginated and optionally filtered by status.
     */
    @GetMapping
    public ResponseEntity<Page<FailedWorkflow>> listMessages(
            @RequestHeader("X-Client-Id") String clientId,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        log.debug("Listing failed workflow entries for client: {}, status: {}", clientId, status);
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "failedAt"));

        Page<FailedWorkflow> messages = (status != null && !status.isBlank())
                ? failedWorkflowService.listMessagesByStatus(clientId, status.toUpperCase(), pageable)
                : failedWorkflowService.listMessages(clientId, pageable);

        return ResponseEntity.ok(messages);
    }

    /**
     * GET /api/v1/failed-workflows/{id}
     * Get a specific failed workflow entry.
     */
    @GetMapping("/{id}")
    public ResponseEntity<FailedWorkflow> getMessage(
            @RequestHeader("X-Client-Id") String clientId,
            @PathVariable String id) {
        log.debug("Getting failed workflow entry {} for client: {}", id, clientId);
        FailedWorkflow message = failedWorkflowService.getMessage(clientId, id);
        return ResponseEntity.ok(message);
    }

    /**
     * POST /api/v1/failed-workflows/{id}/replay
     * Replay a single failed workflow entry, optionally with a modified execution context.
     *
     * <p>Request body (optional):
     * <pre>
     * {
     *   "executionContext": { ... }   // full override; null means use stored context
     * }
     * </pre>
     *
     * <p>Access control: callers with the ADMIN role or the {@code failed-workflows:write} permission
     * may supply a modified {@code executionContext}. Other callers must omit the body
     * (or leave executionContext null) to replay with the original captured context.
     */
    @PostMapping("/{id}/replay")
    public ResponseEntity<FailedWorkflow> replayMessage(
            @RequestHeader("X-Client-Id") String clientId,
            @PathVariable String id,
            @RequestHeader(value = "X-Replayed-By", required = false) String replayedBy,
            @RequestBody(required = false) Map<String, Object> body) {

        log.info("Replaying failed workflow entry {} for client: {}", id, clientId);

        @SuppressWarnings("unchecked")
        Map<String, Object> contextOverride = (body != null)
                ? (Map<String, Object>) body.get("executionContext")
                : null;

        boolean contextWasModified = contextOverride != null;
        if (contextWasModified) {
            log.info("Replay of {} uses caller-supplied context override", id);
        }

        FailedWorkflow result = failedWorkflowService.replayMessage(clientId, id, replayedBy,
                contextOverride, contextWasModified);
        return ResponseEntity.ok(result);
    }

    /**
     * POST /api/v1/failed-workflows/replay-batch
     * Replay all PENDING failed workflow entries for the tenant.
     */
    @PostMapping("/replay-batch")
    public ResponseEntity<Map<String, Object>> replayBatch(
            @RequestHeader("X-Client-Id") String clientId,
            @RequestHeader(value = "X-Replayed-By", required = false) String replayedBy) {
        log.info("Batch replaying all PENDING failed workflow entries for client: {}", clientId);
        List<FailedWorkflow> results = failedWorkflowService.replayAllPending(clientId, replayedBy);

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
     * DELETE /api/v1/failed-workflows/{id}
     * Discard a failed workflow entry (mark as DISCARDED).
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<FailedWorkflow> discardMessage(
            @RequestHeader("X-Client-Id") String clientId,
            @PathVariable String id) {
        log.info("Discarding failed workflow entry {} for client: {}", id, clientId);
        FailedWorkflow discarded = failedWorkflowService.discardMessage(clientId, id);
        return ResponseEntity.ok(discarded);
    }

    /**
     * GET /api/v1/failed-workflows/stats
     * Get status counts for the tenant.
     */
    @GetMapping("/stats")
    public ResponseEntity<Map<String, Long>> getStats(
            @RequestHeader("X-Client-Id") String clientId) {
        log.debug("Getting failed workflow stats for client: {}", clientId);
        Map<String, Long> stats = failedWorkflowService.getStatusCounts(clientId);
        return ResponseEntity.ok(stats);
    }

    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<Map<String, String>> handleRuntimeException(RuntimeException ex) {
        log.error("FailedWorkflowController error: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(Map.of("error", ex.getMessage()));
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<Map<String, String>> handleIllegalStateException(IllegalStateException ex) {
        log.error("FailedWorkflowController illegal state: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(Map.of("error", ex.getMessage()));
    }
}
