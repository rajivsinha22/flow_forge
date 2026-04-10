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
public class FailedWorkflowEventRelay {

    private static final Logger log = LoggerFactory.getLogger(FailedWorkflowEventRelay.class);

    private static final String TOPIC_FAILED_WORKFLOWS_PREFIX = "/topic/failed-workflows/";

    private final SimpMessagingTemplate messagingTemplate;
    private final ObjectMapper objectMapper;

    public FailedWorkflowEventRelay(SimpMessagingTemplate messagingTemplate, ObjectMapper objectMapper) {
        this.messagingTemplate = messagingTemplate;
        this.objectMapper = objectMapper;
    }

    /**
     * Listens on "execution-events" using a separate consumer group ("flowforge-ws-failed-workflows")
     * so it receives all events independently of ExecutionEventRelay.
     *
     * On STEP_DEAD_LETTERED events:
     * - Extracts clientId
     * - Sends the event to /topic/failed-workflows/{clientId} for tenant-specific monitoring
     */
    @KafkaListener(
            topics = "execution-events",
            groupId = "flowforge-ws-failed-workflows",
            containerFactory = "kafkaListenerContainerFactory"
    )
    public void relayFailedWorkflowEvent(ConsumerRecord<String, Object> record) {
        log.debug("FailedWorkflowEventRelay received event from Kafka: key={}", record.key());

        try {
            ExecutionEvent event = parseEvent(record.value());

            if (event == null) {
                return;
            }

            if ("STEP_DEAD_LETTERED".equals(event.getType())) {
                String clientId = event.getClientId();
                if (clientId == null || clientId.isBlank()) {
                    log.warn("STEP_DEAD_LETTERED event missing clientId, cannot relay to failed-workflows topic");
                    return;
                }

                String topic = TOPIC_FAILED_WORKFLOWS_PREFIX + clientId;
                messagingTemplate.convertAndSend(topic, event);
                log.info("Relayed STEP_DEAD_LETTERED event for execution {} to {} (step: {})",
                        event.getExecutionId(), topic, event.getStepId());
            }

        } catch (Exception e) {
            log.error("Error relaying failed workflow event to WebSocket: {}", e.getMessage(), e);
        }
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
            log.error("Failed to parse failed workflow event: {}", e.getMessage(), e);
            return null;
        }
    }

    private String getStringField(JsonNode node, String field) {
        JsonNode value = node.get(field);
        return (value != null && !value.isNull()) ? value.asText() : null;
    }
}
