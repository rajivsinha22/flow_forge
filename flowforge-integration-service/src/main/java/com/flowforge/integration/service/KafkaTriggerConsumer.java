package com.flowforge.integration.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.flowforge.integration.model.FailedWorkflow;
import com.flowforge.integration.model.EventTriggerConfig;
import com.flowforge.integration.repository.EventTriggerConfigRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.expression.Expression;
import org.springframework.expression.ExpressionParser;
import org.springframework.expression.spel.standard.SpelExpressionParser;
import org.springframework.expression.spel.support.StandardEvaluationContext;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import com.fasterxml.jackson.core.type.TypeReference;

import java.time.LocalDateTime;
import java.util.*;

@Service
public class KafkaTriggerConsumer {

    private static final Logger log = LoggerFactory.getLogger(KafkaTriggerConsumer.class);

    private static final String EVENT_EXECUTION_COMPLETED = "EXECUTION_COMPLETED";
    private static final String EVENT_EXECUTION_FAILED = "EXECUTION_FAILED";
    private static final String EVENT_STEP_DEAD_LETTERED = "STEP_DEAD_LETTERED";

    private final EventTriggerConfigRepository triggerRepository;
    private final WebhookDeliveryService webhookDeliveryService;
    private final FailedWorkflowService failedWorkflowService;
    private final ObjectMapper objectMapper;
    private final WebClient.Builder webClientBuilder;
    private final TriggerConditionEvaluator triggerConditionEvaluator;
    private final ExpressionParser spelParser = new SpelExpressionParser();

    @Value("${flowforge.execution-engine.url:http://localhost:8081}")
    private String executionEngineUrl;

    @Value("${flowforge.client-service.url:http://localhost:8082}")
    private String clientServiceUrl;

    public KafkaTriggerConsumer(EventTriggerConfigRepository triggerRepository,
                                 WebhookDeliveryService webhookDeliveryService,
                                 FailedWorkflowService failedWorkflowService,
                                 ObjectMapper objectMapper,
                                 WebClient.Builder webClientBuilder,
                                 TriggerConditionEvaluator triggerConditionEvaluator) {
        this.triggerRepository = triggerRepository;
        this.webhookDeliveryService = webhookDeliveryService;
        this.failedWorkflowService = failedWorkflowService;
        this.objectMapper = objectMapper;
        this.webClientBuilder = webClientBuilder;
        this.triggerConditionEvaluator = triggerConditionEvaluator;
    }

    /**
     * Listens on "execution-events" topic for execution lifecycle events.
     * Handles failed workflow tracking and webhook delivery for each event type.
     */
    @KafkaListener(
            topics = "execution-events",
            groupId = "flowforge-integration-events",
            containerFactory = "kafkaListenerContainerFactory"
    )
    public void consumeExecutionEvents(ConsumerRecord<String, Object> record) {
        log.debug("Received execution event from Kafka: key={}", record.key());

        try {
            String eventJson = objectMapper.writeValueAsString(record.value());
            JsonNode event = objectMapper.readTree(eventJson);

            String eventType = getStringField(event, "type");
            String executionId = getStringField(event, "executionId");
            String clientId = getStringField(event, "clientId");

            if (eventType == null || clientId == null) {
                log.warn("Received execution event with missing type or clientId, skipping");
                return;
            }

            log.info("Processing execution event: type={}, executionId={}, clientId={}", eventType, executionId, clientId);

            switch (eventType) {
                case EVENT_STEP_DEAD_LETTERED:
                    handleStepDeadLettered(event, clientId, executionId);
                    break;
                case EVENT_EXECUTION_COMPLETED:
                case EVENT_EXECUTION_FAILED:
                    handleExecutionTerminated(event, eventType, clientId, executionId);
                    break;
                default:
                    log.debug("No special handling for event type: {}", eventType);
                    break;
            }

        } catch (Exception e) {
            log.error("Error processing execution event from Kafka: {}", e.getMessage(), e);
        }
    }

