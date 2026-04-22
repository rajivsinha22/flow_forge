package com.flowforge.workflow.controller;

import com.flowforge.common.response.ApiResponse;
import com.flowforge.workflow.dto.ChangeNamespaceRequest;
import com.flowforge.workflow.dto.DataModelRequest;
import com.flowforge.workflow.dto.ValidatePayloadRequest;
import com.flowforge.workflow.model.DataModel;
import com.flowforge.workflow.service.DataModelService;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * REST API for managing reusable JSON Schema data models.
 *
 * <pre>
 * GET    /api/v1/models           → list all models for the org
 * POST   /api/v1/models           → create a new model
 * GET    /api/v1/models/{id}      → get model by ID
 * PUT    /api/v1/models/{id}      → update a model
 * DELETE /api/v1/models/{id}      → delete a model
 * POST   /api/v1/models/{id}/validate → test a payload against the model's schema
 * </pre>
 */
@RestController
@RequestMapping("/api/v1/models")
public class DataModelController {

    private static final Logger log = LoggerFactory.getLogger(DataModelController.class);

    private final DataModelService dataModelService;

    public DataModelController(DataModelService dataModelService) {
        this.dataModelService = dataModelService;
    }

    /**
     * GET /api/v1/models
     * List all data models for the authenticated org.
     */
    @GetMapping
    public ResponseEntity<ApiResponse<List<DataModel>>> listModels(
            @RequestHeader("X-Client-Id") String clientId,
            @RequestParam(defaultValue = "false") boolean activeOnly) {

        List<DataModel> models = activeOnly
                ? dataModelService.listActive(clientId)
                : dataModelService.listAll(clientId);
        return ResponseEntity.ok(ApiResponse.success(models));
    }

    /**
     * POST /api/v1/models
     * Create a new data model.
     */
    @PostMapping
    public ResponseEntity<ApiResponse<DataModel>> createModel(
            @RequestHeader("X-Client-Id") String clientId,
            @RequestHeader(value = "X-User-Id", defaultValue = "system") String userId,
            @Valid @RequestBody DataModelRequest request) {

        log.info("Creating DataModel '{}' for clientId={}", request.getName(), clientId);
        DataModel created = dataModelService.create(clientId, request, userId);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(created));
    }

    /**
     * GET /api/v1/models/{id}
     * Get a specific data model by ID.
     */
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<DataModel>> getModel(
            @RequestHeader("X-Client-Id") String clientId,
            @PathVariable String id) {

        DataModel model = dataModelService.getById(clientId, id);
        return ResponseEntity.ok(ApiResponse.success(model));
    }

    /**
     * PUT /api/v1/models/{id}
     * Update an existing data model.
     */
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<DataModel>> updateModel(
            @RequestHeader("X-Client-Id") String clientId,
            @PathVariable String id,
            @Valid @RequestBody DataModelRequest request) {

        log.info("Updating DataModel id={} for clientId={}", id, clientId);
        DataModel updated = dataModelService.update(clientId, id, request);
        return ResponseEntity.ok(ApiResponse.success(updated));
    }

    /**
     * DELETE /api/v1/models/{id}
     * Delete a data model.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteModel(
            @RequestHeader("X-Client-Id") String clientId,
            @PathVariable String id) {

        dataModelService.delete(clientId, id);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    /**
     * PATCH /api/v1/models/{id}/namespace
     * Move a data model to a different namespace.
     */
    @PatchMapping("/{id}/namespace")
    public ResponseEntity<ApiResponse<DataModel>> changeNamespace(
            @PathVariable String id,
            @RequestBody ChangeNamespaceRequest request) {

        DataModel updated = dataModelService.changeNamespace(id, request.getNamespace());
        return ResponseEntity.ok(ApiResponse.success(updated));
    }

    /**
     * POST /api/v1/models/{id}/validate
     * Test a JSON payload against this model's schema and return validation errors (if any).
     * Returns an empty list when the payload is valid.
     */
    @PostMapping("/{id}/validate")
    public ResponseEntity<ApiResponse<Map<String, Object>>> validatePayload(
            @RequestHeader("X-Client-Id") String clientId,
            @PathVariable String id,
            @RequestBody ValidatePayloadRequest request) {

        List<String> errors = dataModelService.validatePayload(clientId, id,
                request.getPayload() != null ? request.getPayload() : Map.of());

        Map<String, Object> result = Map.of(
                "valid", errors.isEmpty(),
                "errors", errors,
                "errorCount", errors.size()
        );
        return ResponseEntity.ok(ApiResponse.success(result));
    }
}
