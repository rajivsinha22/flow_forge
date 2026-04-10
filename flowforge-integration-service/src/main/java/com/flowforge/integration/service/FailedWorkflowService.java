package com.flowforge.integration.service;

import com.flowforge.integration.model.FailedWorkflow;
import com.flowforge.integration.model.ReplayAttempt;
import com.flowforge.integration.repository.FailedWorkflowRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.LocalDateTime;
import java.util.*;

@Service
public class FailedWorkflowService {

    private static final Logger log = LoggerFactory.getLogger(FailedWorkflowService.class);

    private static final String STATUS_PENDING = "PENDING";
    private static final String STATUS_REPLAYING = "REPLAYING";
    private static final String STATUS_RESOLVED = "RESOLVED";
    private static final String STATUS_DISCARDED = "DISCARDED";

    private final FailedWorkflowRepository failedWorkflowRepository;
    private final WebClient.Builder webClientBuilder;

    @Value("${flowforge.execution-engine.url:http://localhost:8081}")
    private String executionEngineUrl;

    public FailedWorkflowService(FailedWorkflowRepository failedWorkflowRepository,
                                 WebClient.Builder webClientBuilder) {
        this.failedWorkflowRepository = failedWorkflowRepository;
        this.webClientBuilder = webClientBuilder;
    }

    /**
     * Save a new failed workflow entry.
     */
    public FailedWorkflow saveFailedWorkflow(FailedWorkflow message) {
        if (message.getId() == null) {
            message.setId(UUID.randomUUID().toString());
        }
        if (message.getStatus() == null) {
            message.setStatus(STATUS_PENDING);
        }
        if (message.getReplayHistory() == null) {
            message.setReplayHistory(new ArrayList<>());
        }
        if (message.getFailedAt() == null) {
            message.setFailedAt(LocalDateTime.now());
        }
        message.setUpdatedAt(LocalDateTime.now());
        return failedWorkflowRepository.save(message);
    }

    /**
     * List failed workflow entries for a client, paginated.
     */
    public Page<FailedWorkflow> listMessages(String clientId, Pageable pageable) {
        return failedWorkflowRepository.findByClientId(clientId, pageable);
    }

    /**
     * List failed workflow entries filtered by status.
     */
    public Page<FailedWorkflow> listMessagesByStatus(String clientId, String status, Pageable pageable) {
        return failedWorkflowRepository.findByClientIdAndStatus(clientId, status, pageable);
    }

    /**
     * Get a single failed workflow entry.
     */
    public FailedWorkflow getMessage(String clientId, String messageId) {
        return failedWorkflowRepository.findById(messageId)
                .filter(m -> clientId.equals(m.getClientId()))
                .orElseThrow(() -> new RuntimeException("Failed workflow entry not found: " + messageId));
    }

    /**
     * Replay a failed workflow entry using its stored execution context.
     */
    public FailedWorkflow replayMessage(String clientId, String messageId, String replayedBy) {
        return replayMessage(clientId, messageId, replayedBy, null, false);
    }

