package com.flowforge.integration.service;

import com.flowforge.integration.model.DlqMessage;
import com.flowforge.integration.model.ReplayAttempt;
import com.flowforge.integration.repository.DlqMessageRepository;
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
public class DlqReplayService {

    private static final Logger log = LoggerFactory.getLogger(DlqReplayService.class);

    private static final String STATUS_PENDING = "PENDING";
    private static final String STATUS_REPLAYING = "REPLAYING";
    private static final String STATUS_RESOLVED = "RESOLVED";
    private static final String STATUS_DISCARDED = "DISCARDED";

    private final DlqMessageRepository dlqMessageRepository;
    private final WebClient.Builder webClientBuilder;

    @Value("${flowforge.execution-engine.url:http://localhost:8081}")
    private String executionEngineUrl;

    public DlqReplayService(DlqMessageRepository dlqMessageRepository,
                             WebClient.Builder webClientBuilder) {
        this.dlqMessageRepository = dlqMessageRepository;
        this.webClientBuilder = webClientBuilder;
    }

    /**
     * Save a new DLQ message.
     */
    public DlqMessage saveDlqMessage(DlqMessage message) {
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
        return dlqMessageRepository.save(message);
    }

    /**
     * List DLQ messages for a client, paginated.
     */
    public Page<DlqMessage> listMessages(String clientId, Pageable pageable) {
        return dlqMessageRepository.findByClientId(clientId, pageable);
    }

    /**
     * List DLQ messages filtered by status.
     */
    public Page<DlqMessage> listMessagesByStatus(String clientId, String status, Pageable pageable) {
        return dlqMessageRepository.findByClientIdAndStatus(clientId, status, pageable);
    }

    /**
     * Get a single DLQ message.
     */
    public DlqMessage getMessage(String clientId, String messageId) {
        return dlqMessageRepository.findById(messageId)
                .filter(m -> clientId.equals(m.getClientId()))
                .orElseThrow(() -> new RuntimeException("DLQ message not found: " + messageId));
    }

    /**
     * Replay a single DLQ message by re-triggering the failed step via the execution engine.
     */
    public DlqMessage replayMessage(String clientId, String messageId, String replayedBy) {
        DlqMessage message = getMessage(clientId, messageId);

        if (STATUS_DISCARDED.equals(message.getStatus())) {
            throw new IllegalStateException("Cannot replay a DISCARDED DLQ message");
        }

        message.setStatus(STATUS_REPLAYING);
        message.setUpdatedAt(LocalDateTime.now());
        dlqMessageRepository.save(message);

        ReplayAttempt attempt = ReplayAttempt.builder()
                .replayedBy(replayedBy != null ? replayedBy : "SYSTEM")
                .replayedAt(LocalDateTime.now())
                .build();

        try {
            Map<String, Object> replayRequest = new HashMap<>();
            replayRequest.put("dlqMessageId", message.getId());
            replayRequest.put("executionId", message.getExecutionId());
            replayRequest.put("workflowId", message.getWorkflowId());
            replayRequest.put("stepId", message.getStepId());
            replayRequest.put("stepType", message.getStepType());
            replayRequest.put("stepConfig", message.getStepConfig());
            replayRequest.put("executionContext", message.getExecutionContext());
            replayRequest.put("clientId", clientId);

            String response = webClientBuilder.build()
                    .post()
                    .uri(executionEngineUrl + "/api/v1/executions/replay-step")
                    .header("X-Client-Id", clientId)
                    .bodyValue(replayRequest)
                    .retrieve()
                    .bodyToMono(String.class)
                    .block();

            log.info("DLQ message {} replayed successfully. Response: {}", messageId, response);

            attempt.setResult("SUCCESS");
            message.setStatus(STATUS_RESOLVED);

        } catch (Exception e) {
            log.error("Failed to replay DLQ message {}: {}", messageId, e.getMessage(), e);
            attempt.setResult("FAILED");
            attempt.setErrorMessage(e.getMessage());
            message.setStatus(STATUS_PENDING);
        }

        message.setRetryCount(message.getRetryCount() + 1);
        message.getReplayHistory().add(attempt);
        message.setUpdatedAt(LocalDateTime.now());
        return dlqMessageRepository.save(message);
    }

    /**
     * Replay all PENDING DLQ messages for a client.
     */
    public List<DlqMessage> replayAllPending(String clientId, String replayedBy) {
        List<DlqMessage> pending = dlqMessageRepository.findByClientIdAndStatus(clientId, STATUS_PENDING);
        log.info("Batch replaying {} pending DLQ messages for client {}", pending.size(), clientId);

        List<DlqMessage> results = new ArrayList<>();
        for (DlqMessage message : pending) {
            try {
                results.add(replayMessage(clientId, message.getId(), replayedBy));
            } catch (Exception e) {
                log.error("Failed to replay DLQ message {} during batch replay: {}", message.getId(), e.getMessage());
                results.add(message);
            }
        }
        return results;
    }

    /**
     * Discard a DLQ message.
     */
    public DlqMessage discardMessage(String clientId, String messageId) {
        DlqMessage message = getMessage(clientId, messageId);
        message.setStatus(STATUS_DISCARDED);
        message.setUpdatedAt(LocalDateTime.now());
        log.info("Discarded DLQ message {} for client {}", messageId, clientId);
        return dlqMessageRepository.save(message);
    }

    /**
     * Get counts by status for a client.
     */
    public Map<String, Long> getStatusCounts(String clientId) {
        Map<String, Long> counts = new LinkedHashMap<>();
        counts.put("pending", dlqMessageRepository.countByClientIdAndStatus(clientId, STATUS_PENDING));
        counts.put("replaying", dlqMessageRepository.countByClientIdAndStatus(clientId, STATUS_REPLAYING));
        counts.put("resolved", dlqMessageRepository.countByClientIdAndStatus(clientId, STATUS_RESOLVED));
        counts.put("discarded", dlqMessageRepository.countByClientIdAndStatus(clientId, STATUS_DISCARDED));
        return counts;
    }
}
