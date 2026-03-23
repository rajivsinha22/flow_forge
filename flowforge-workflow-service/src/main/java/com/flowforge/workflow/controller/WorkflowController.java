package com.flowforge.workflow.controller;

import com.flowforge.common.response.ApiResponse;
import com.flowforge.workflow.dto.CreateWorkflowRequest;
import com.flowforge.workflow.dto.PublishRequest;
import com.flowforge.workflow.dto.RollbackRequest;
import com.flowforge.workflow.dto.UpdateWorkflowRequest;
import com.flowforge.workflow.dto.ValidationResult;
import com.flowforge.workflow.dto.WorkflowSummaryDto;
import com.flowforge.workflow.model.WorkflowDefinition;
import com.flowforge.workflow.service.DataModelService;
import com.flowforge.workflow.service.WorkflowService;
import com.flowforge.workflow.service.WorkflowValidationService;
import com.flowforge.workflow.service.WorkflowVersionService;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
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
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/workflows")
public class WorkflowController {

    private static final Logger log = LoggerFactory.getLogger(WorkflowController.class);

    private final WorkflowService workflowService;
    private final WorkflowVersionService versionService;
    private final WorkflowValidationService validationService;
    private final DataModelService dataModelService;

    public WorkflowController(WorkflowService workflowService,
                               WorkflowVersionService versionService,
                               WorkflowValidationService validationService,
                               DataModelService dataModelService) {
        this.workflowService = workflowService;
        this.versionService = versionService;
        this.validationService = validationService;
        this.dataModelService = dataModelService;
    }

    /** Enriches a WorkflowDefinition with resolved schema JSON strings (from linked DataModels). */
    private WorkflowDefinition enrichWithSchemas(String clientId, WorkflowDefinition workflow) {
        if (workflow.getInputModelId() != null) {
            try {
                workflow.setResolvedInputSchemaJson(
                        dataModelService.getById(clientId, workflow.getInputModelId()).getSchemaJson());
            } catch (Exception e) {
                log.warn("Could not resolve inputModelId={} for workflow={}: {}",
                        workflow.getInputModelId(), workflow.getId(), e.getMessage());
            }
        }
        if (workflow.getOutputModelId() != null) {
            try {
                workflow.setResolvedOutputSchemaJson(
                        dataModelService.getById(clientId, workflow.getOutputModelId()).getSchemaJson());
            } catch (Exception e) {
                log.warn("Could not resolve outputModelId={} for workflow={}: {}",
                        workflow.getOutputModelId(), workflow.getId(), e.getMessage());
            }
        }
        return workflow;
    }

    /**
     * GET /api/v1/workflows
     * List workflows for the tenant, paginated, filterable by status and triggerType.
     */
    @GetMapping
    public ResponseEntity<ApiResponse<Page<WorkflowSummaryDto>>> listWorkflows(
            @RequestHeader("X-Client-Id") String clientId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String triggerType,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir) {

        Sort sort = "asc".equalsIgnoreCase(sortDir)
                ? Sort.by(sortBy).ascending()
                : Sort.by(sortBy).descending();

        Page<WorkflowDefinition> workflows = workflowService.listWorkflows(
                clientId, status, triggerType, PageRequest.of(page, size, sort));

        Page<WorkflowSummaryDto> summaries = workflows.map(workflowService::toSummary);
        return ResponseEntity.ok(ApiResponse.success(summaries));
    }

