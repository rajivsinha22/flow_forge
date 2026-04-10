package com.flowforge.workflow.controller;

import com.flowforge.common.response.ApiResponse;
import com.flowforge.workflow.dto.ModelRecordRequest;
import com.flowforge.workflow.model.ModelRecord;
import com.flowforge.workflow.service.ModelRecordService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/model-records")
public class ModelRecordController {

    private static final Logger log = LoggerFactory.getLogger(ModelRecordController.class);

    private final ModelRecordService modelRecordService;

    public ModelRecordController(ModelRecordService modelRecordService) {
        this.modelRecordService = modelRecordService;
    }

    /**
     * GET /api/v1/model-records
     * List model records, optionally filtered by dataModelId.
     */
    @GetMapping
    public ResponseEntity<ApiResponse<List<ModelRecord>>> listRecords(
            @RequestHeader("X-Client-Id") String clientId,
            @RequestParam(required = false) String dataModelId) {

        List<ModelRecord> records = modelRecordService.list(clientId, dataModelId);
        return ResponseEntity.ok(ApiResponse.success(records));
    }

    /**
     * GET /api/v1/model-records/{id}
     * Get a single model record by ID.
     */
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ModelRecord>> getRecord(
            @RequestHeader("X-Client-Id") String clientId,
            @PathVariable String id) {

        ModelRecord record = modelRecordService.getById(clientId, id);
        return ResponseEntity.ok(ApiResponse.success(record));
    }

    /**
     * POST /api/v1/model-records
     * Create a new model record. Data is validated against the referenced DataModel schema.
     */
    @PostMapping
    public ResponseEntity<ApiResponse<ModelRecord>> createRecord(
            @RequestHeader("X-Client-Id") String clientId,
            @RequestHeader(value = "X-User-Id", defaultValue = "system") String userId,
            @RequestBody ModelRecordRequest request) {

        log.info("Creating model record '{}' for dataModel={} clientId={}",
                request.getName(), request.getDataModelId(), clientId);

        ModelRecord record = modelRecordService.create(clientId, request, userId);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(record));
    }

    /**
     * PUT /api/v1/model-records/{id}
     * Update an existing model record. Data is re-validated against the schema.
     */
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<ModelRecord>> updateRecord(
            @RequestHeader("X-Client-Id") String clientId,
            @PathVariable String id,
            @RequestBody ModelRecordRequest request) {

        log.info("Updating model record id={} clientId={}", id, clientId);

        ModelRecord record = modelRecordService.update(clientId, id, request);
        return ResponseEntity.ok(ApiResponse.success(record));
    }

    /**
     * PUT /api/v1/model-records/{id}/data
     * Update only the data payload of a model record.
     * Used by the execution engine for WRITE-scope write-back.
     */
    @PutMapping("/{id}/data")
    public ResponseEntity<ApiResponse<ModelRecord>> updateRecordData(
            @RequestHeader("X-Client-Id") String clientId,
            @PathVariable String id,
            @RequestBody Map<String, Object> data) {

        log.info("Updating model record data id={} clientId={}", id, clientId);

        ModelRecord record = modelRecordService.updateData(clientId, id, data);
        return ResponseEntity.ok(ApiResponse.success(record));
    }

    /**
     * DELETE /api/v1/model-records/{id}
     * Delete a model record.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteRecord(
            @RequestHeader("X-Client-Id") String clientId,
            @PathVariable String id) {

        log.info("Deleting model record id={} clientId={}", id, clientId);
        modelRecordService.delete(clientId, id);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
