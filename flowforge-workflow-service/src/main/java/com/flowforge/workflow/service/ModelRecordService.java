package com.flowforge.workflow.service;

import com.flowforge.workflow.dto.ModelRecordRequest;
import com.flowforge.workflow.model.DataModel;
import com.flowforge.workflow.model.ModelRecord;
import com.flowforge.workflow.repository.ModelRecordRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class ModelRecordService {

    private static final Logger log = LoggerFactory.getLogger(ModelRecordService.class);

    private final ModelRecordRepository modelRecordRepository;
    private final DataModelService dataModelService;

    public ModelRecordService(ModelRecordRepository modelRecordRepository,
                               DataModelService dataModelService) {
        this.modelRecordRepository = modelRecordRepository;
        this.dataModelService = dataModelService;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // CRUD
    // ─────────────────────────────────────────────────────────────────────────

    public List<ModelRecord> list(String clientId, String dataModelId) {
        if (dataModelId != null && !dataModelId.isBlank()) {
            return modelRecordRepository.findByClientIdAndDataModelId(clientId, dataModelId);
        }
        return modelRecordRepository.findByClientId(clientId);
    }

    public ModelRecord getById(String clientId, String id) {
        return modelRecordRepository.findByClientIdAndId(clientId, id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Model record not found: " + id));
    }

    public ModelRecord create(String clientId, ModelRecordRequest request, String createdBy) {
        log.info("Creating ModelRecord '{}' for dataModel={} clientId={}",
                request.getName(), request.getDataModelId(), clientId);

        // Validate the referenced DataModel exists
        DataModel dataModel = dataModelService.getById(clientId, request.getDataModelId());

        // Validate data against the DataModel schema
        validateData(dataModel, request.getData());

        // Check name uniqueness within (clientId, dataModelId)
        if (modelRecordRepository.existsByClientIdAndDataModelIdAndName(
                clientId, request.getDataModelId(), request.getName())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "A model record named '" + request.getName() + "' already exists for this data model");
        }

        LocalDateTime now = LocalDateTime.now();
        ModelRecord record = ModelRecord.builder()
                .id(UUID.randomUUID().toString())
                .clientId(clientId)
                .dataModelId(request.getDataModelId())
                .name(request.getName())
                .data(request.getData() != null ? request.getData() : new HashMap<>())
                .createdBy(createdBy)
                .createdAt(now)
                .updatedAt(now)
                .build();

        return modelRecordRepository.save(record);
    }

    public ModelRecord update(String clientId, String id, ModelRecordRequest request) {
        ModelRecord existing = getById(clientId, id);

        // Validate the referenced DataModel exists
        DataModel dataModel = dataModelService.getById(clientId, existing.getDataModelId());

        // Validate data against the DataModel schema
        validateData(dataModel, request.getData());

        // Check name uniqueness if name changed
        if (!existing.getName().equals(request.getName()) &&
                modelRecordRepository.existsByClientIdAndDataModelIdAndNameAndIdNot(
                        clientId, existing.getDataModelId(), request.getName(), id)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "A model record named '" + request.getName() + "' already exists for this data model");
        }

        existing.setName(request.getName());
        existing.setData(request.getData() != null ? request.getData() : new HashMap<>());
        existing.setUpdatedAt(LocalDateTime.now());

        return modelRecordRepository.save(existing);
    }

    /**
     * Update just the data payload of an existing record.
     * Used by the execution engine to write back model data after WRITE-scope execution.
     */
    public ModelRecord updateData(String clientId, String id, Map<String, Object> data) {
        ModelRecord existing = getById(clientId, id);

        // Validate updated data against the DataModel schema
        DataModel dataModel = dataModelService.getById(clientId, existing.getDataModelId());
        validateData(dataModel, data);

        existing.setData(data != null ? data : new HashMap<>());
        existing.setUpdatedAt(LocalDateTime.now());

        log.info("Updated ModelRecord data id={} name={} clientId={}", id, existing.getName(), clientId);
        return modelRecordRepository.save(existing);
    }

    public void delete(String clientId, String id) {
        ModelRecord existing = getById(clientId, id);
        log.info("Deleting ModelRecord id={} name={} clientId={}", id, existing.getName(), clientId);
        modelRecordRepository.deleteById(id);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────────────────────

    private void validateData(DataModel dataModel, Map<String, Object> data) {
        if (data == null || data.isEmpty()) {
            return; // Allow empty data — schema may not require any fields
        }

        List<String> errors = dataModelService.validateAgainstSchema(dataModel.getSchemaJson(), data);
        if (!errors.isEmpty()) {
            log.warn("ModelRecord data validation failed against model '{}': {}",
                    dataModel.getName(), errors);
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY,
                    "Data validation failed: " + String.join("; ", errors));
        }
    }
}