    /**
     * POST /api/v1/workflows
     * Create a new workflow in DRAFT status.
     */
    @PostMapping
    public ResponseEntity<ApiResponse<WorkflowDefinition>> createWorkflow(
            @RequestHeader("X-Client-Id") String clientId,
            @RequestHeader(value = "X-User-Id", defaultValue = "system") String userId,
            @Valid @RequestBody CreateWorkflowRequest request) {

        log.info("Creating workflow '{}' for clientId={}", request.getName(), clientId);
        WorkflowDefinition created = workflowService.createWorkflow(clientId, request, userId);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(created));
    }

    /**
     * GET /api/v1/workflows/{id}
     * Get a workflow by its ID.
     */
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<WorkflowDefinition>> getWorkflow(
            @RequestHeader("X-Client-Id") String clientId,
            @PathVariable String id) {

        WorkflowDefinition workflow = workflowService.getWorkflowById(clientId, id);
        enrichWithSchemas(clientId, workflow);
        return ResponseEntity.ok(ApiResponse.success(workflow));
    }

    /**
     * PUT /api/v1/workflows/{id}
     * Update a workflow (only allowed for DRAFT status).
     */
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<WorkflowDefinition>> updateWorkflow(
            @RequestHeader("X-Client-Id") String clientId,
            @PathVariable String id,
            @RequestBody UpdateWorkflowRequest request) {

        WorkflowDefinition updated = workflowService.updateWorkflow(clientId, id, request);
        return ResponseEntity.ok(ApiResponse.success(updated));
    }

    /**
     * DELETE /api/v1/workflows/{id}
     * Delete a workflow.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteWorkflow(
            @RequestHeader("X-Client-Id") String clientId,
            @PathVariable String id) {

        workflowService.deleteWorkflow(clientId, id);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    /**
     * POST /api/v1/workflows/{id}/publish
     * Publish a DRAFT workflow. Validates and creates a new published version.
     */
    @PostMapping("/{id}/publish")
    public ResponseEntity<ApiResponse<WorkflowDefinition>> publishWorkflow(
            @RequestHeader("X-Client-Id") String clientId,
            @RequestHeader(value = "X-User-Id", defaultValue = "system") String userId,
            @PathVariable String id,
            @Valid @RequestBody PublishRequest request) {

        log.info("Publishing workflow id={} for clientId={}", id, clientId);
        WorkflowDefinition published = versionService.publishWorkflow(clientId, id, request, userId);
        return ResponseEntity.ok(ApiResponse.success(published));
    }

    /**
     * POST /api/v1/workflows/{id}/rollback
     * Rollback to a previous version of a workflow.
     */
    @PostMapping("/{id}/rollback")
    public ResponseEntity<ApiResponse<WorkflowDefinition>> rollbackWorkflow(
            @RequestHeader("X-Client-Id") String clientId,
            @RequestHeader(value = "X-User-Id", defaultValue = "system") String userId,
            @PathVariable String id,
            @Valid @RequestBody RollbackRequest request) {

        log.info("Rolling back workflow id={} to version={} for clientId={}", id, request.getTargetVersion(), clientId);
        WorkflowDefinition rollback = versionService.rollback(clientId, id, request, userId);
        return ResponseEntity.ok(ApiResponse.success(rollback));
    }

    /**
     * POST /api/v1/workflows/{id}/clone
     * Clone a workflow as a new DRAFT.
     */
    @PostMapping("/{id}/clone")
    public ResponseEntity<ApiResponse<WorkflowDefinition>> cloneWorkflow(
            @RequestHeader("X-Client-Id") String clientId,
            @RequestHeader(value = "X-User-Id", defaultValue = "system") String userId,
            @PathVariable String id) {

        log.info("Cloning workflow id={} for clientId={}", id, clientId);
        WorkflowDefinition clone = workflowService.cloneWorkflow(clientId, id, userId);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(clone));
    }

    /**
     * GET /api/v1/workflows/{name}/versions
     * Get all versions of a workflow by name.
     */
    @GetMapping("/{name}/versions")
    public ResponseEntity<ApiResponse<List<WorkflowDefinition>>> getVersions(
            @RequestHeader("X-Client-Id") String clientId,
            @PathVariable String name) {

        List<WorkflowDefinition> versions = versionService.getAllVersions(clientId, name);
        if (versions.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND,
                    "No workflow found with name: " + name);
        }
        return ResponseEntity.ok(ApiResponse.success(versions));
    }

    /**
     * POST /api/v1/workflows/{id}/validate
     * Validate a workflow definition (cycles, missing references, required fields).
     */
    @PostMapping("/{id}/validate")
    public ResponseEntity<ApiResponse<ValidationResult>> validateWorkflow(
            @RequestHeader("X-Client-Id") String clientId,
            @PathVariable String id) {

        WorkflowDefinition workflow = workflowService.getWorkflowById(clientId, id);
        ValidationResult result = validationService.validate(workflow);
        return ResponseEntity.ok(ApiResponse.success(result));
    }
}
