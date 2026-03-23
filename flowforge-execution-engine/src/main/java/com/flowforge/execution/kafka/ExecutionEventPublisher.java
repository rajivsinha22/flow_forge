package com.flowforge.execution.kafka;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.HashMap;
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

    public void publishStepDeadLettered(String executionId, String stepId, String dlqMessageId) {
        Map<String, Object> event = new HashMap<>();
        event.put("type", "STEP_DEAD_LETTERED");
        event.put("executionId", executionId);
        event.put("stepId", stepId);
        event.put("dlqMessageId", dlqMessageId);
        event.put("timestamp", Instant.now().toString());
        publish(executionId, event);
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
