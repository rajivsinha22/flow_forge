package com.flowforge.workflow.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.flowforge.common.exception.PlanLimitExceededException;
import com.flowforge.common.model.Client;
import com.flowforge.common.model.PlanLimits;
import com.flowforge.workflow.config.TenantContext;
import com.flowforge.workflow.dto.DataModelRequest;
import com.flowforge.workflow.model.DataModel;
import com.flowforge.workflow.repository.DataModelRepository;
import com.networknt.schema.JsonSchema;
import com.networknt.schema.JsonSchemaFactory;
import com.networknt.schema.SpecVersion;
import com.networknt.schema.ValidationMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class DataModelService {

    private static final Logger log = LoggerFactory.getLogger(DataModelService.class);

    private final DataModelRepository dataModelRepository;
    private final ObjectMapper objectMapper;

    public DataModelService(DataModelRepository dataModelRepository, ObjectMapper objectMapper) {
        this.dataModelRepository = dataModelRepository;
        this.objectMapper = objectMapper;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // CRUD
    // ─────────────────────────────────────────────────────────────────────────

    public List<DataModel> listAll(String clientId) {
        String namespace = TenantContext.getNamespace();
        return dataModelRepository.findByClientIdAndNamespace(clientId, namespace);
    }

    public List<DataModel> listActive(String clientId) {
        String namespace = TenantContext.getNamespace();
        return dataModelRepository.findByClientIdAndNamespaceAndActiveTrue(clientId, namespace);
    }

    public DataModel getById(String clientId, String id) {
        return dataModelRepository.findByClientIdAndId(clientId, id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Data model not found: " + id));
    }

    public DataModel getByName(String clientId, String name) {
        String namespace = TenantContext.getNamespace();
        return dataModelRepository.findByClientIdAndNamespaceAndName(clientId, namespace, name)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Data model not found with name: " + name));
    }

    public DataModel create(String clientId, DataModelRequest request, String createdBy) {
        log.info("Creating DataModel '{}' for clientId={}", request.getName(), clientId);

        // Plan enforcement — check model count
        String planHeader = TenantContext.getPlan();
        Client.Plan plan = Client.Plan.valueOf(planHeader != null ? planHeader : "FREE");
        PlanLimits limits = PlanLimits.forPlan(plan);
        long modelCount = dataModelRepository.countByClientId(clientId);
        if (PlanLimits.isExceeded(limits.getMaxModels(), modelCount)) {
            throw new PlanLimitExceededException(plan, "models", modelCount, limits.getMaxModels());
        }

        String namespace = TenantContext.getNamespace();
        if (dataModelRepository.existsByClientIdAndNamespaceAndName(clientId, namespace, request.getName())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "A data model named '" + request.getName() + "' already exists in namespace '" + namespace + "'");
        }

        // Validate the schema JSON is valid JSON Schema Draft-07
        validateSchemaJson(request.getSchemaJson());

        List<String> fieldNames = extractFieldNames(request.getSchemaJson());

        LocalDateTime now = LocalDateTime.now();
        DataModel model = DataModel.builder()
                .id(UUID.randomUUID().toString())
                .clientId(clientId)
                .namespace(namespace)
                .name(request.getName())
                .description(request.getDescription())
                .schemaJson(request.getSchemaJson())
                .fieldNames(fieldNames)
                .tags(request.getTags())
                .active(request.isActive())
                .createdBy(createdBy)
                .createdAt(now)
                .updatedAt(now)
                .build();

        return dataModelRepository.save(model);
    }

    public DataModel update(String clientId, String id, DataModelRequest request) {
        DataModel existing = getById(clientId, id);

        // Check name uniqueness if name changed
        if (!existing.getName().equals(request.getName()) &&
                dataModelRepository.existsByClientIdAndNameAndIdNot(clientId, request.getName(), id)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "A data model named '" + request.getName() + "' already exists");
        }

        // Validate new schema JSON
        validateSchemaJson(request.getSchemaJson());

        existing.setName(request.getName());
        existing.setDescription(request.getDescription());
        existing.setSchemaJson(request.getSchemaJson());
        existing.setFieldNames(extractFieldNames(request.getSchemaJson()));
        existing.setTags(request.getTags());
        existing.setActive(request.isActive());
        existing.setUpdatedAt(LocalDateTime.now());

        return dataModelRepository.save(existing);
    }

    public void delete(String clientId, String id) {
        DataModel existing = getById(clientId, id);
        log.info("Deleting DataModel id={} name={} clientId={}", id, existing.getName(), clientId);
        dataModelRepository.deleteById(id);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Schema Validation
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Validates a payload Map against this model's JSON Schema.
     * Returns an empty list if valid, or a list of human-readable error messages.
     */
    public List<String> validatePayload(String clientId, String modelId, Map<String, Object> payload) {
        DataModel model = getById(clientId, modelId);
        return validateAgainstSchema(model.getSchemaJson(), payload);
    }

    /**
     * Validates a payload against a raw JSON Schema string without persisting anything.
     * Used at execution time by the execution engine (via this service or standalone).
     */
    public List<String> validateAgainstSchema(String schemaJson, Map<String, Object> payload) {
        try {
            JsonSchemaFactory factory = JsonSchemaFactory.getInstance(SpecVersion.VersionFlag.V7);
            JsonSchema schema = factory.getSchema(schemaJson);
            JsonNode inputNode = objectMapper.valueToTree(payload);
            Set<ValidationMessage> errors = schema.validate(inputNode);
            return errors.stream()
                    .map(ValidationMessage::getMessage)
                    .collect(Collectors.toList());
        } catch (Exception e) {
            log.error("Schema validation error: {}", e.getMessage(), e);
            return List.of("Schema validation failed: " + e.getMessage());
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Parses and validates that the provided string is valid JSON Schema Draft-07.
     * Throws 400 if invalid.
     */
    private void validateSchemaJson(String schemaJson) {
        try {
            JsonNode schemaNode = objectMapper.readTree(schemaJson);
            if (!schemaNode.isObject()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Schema must be a JSON object");
            }
            // Attempt to build a JsonSchema instance — throws if structurally invalid
            JsonSchemaFactory.getInstance(SpecVersion.VersionFlag.V7).getSchema(schemaJson);
        } catch (ResponseStatusException e) {
            throw e;
        } catch (JsonProcessingException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Invalid JSON: " + e.getOriginalMessage());
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Invalid JSON Schema: " + e.getMessage());
        }
    }

    /**
     * Extracts the top-level property names from a JSON Schema for display purposes.
     */
    @SuppressWarnings("unchecked")
    private List<String> extractFieldNames(String schemaJson) {
        try {
            Map<String, Object> schemaMap = objectMapper.readValue(schemaJson, Map.class);
            Object properties = schemaMap.get("properties");
            if (properties instanceof Map) {
                return new ArrayList<>(((Map<String, Object>) properties).keySet());
            }
        } catch (Exception e) {
            log.debug("Could not extract field names from schema: {}", e.getMessage());
        }
        return new ArrayList<>();
    }
}