    /**
     * Listens on "execution-events" for KAFKA-type trigger activation.
     * Separate group so it processes events independently.
     */
    @KafkaListener(
            topics = "execution-events",
            groupId = "flowforge-kafka-triggers",
            containerFactory = "kafkaListenerContainerFactory"
    )
    public void consumeForKafkaTriggers(ConsumerRecord<String, Object> record) {
        log.debug("Evaluating Kafka triggers for record: key={}", record.key());

        try {
            String eventJson = objectMapper.writeValueAsString(record.value());
            JsonNode event = objectMapper.readTree(eventJson);
            String clientId = getStringField(event, "clientId");

            if (clientId == null) {
                return;
            }

            List<EventTriggerConfig> kafkaTriggers =
                    triggerRepository.findByClientIdAndEnabled(clientId, true)
                            .stream()
                            .filter(t -> "KAFKA".equals(t.getSourceType()))
                            .toList();

            for (EventTriggerConfig trigger : kafkaTriggers) {
                evaluateAndFireTrigger(trigger, event, clientId);
            }

        } catch (Exception e) {
            log.error("Error evaluating Kafka triggers: {}", e.getMessage(), e);
        }
    }

    private void handleStepDeadLettered(JsonNode event, String clientId, String executionId) {
        log.warn("Step dead-lettered for execution {} (client: {})", executionId, clientId);

        FailedWorkflow failedWorkflow = FailedWorkflow.builder()
                .id(UUID.randomUUID().toString())
                .clientId(clientId)
                .executionId(executionId)
                .workflowId(getStringField(event, "workflowId"))
                .workflowName(getStringField(event, "workflowName"))
                .stepId(getStringField(event, "stepId"))
                .stepName(getStringField(event, "stepName"))
                .stepType(getStringField(event, "stepType"))
                .failureReason(getStringField(event, "errorMessage"))
                .retryCount(0)
                .status("PENDING")
                .replayHistory(new ArrayList<>())
                .failedAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        // Extract stepConfig and executionContext if present
        if (event.has("stepConfig") && !event.get("stepConfig").isNull()) {
            try {
                failedWorkflow.setStepConfig(objectMapper.convertValue(event.get("stepConfig"), Map.class));
            } catch (Exception e) {
                log.warn("Could not parse stepConfig from dead-letter event");
            }
        }
        if (event.has("executionContext") && !event.get("executionContext").isNull()) {
            try {
                failedWorkflow.setExecutionContext(objectMapper.convertValue(event.get("executionContext"), Map.class));
            } catch (Exception e) {
                log.warn("Could not parse executionContext from dead-letter event");
            }
        }

        // Parse per-attempt retry history emitted by the execution engine
        if (event.has("retryAttempts") && event.get("retryAttempts").isArray()) {
            try {
                List<Map<String, Object>> retryAttempts = objectMapper.convertValue(
                        event.get("retryAttempts"),
                        new TypeReference<List<Map<String, Object>>>() {});
                failedWorkflow.setRetryAttempts(retryAttempts);
                log.debug("Stored {} retry attempt(s) on failed workflow entry for step {}",
                        retryAttempts.size(), failedWorkflow.getStepId());
            } catch (Exception e) {
                log.warn("Could not parse retryAttempts from dead-letter event: {}", e.getMessage());
            }
        }

        FailedWorkflow saved = failedWorkflowService.saveFailedWorkflow(failedWorkflow);
        log.info("Created failed workflow entry {} for dead-lettered step {} in execution {}",
                saved.getId(), failedWorkflow.getStepId(), executionId);

        // Deliver webhook notification for dead-lettered step
        Map<String, Object> webhookPayload = buildWebhookPayload(event, "STEP_DEAD_LETTERED");
        deliverClientWebhooks(clientId, executionId, "STEP_DEAD_LETTERED", webhookPayload);
    }

