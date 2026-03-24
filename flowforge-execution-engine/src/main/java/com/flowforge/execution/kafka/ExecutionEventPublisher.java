package com.flowforge.execution.kafka;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

import com.flowforge.execution.model.StepDef;
import com.flowforge.execution.model.StepExecution;
import com.flowforge.execution.model.StepRetryAttempt;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Component
public class ExecutionEventPublisher {

    private static final Logger log = LoggerFactory.getLogger(ExecutionEventPublisher.class);

    private static final String TOPIC = "execution-events";

    private final KafkaTemplate<String, Object> kafkaTemplate;

    public ExecutionEventPublisher(KafkaTemplate<String, Object> kafkaTemplate) {
        this.kafkaTemplate = kafkaTemplate;
    }

    public void publishExecutionStarted(String executionId, String clientId, String workflowName) {
        Map<String, Object> event = new HashMap<>();
        event.put("type", "EXECUTION_STARTED");
        event.put("executionId", executionId);
        event.put("clientId", clientId);
        event.put("workflowName", workflowName);
        event.put("timestamp", Instant.now().toString());
        publish(executionId, event);
    }

    public void publishExecutionCompleted(String executionId, String status) {
        Map<String, Object> event = new HashMap<>();
        event.put("type", "EXECUTION_COMPLETED");
        event.put("executionId", executionId);
        event.put("status", status);
        event.put("timestamp", Instant.now().toString());
        publish(executionId, event);
    }

    public void publishStepStarted(String executionId, String stepId, String stepName) {
        Map<String, Object> event = new HashMap<>();
        event.put("type", "STEP_STARTED");
        event.put("executionId", executionId);
        event.put("stepId", stepId);
        event.put("stepName", stepName);
        event.put("timestamp", Instant.now().toString());
        publish(executionId, event);
    }

    public void publishStepCompleted(String executionId, String stepId, String status, Map<String, Object> output) {
        Map<String, Object> event = new HashMap<>();
        event.put("type", "STEP_COMPLETED");
        event.put("executionId", executionId);
        event.put("stepId", stepId);
        event.put("status", status);
        event.put("output", output);
        event.put("timestamp", Instant.now().toString());
        publish(executionId, event);
    }

    /**
     * Publish a {@code STEP_DEAD_LETTERED} event carrying the full retry trail
     * and step metadata so the integration service can create a rich DLQ message
     * without needing a separate call back to the execution engine.
     *
     * @param executionId     Workflow execution ID
     * @param stepId          Step that was dead-lettered
     * @param dlqMessageId    Pre-allocated DLQ message ID
     * @param stepExecution   The final StepExecution record (carries retryAttempts list)
     * @param stepDef         The step definition (name, type, config)
     * @param contextSnapshot Execution context at the point of failure (for replay)
     */
    public void publishStepDeadLettered(String executionId, String stepId, String dlqMessageId,
                                        StepExecution stepExecution, StepDef stepDef,
                                        Map<String, Object> contextSnapshot) {
        Map<String, Object> event = new HashMap<>();
        event.put("type", "STEP_DEAD_LETTERED");
        event.put("executionId", executionId);
        event.put("stepId", stepId);
        event.put("dlqMessageId", dlqMessageId);
        event.put("stepName", stepDef != null ? stepDef.getName() : stepId);
        event.put("stepType", stepDef != null ? stepDef.getType() : null);
        event.put("stepConfig", stepDef != null ? stepDef.getConfig() : null);
        event.put("failureReason", stepExecution != null ? stepExecution.getErrorMessage() : null);
        event.put("executionContext", contextSnapshot);
        event.put("retryAttempts", serializeRetryAttempts(
                stepExecution != null ? stepExecution.getRetryAttempts() : null));
        event.put("timestamp", Instant.now().toString());
        publish(executionId, event);
    }

    /**
     * Convert {@link StepRetryAttempt} objects to plain maps so they
     * serialize cleanly via Jackson over Kafka.
     */
    private List<Map<String, Object>> serializeRetryAttempts(List<StepRetryAttempt> attempts) {
        if (attempts == null || attempts.isEmpty()) return new ArrayList<>();
        List<Map<String, Object>> result = new ArrayList<>(attempts.size());
        for (StepRetryAttempt a : attempts) {
            Map<String, Object> m = new HashMap<>();
            m.put("attemptNumber", a.getAttemptNumber());
            m.put("errorMessage", a.getErrorMessage());
            m.put("failedAt", a.getFailedAt() != null ? a.getFailedAt().toString() : null);
            m.put("durationMs", a.getDurationMs());
            result.add(m);
        }
        return result;
    }

    private void publish(String key, Map<String, Object> event) {
        try {
            kafkaTemplate.send(TOPIC, key, event);
            log.debug("Published event type={} for executionId={}", event.get("type"), event.get("executionId"));
        } catch (Exception e) {
            log.error("Failed to publish Kafka event type={} executionId={}: {}",
                    event.get("type"), event.get("executionId"), e.getMessage(), e);
        }
    }
}
