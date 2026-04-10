package com.flowforge.execution.engine;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;
import java.util.HashMap;
import java.util.Map;

/**
 * Loads and manages model records from the flowforge-workflow-service via HTTP.
 * Used by the WorkflowOrchestrator for data sync (READ/WRITE) operations.
 */
@Component
public class ModelRecordLoader {

    private static final Logger log = LoggerFactory.getLogger(ModelRecordLoader.class);

    private final WebClient workflowServiceClient;

    public ModelRecordLoader(
            @Value("${flowforge.workflow-service.url:http://localhost:8082}") String workflowServiceUrl) {
        this.workflowServiceClient = WebClient.builder()
                .baseUrl(workflowServiceUrl)
                .build();
    }

    /**
     * Load a model record by ID from the workflow service.
     *
     * @return a Map representing the ModelRecord with keys: id, clientId, dataModelId, name, data
     */
    @SuppressWarnings("unchecked")
    public Map<String, Object> loadById(String clientId, String modelRecordId) {
        log.debug("Loading model record id={} for clientId={}", modelRecordId, clientId);
        try {
            Map<String, Object> response = workflowServiceClient.get()
                    .uri("/api/v1/model-records/{id}", modelRecordId)
                    .header("X-Client-Id", clientId)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .timeout(Duration.ofSeconds(10))
                    .block();

            if (response == null) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Model record not found: " + modelRecordId);
            }

            Object data = response.get("data");
            if (data instanceof Map) {
                return (Map<String, Object>) data;
            }
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,
                    "Unexpected response format from workflow service for model record");
        } catch (WebClientResponseException e) {
            if (e.getStatusCode() == HttpStatus.NOT_FOUND) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Model record not found: " + modelRecordId);
            }
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Workflow service unavailable: " + e.getMessage());
        } catch (ResponseStatusException e) {
            throw e;
        } catch (Exception e) {
            log.error("Failed to load model record id={}: {}", modelRecordId, e.getMessage(), e);
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Failed to load model record: " + e.getMessage());
        }
    }

    /**
     * Auto-create a new model record from raw input data.
     * Called when a workflow is triggered with raw data (no existing modelRecordId).
     *
     * @return a Map representing the created ModelRecord (includes generated id)
     */
    @SuppressWarnings("unchecked")
    public Map<String, Object> create(String clientId, String dataModelId, String name,
                                       Map<String, Object> recordData) {
        log.info("Auto-creating model record name='{}' dataModelId={} clientId={}", name, dataModelId, clientId);
        try {
            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("dataModelId", dataModelId);
            requestBody.put("name", name);
            requestBody.put("data", recordData);

            Map<String, Object> response = workflowServiceClient.post()
                    .uri("/api/v1/model-records")
                    .header("X-Client-Id", clientId)
                    .header("X-User-Id", "execution-engine")
                    .bodyValue(requestBody)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .timeout(Duration.ofSeconds(10))
                    .block();

            if (response == null) {
                throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,
                        "Failed to create model record — null response");
            }

            Object data = response.get("data");
            if (data instanceof Map) {
                Map<String, Object> created = (Map<String, Object>) data;
                log.info("Auto-created model record id={} name='{}'", created.get("id"), name);
                return created;
            }
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,
                    "Unexpected response format when creating model record");
        } catch (WebClientResponseException e) {
            log.error("Failed to auto-create model record: {} — {}", e.getStatusCode(), e.getResponseBodyAsString());
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY,
                    "Failed to create model record: " + e.getResponseBodyAsString());
        } catch (ResponseStatusException e) {
            throw e;
        } catch (Exception e) {
            log.error("Failed to create model record: {}", e.getMessage(), e);
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Failed to create model record: " + e.getMessage());
        }
    }

    /**
     * Update the data payload of an existing model record (WRITE-scope write-back).
     */
    @SuppressWarnings("unchecked")
    public void updateData(String clientId, String modelRecordId, Map<String, Object> updatedData) {
        log.info("Writing back model record data id={} clientId={}", modelRecordId, clientId);
        try {
            workflowServiceClient.put()
                    .uri("/api/v1/model-records/{id}/data", modelRecordId)
                    .header("X-Client-Id", clientId)
                    .bodyValue(updatedData)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .timeout(Duration.ofSeconds(10))
                    .block();

            log.info("Successfully wrote back model record data id={}", modelRecordId);
        } catch (WebClientResponseException e) {
            log.error("Failed to write back model record id={}: {} — {}",
                    modelRecordId, e.getStatusCode(), e.getResponseBodyAsString());
            // Don't fail the execution for write-back errors — log and continue
        } catch (Exception e) {
            log.error("Failed to write back model record id={}: {}", modelRecordId, e.getMessage(), e);
        }
    }
}