    private void handleExecutionTerminated(JsonNode event, String eventType, String clientId, String executionId) {
        Map<String, Object> webhookPayload = buildWebhookPayload(event, eventType);
        deliverClientWebhooks(clientId, executionId, eventType, webhookPayload);
    }

    private void deliverClientWebhooks(String clientId, String executionId,
                                        String eventType, Map<String, Object> payload) {
        try {
            // Fetch client settings to check if outbound webhook delivery is enabled
            Map<?, ?> clientData = webClientBuilder.build()
                    .get()
                    .uri(clientServiceUrl + "/api/v1/clients/me")
                    .header("X-Client-Id", clientId)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();

            if (clientData == null) {
                log.debug("Could not fetch client settings for {}, skipping webhook delivery", clientId);
                return;
            }

            // ApiResponse wraps the actual client object under "data"
            Object dataObj = clientData.get("data");
            if (!(dataObj instanceof Map<?, ?> clientSettings)) {
                log.debug("Unexpected client settings format for {}, skipping webhook delivery", clientId);
                return;
            }

            Object enabledFlag = clientSettings.get("webhookEnabled");
            if (!Boolean.TRUE.equals(enabledFlag)) {
                log.debug("Outbound webhook delivery disabled for client {}, skipping", clientId);
                return;
            }

            Object targetUrlObj = clientSettings.get("webhookUrl");
            if (targetUrlObj == null || targetUrlObj.toString().isBlank()) {
                log.debug("No webhook URL configured for client {}, skipping delivery", clientId);
                return;
            }

            String targetUrl = targetUrlObj.toString();
            webhookDeliveryService.createDelivery(clientId, executionId, eventType, targetUrl, payload);
            log.info("Queued webhook delivery to {} for event {} (execution: {})", targetUrl, eventType, executionId);

        } catch (Exception e) {
            log.warn("Failed to fetch client settings for webhook delivery (client: {}): {}", clientId, e.getMessage());
        }
    }

    private void evaluateAndFireTrigger(EventTriggerConfig trigger, JsonNode event, String clientId) {
        // Apply structured condition check if defined
        if (!triggerConditionEvaluator.evaluate(trigger.getCondition(), event)) {
            log.debug("Event filtered out by structured condition for trigger {}", trigger.getId());
            return;
        }

        // Apply SpEL filter if defined
        if (trigger.getFilterExpression() != null && !trigger.getFilterExpression().isBlank()) {
            try {
                StandardEvaluationContext context = new StandardEvaluationContext();
                context.setVariable("event", objectMapper.convertValue(event, Map.class));
                Expression expression = spelParser.parseExpression(trigger.getFilterExpression());
                Boolean matches = expression.getValue(context, Boolean.class);
                if (Boolean.FALSE.equals(matches)) {
                    log.debug("Event filtered out by expression for trigger {}", trigger.getId());
                    return;
                }
            } catch (Exception e) {
                log.warn("SpEL filter evaluation failed for trigger {}: {}", trigger.getId(), e.getMessage());
                return;
            }
        }

        // Route based on triggerAction
        if ("RESUME_WAIT".equals(trigger.getTriggerAction())) {
            resumeWaitState(trigger, event, clientId);
            return;
        }

        // Default: FIRE_WORKFLOW — map payload fields to workflow input
        Map<String, Object> workflowInput = new HashMap<>();
        if (trigger.getPayloadMapping() != null) {
            trigger.getPayloadMapping().forEach((workflowField, jsonPath) -> {
                try {
                    JsonNode value = event.at(jsonPath.startsWith("/") ? jsonPath : "/" + jsonPath.replace(".", "/"));
                    if (!value.isMissingNode()) {
                        workflowInput.put(workflowField, value.asText());
                    }
                } catch (Exception e) {
                    log.warn("Failed to map field {} from path {}", workflowField, jsonPath);
                }
            });
        }

        // Fire trigger
        try {
            Map<String, Object> triggerRequest = new HashMap<>();
            triggerRequest.put("workflowId", trigger.getWorkflowId());
            triggerRequest.put("clientId", clientId);
            triggerRequest.put("triggeredBy", "KAFKA");
            triggerRequest.put("triggerId", trigger.getId());
            triggerRequest.put("input", workflowInput);

            webClientBuilder.build()
                    .post()
                    .uri(executionEngineUrl + "/api/v1/executions/trigger")
                    .header("X-Client-Id", clientId)
                    .bodyValue(triggerRequest)
                    .retrieve()
                    .bodyToMono(String.class)
                    .subscribe(
                            response -> log.info("Kafka trigger {} fired workflow {}. Response: {}",
                                    trigger.getId(), trigger.getWorkflowId(), response),
                            error -> log.error("Kafka trigger {} failed to fire workflow {}: {}",
                                    trigger.getId(), trigger.getWorkflowId(), error.getMessage())
                    );

        } catch (Exception e) {
            log.error("Failed to fire Kafka trigger {}: {}", trigger.getId(), e.getMessage(), e);
        }
    }