    /**
     * Replay a failed workflow entry by re-triggering the failed step via the execution engine.
     *
     * @param clientId           Tenant ID
     * @param messageId          Failed workflow entry ID
     * @param replayedBy         Identity of the user/system initiating the replay
     * @param contextOverride    If non-null, replaces the stored executionContext entirely.
     *                           Populated when a user with ADMIN role or failed-workflows:write permission
     *                           edits the context before replaying.
     * @param contextWasModified Whether the contextOverride was intentionally supplied.
     *                           Recorded in the ReplayAttempt for audit purposes.
     */
    public FailedWorkflow replayMessage(String clientId, String messageId, String replayedBy,
                                        Map<String, Object> contextOverride, boolean contextWasModified) {
        FailedWorkflow message = getMessage(clientId, messageId);

        if (STATUS_DISCARDED.equals(message.getStatus())) {
            throw new IllegalStateException("Cannot replay a DISCARDED failed workflow entry");
        }

        message.setStatus(STATUS_REPLAYING);
        message.setUpdatedAt(LocalDateTime.now());
        failedWorkflowRepository.save(message);

        ReplayAttempt attempt = ReplayAttempt.builder()
                .replayedBy(replayedBy != null ? replayedBy : "SYSTEM")
                .replayedAt(LocalDateTime.now())
                .contextWasModified(contextWasModified)
                .build();

        // Use caller-supplied context if provided; otherwise fall back to the stored snapshot.
        Map<String, Object> effectiveContext = (contextOverride != null)
                ? contextOverride
                : message.getExecutionContext();

        try {
            Map<String, Object> replayRequest = new HashMap<>();
            replayRequest.put("dlqMessageId", message.getId());
            replayRequest.put("executionId", message.getExecutionId());
            replayRequest.put("workflowId", message.getWorkflowId());
            replayRequest.put("stepId", message.getStepId());
            replayRequest.put("stepType", message.getStepType());
            replayRequest.put("stepConfig", message.getStepConfig());
            replayRequest.put("executionContext", effectiveContext);
            replayRequest.put("clientId", clientId);

            String response = webClientBuilder.build()
                    .post()
                    .uri(executionEngineUrl + "/api/v1/executions/replay-step")
                    .header("X-Client-Id", clientId)
                    .bodyValue(replayRequest)
                    .retrieve()
                    .bodyToMono(String.class)
                    .block();

            log.info("Failed workflow entry {} replayed successfully (contextModified={}). Response: {}",
                    messageId, contextWasModified, response);

            attempt.setResult("SUCCESS");
            message.setStatus(STATUS_RESOLVED);

        } catch (Exception e) {
            log.error("Failed to replay failed workflow entry {}: {}", messageId, e.getMessage(), e);
            attempt.setResult("FAILED");
            attempt.setErrorMessage(e.getMessage());
            message.setStatus(STATUS_PENDING);
        }

        message.setRetryCount(message.getRetryCount() + 1);
        message.getReplayHistory().add(attempt);
        message.setUpdatedAt(LocalDateTime.now());
        return failedWorkflowRepository.save(message);
    }

    /**
     * Replay all PENDING failed workflow entries for a client.
     */
    public List<FailedWorkflow> replayAllPending(String clientId, String replayedBy) {
        List<FailedWorkflow> pending = failedWorkflowRepository.findByClientIdAndStatus(clientId, STATUS_PENDING);
        log.info("Batch replaying {} pending failed workflow entries for client {}", pending.size(), clientId);

        List<FailedWorkflow> results = new ArrayList<>();
        for (FailedWorkflow message : pending) {
            try {
                results.add(replayMessage(clientId, message.getId(), replayedBy));
            } catch (Exception e) {
                log.error("Failed to replay entry {} during batch replay: {}", message.getId(), e.getMessage());
                results.add(message);
            }
        }
        return results;
    }

    /**
     * Discard a failed workflow entry.
     */
    public FailedWorkflow discardMessage(String clientId, String messageId) {
        FailedWorkflow message = getMessage(clientId, messageId);
        message.setStatus(STATUS_DISCARDED);
        message.setUpdatedAt(LocalDateTime.now());
        log.info("Discarded failed workflow entry {} for client {}", messageId, clientId);
        return failedWorkflowRepository.save(message);
    }

    /**
     * Get counts by status for a client.
     */
    public Map<String, Long> getStatusCounts(String clientId) {
        Map<String, Long> counts = new LinkedHashMap<>();
        counts.put("pending", failedWorkflowRepository.countByClientIdAndStatus(clientId, STATUS_PENDING));
        counts.put("replaying", failedWorkflowRepository.countByClientIdAndStatus(clientId, STATUS_REPLAYING));
        counts.put("resolved", failedWorkflowRepository.countByClientIdAndStatus(clientId, STATUS_RESOLVED));
        counts.put("discarded", failedWorkflowRepository.countByClientIdAndStatus(clientId, STATUS_DISCARDED));
        return counts;
    }
}
