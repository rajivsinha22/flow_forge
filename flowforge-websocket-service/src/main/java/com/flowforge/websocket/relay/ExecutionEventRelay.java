package com.flowforge.websocket.relay;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.flowforge.websocket.dto.ExecutionEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

import java.util.Map;

@Component
public class ExecutionEventRelay {

    private static final Logger log = LoggerFactory.getLogger(ExecutionEventRelay.class);

    private static final String TOPIC_EXECUTIONS_PREFIX = "/topic/executions/";
    private static final String TOPIC_EXECUTIONS_ALL = "/topic/executions/all";

    private final SimpMessagingTemplate messagingTemplate;
    private final ObjectMapper objectMapper;

    public ExecutionEventRelay(SimpMessagingTemplate messagingTemplate, ObjectMapper objectMapper) {
        this.messagingTemplate = messagingTemplate;
        this.objectMapper = objectMapper;
    }

    /**
     * Listens on "execution-events" Kafka topic and relays events to WebSocket clients.
     *
     * Sends to:
     * - /topic/executions/{executionId}  (execution-specific subscribers)
     * - /topic/executions/all            (dashboard live feed)
     *
     * Handles: EXECUTION_STARTED, STEP_STARTED, STEP_COMPLETED,
     *          EXECUTION_COMPLETED, EXECUTION_FAILED
     */
    @KafkaListener(
            topics = "execution-events",
            groupId = "flowforge-websocket",
            containerFactory = "kafkaListenerContainerFactory"
    )
    public void relayExecutionEvent(ConsumerRecord<String, Object> record) {
        log.debug("ExecutionEventRelay received event from Kafka: key={}", record.key());

        try {
            ExecutionEvent event = parseEvent(record.value());

            if (event == null || event.getExecutionId() == null) {
                log.warn("Received execution event with null executionId, skipping relay");
                return;
            }

            String eventType = event.getType();

            // Only relay relevant execution lifecycle events (not DLQ — handled by DlqEventRelay)
            if (eventType == null) {
                log.warn("Received execution event with null type, skipping relay");
                return;
            }

            switch (eventType) {
                case "EXECUTION_STARTED":
                case "STEP_STARTED":
                case "STEP_COMPLETED":
                case "EXECUTION_COMPLETED":
                case "EXECUTION_FAILED":
                    relayToWebSocket(event);
                    break;
                default:
                    log.debug("ExecutionEventRelay skipping event type: {}", eventType);
                    break;
            }

        } catch (Exception e) {
            log.error("Error relaying execution event to WebSocket: {}", e.getMessage(), e);
        }
    }

    private void relayToWebSocket(ExecutionEvent event) {
        String executionTopic = TOPIC_EXECUTIONS_PREFIX + event.getExecutionId();

        // Send to execution-specific topic
        messagingTemplate.convertAndSend(executionTopic, event);
        log.debug("Relayed {} event for execution {} to {}",
                event.getType(), event.getExecutionId(), executionTopic);

        // Also broadcast to all-executions dashboard feed
        messagingTemplate.convertAndSend(TOPIC_EXECUTIONS_ALL, event);
        log.debug("Relayed {} event for execution {} to {}",
                event.getType(), event.getExecutionId(), TOPIC_EXECUTIONS_ALL);
    }

    private ExecutionEvent parseEvent(Object value) {
        try {
            if (value instanceof ExecutionEvent) {
                return (ExecutionEvent) value;
            }

            String json = objectMapper.writeValueAsString(value);
            JsonNode node = objectMapper.readTree(json);

            ExecutionEvent event = new ExecutionEvent();
            event.setType(getStringField(node, "type"));
            event.setExecutionId(getStringField(node, "executionId"));
            event.setClientId(getStringField(node, "clientId"));
            event.setWorkflowName(getStringField(node, "workflowName"));
            event.setStepId(getStringField(node, "stepId"));
            event.setStepName(getStringField(node, "stepName"));
            event.setStatus(getStringField(node, "status"));
            event.setErrorMessage(getStringField(node, "errorMessage"));
            event.setTimestamp(node.has("timestamp") ? node.get("timestamp").asLong() : System.currentTimeMillis());

            if (node.has("output") && !node.get("output").isNull()) {
                event.setOutput(objectMapper.convertValue(node.get("output"), Map.class));
            }

            return event;

        } catch (Exception e) {
            log.error("Failed to parse execution event: {}", e.getMessage(), e);
            return null;
        }
    }

    private String getStringField(JsonNode node, String field) {
        JsonNode value = node.get(field);
        return (value != null && !value.isNull()) ? value.asText() : null;
    }
}