    private void resumeWaitState(EventTriggerConfig trigger, JsonNode event, String clientId) {
        // Determine wait token or executionId+stepId
        String waitToken = null;
        if (trigger.getResumeTokenPath() != null && !trigger.getResumeTokenPath().isBlank()) {
            // Extract token from event using the configured path
            String pointer = trigger.getResumeTokenPath().startsWith("/")
                    ? trigger.getResumeTokenPath()
                    : "/" + trigger.getResumeTokenPath().replace(".", "/");
            JsonNode tokenNode = event.at(pointer);
            if (!tokenNode.isMissingNode()) {
                waitToken = tokenNode.asText();
            }
        }

        // Build resume data from payload mapping
        Map<String, Object> resumeData = new HashMap<>();
        if (trigger.getPayloadMapping() != null) {
            trigger.getPayloadMapping().forEach((field, jsonPath) -> {
                String pointer = jsonPath.startsWith("/") ? jsonPath : "/" + jsonPath.replace(".", "/");
                JsonNode value = event.at(pointer);
                if (!value.isMissingNode()) {
                    resumeData.put(field, value.asText());
                }
            });
        }

        Map<String, Object> resumeRequest = new HashMap<>();
        resumeRequest.put("data", resumeData);
        resumeRequest.put("resumedBy", "KAFKA_EVENT");

        String resumeUrl;
        if (waitToken != null) {
            resumeUrl = executionEngineUrl + "/api/v1/executions/resume-by-token/" + waitToken;
        } else {
            String execId = trigger.getResumeExecutionId();
            String stepId = trigger.getResumeStepId();
            if (execId == null || stepId == null) {
                log.warn("RESUME_WAIT trigger {} has no resumeExecutionId/stepId or tokenPath configured", trigger.getId());
                return;
            }
            resumeUrl = executionEngineUrl + "/api/v1/executions/" + execId + "/steps/" + stepId + "/resume";
        }

        final String finalUrl = resumeUrl;
        webClientBuilder.build()
                .post()
                .uri(finalUrl)
                .header("X-Client-Id", clientId)
                .bodyValue(resumeRequest)
                .retrieve()
                .bodyToMono(String.class)
                .subscribe(
                        r -> log.info("Kafka trigger {} resumed wait state. URL: {}", trigger.getId(), finalUrl),
                        e -> log.error("Kafka trigger {} failed to resume wait state: {}", trigger.getId(), e.getMessage())
                );
    }

    private Map<String, Object> buildWebhookPayload(JsonNode event, String eventType) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("eventType", eventType);
        payload.put("timestamp", System.currentTimeMillis());
        try {
            payload.put("data", objectMapper.convertValue(event, Map.class));
        } catch (Exception e) {
            payload.put("data", new HashMap<>());
        }
        return payload;
    }

    private String getStringField(JsonNode node, String field) {
        JsonNode value = node.get(field);
        return (value != null && !value.isNull()) ? value.asText() : null;
    }
}
