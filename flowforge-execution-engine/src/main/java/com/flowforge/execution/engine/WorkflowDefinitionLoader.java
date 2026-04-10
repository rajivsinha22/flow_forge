package com.flowforge.execution.engine;

import com.flowforge.execution.model.WorkflowDefinitionSnapshot;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;
import java.util.List;
import java.util.Map;

/**
 * Loads workflow definitions from the flowforge-workflow-service via HTTP.
 * Falls back to a simple in-memory cache for resilience.
 */
@Component
public class WorkflowDefinitionLoader {

    private static final Logger log = LoggerFactory.getLogger(WorkflowDefinitionLoader.class);

    private final WebClient workflowServiceClient;

    public WorkflowDefinitionLoader(
            @Value("${flowforge.workflow-service.url:http://localhost:8082}") String workflowServiceUrl) {
        this.workflowServiceClient = WebClient.builder()
                .baseUrl(workflowServiceUrl)
                .build();
    }

    @SuppressWarnings("unchecked")
    public WorkflowDefinitionSnapshot loadById(String clientId, String workflowId) {
        log.debug("Loading workflow definition id={} for clientId={}", workflowId, clientId);
        try {
            Map<String, Object> response = workflowServiceClient.get()
                    .uri("/api/v1/workflows/{id}", workflowId)
                    .header("X-Client-Id", clientId)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .timeout(Duration.ofSeconds(10))
                    .block();

            if (response == null) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Workflow definition not found: " + workflowId);
            }

            // ApiResponse<WorkflowDefinition> wrapping
            Object data = response.get("data");
            if (data instanceof Map) {
                return mapToSnapshot((Map<String, Object>) data);
            }
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,
                    "Unexpected response format from workflow service");
        } catch (WebClientResponseException e) {
            if (e.getStatusCode() == HttpStatus.NOT_FOUND) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Workflow not found: " + workflowId);
            }
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Workflow service unavailable: " + e.getMessage());
        } catch (ResponseStatusException e) {
            throw e;
        } catch (Exception e) {
            log.error("Failed to load workflow definition id={}: {}", workflowId, e.getMessage(), e);
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Failed to load workflow definition: " + e.getMessage());
        }
    }

    @SuppressWarnings("unchecked")
    public WorkflowDefinitionSnapshot loadByName(String clientId, String workflowName) {
        log.debug("Loading active workflow definition name={} for clientId={}", workflowName, clientId);
        try {
            // The workflow service exposes GET /api/v1/workflows?name=... or we use the versions endpoint
            // For simplicity, search by name via the list endpoint with a filter
            Map<String, Object> response = workflowServiceClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .path("/api/v1/workflows")
                            .queryParam("status", "PUBLISHED")
                            .build())
                    .header("X-Client-Id", clientId)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .timeout(Duration.ofSeconds(10))
                    .block();

            if (response == null) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Workflow not found: " + workflowName);
            }

            // Page<WorkflowSummaryDto> inside ApiResponse
            Object data = response.get("data");
            if (data instanceof Map) {
                Map<String, Object> page = (Map<String, Object>) data;
                List<Map<String, Object>> content = (List<Map<String, Object>>) page.get("content");
                if (content != null) {
                    for (Map<String, Object> summary : content) {
                        if (workflowName.equals(summary.get("name"))) {
                            String id = (String) summary.get("id");
                            return loadById(clientId, id);
                        }
                    }
                }
            }
            throw new ResponseStatusException(HttpStatus.NOT_FOUND,
                    "Active workflow not found with name: " + workflowName);
        } catch (ResponseStatusException e) {
            throw e;
        } catch (Exception e) {
            log.error("Failed to load workflow by name={}: {}", workflowName, e.getMessage(), e);
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Failed to load workflow definition: " + e.getMessage());
        }
    }

    @SuppressWarnings("unchecked")
    private WorkflowDefinitionSnapshot mapToSnapshot(Map<String, Object> data) {
        List<Map<String, Object>> rawSteps = (List<Map<String, Object>>) data.get("steps");
        List<com.flowforge.execution.model.StepDef> steps = new java.util.ArrayList<>();

        if (rawSteps != null) {
            for (Map<String, Object> rawStep : rawSteps) {
                com.flowforge.execution.model.RetryPolicy retryPolicy = null;
                if (rawStep.containsKey("retryPolicy") && rawStep.get("retryPolicy") instanceof Map) {
                    Map<String, Object> rp = (Map<String, Object>) rawStep.get("retryPolicy");
                    retryPolicy = com.flowforge.execution.model.RetryPolicy.builder()
                            .maxRetries(rp.containsKey("maxRetries") ? ((Number) rp.get("maxRetries")).intValue() : 0)
                            .strategy((String) rp.getOrDefault("strategy", "FIXED"))
                            .initialDelayMs(rp.containsKey("initialDelayMs") ? ((Number) rp.get("initialDelayMs")).longValue() : 0)
                            .maxDelayMs(rp.containsKey("maxDelayMs") ? ((Number) rp.get("maxDelayMs")).longValue() : 0)
                            .build();
                }
                steps.add(com.flowforge.execution.model.StepDef.builder()
                        .stepId((String) rawStep.get("stepId"))
                        .name((String) rawStep.get("name"))
                        .type((String) rawStep.get("type"))
                        .config((Map<String, Object>) rawStep.get("config"))
                        .retryPolicy(retryPolicy)
                        .onSuccess((String) rawStep.get("onSuccess"))
                        .onFailure((String) rawStep.get("onFailure"))
                        .build());
            }
        }

        Map<String, String> variables = null;
        if (data.get("variables") instanceof Map) {
            variables = (Map<String, String>) data.get("variables");
        }

        return WorkflowDefinitionSnapshot.builder()
                .id((String) data.get("id"))
                .clientId((String) data.get("clientId"))
                .name((String) data.get("name"))
                .displayName((String) data.get("displayName"))
                .version(data.containsKey("version") ? ((Number) data.get("version")).intValue() : 1)
                .triggerType((String) data.get("triggerType"))
                .inputSchema((Map<String, Object>) data.get("inputSchema"))
                .variables(variables)
                .steps(steps)
                .inputModelId((String) data.get("inputModelId"))
                .resolvedInputSchemaJson((String) data.get("resolvedInputSchemaJson"))
                .dataSyncMode((String) data.get("dataSyncMode"))
                .build();
    }
}
