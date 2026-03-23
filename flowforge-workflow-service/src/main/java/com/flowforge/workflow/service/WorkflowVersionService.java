package com.flowforge.workflow.service;

import com.flowforge.workflow.dto.PublishRequest;
import com.flowforge.workflow.dto.RollbackRequest;
import com.flowforge.workflow.model.WorkflowDefinition;
import com.flowforge.workflow.repository.WorkflowDefinitionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

@Service
public class WorkflowVersionService {

    private static final Logger log = LoggerFactory.getLogger(WorkflowVersionService.class);

    private final WorkflowDefinitionRepository workflowRepository;
    private final WorkflowValidationService validationService;

    public WorkflowVersionService(WorkflowDefinitionRepository workflowRepository,
                                   WorkflowValidationService validationService) {
        this.workflowRepository = workflowRepository;
        this.validationService = validationService;
    }

    /**
     * Publish a workflow. This creates a new version and marks it as active.
     * The previous active version is deprecated.
     */
    public WorkflowDefinition publishWorkflow(String clientId, String id, PublishRequest request, String publishedBy) {
        WorkflowDefinition workflow = workflowRepository.findById(id)
                .filter(w -> clientId.equals(w.getClientId()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Workflow not found: " + id));

        if (!"DRAFT".equals(workflow.getStatus())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Only DRAFT workflows can be published. Current status: " + workflow.getStatus());
        }

        // Validate before publishing
        var validationResult = validationService.validate(workflow);
        if (!validationResult.isValid()) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY,
                    "Workflow validation failed: " + String.join("; ", validationResult.getErrors()));
        }

        // Find all versions for this workflow name
        List<WorkflowDefinition> allVersions = workflowRepository.findByClientIdAndName(clientId, workflow.getName());

        // Deprecate any currently active/published version
        allVersions.stream()
                .filter(w -> !w.getId().equals(id))
                .filter(w -> "PUBLISHED".equals(w.getStatus()) && w.isActiveVersion())
                .forEach(w -> {
                    w.setActiveVersion(false);
                    w.setStatus("DEPRECATED");
                    w.setUpdatedAt(LocalDateTime.now());
                    workflowRepository.save(w);
                    log.info("Deprecated previous active version: id={}, version={}", w.getId(), w.getVersion());
                });

        // Determine new version number
        int maxVersion = allVersions.stream()
                .mapToInt(WorkflowDefinition::getVersion)
                .max()
                .orElse(0);

        // Create a new published version from the current draft
        LocalDateTime now = LocalDateTime.now();
        WorkflowDefinition publishedWorkflow = WorkflowDefinition.builder()
                .id(UUID.randomUUID().toString())
                .clientId(clientId)
                .name(workflow.getName())
                .displayName(workflow.getDisplayName())
                .description(workflow.getDescription())
                .version(maxVersion + 1)
                .activeVersion(true)
                .status("PUBLISHED")
                .triggerType(workflow.getTriggerType())
                .cronExpression(workflow.getCronExpression())
                .kafkaTopic(workflow.getKafkaTopic())
                .inputSchema(workflow.getInputSchema())
                .variables(workflow.getVariables())
                .steps(workflow.getSteps())
                .edges(workflow.getEdges())
                .publishedBy(publishedBy)
                .publishedAt(now)
                .changeLog(request.getChangeLog())
                .createdBy(workflow.getCreatedBy())
                .createdAt(workflow.getCreatedAt())
                .updatedAt(now)
                .build();

        // Delete the draft (it's been promoted to published)
        workflowRepository.deleteById(id);

        return workflowRepository.save(publishedWorkflow);
    }

    /**
     * Rollback to a specific version of a workflow by creating a new DRAFT from the target version.
     */
    public WorkflowDefinition rollback(String clientId, String id, RollbackRequest request, String requestedBy) {
        WorkflowDefinition currentWorkflow = workflowRepository.findById(id)
                .filter(w -> clientId.equals(w.getClientId()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Workflow not found: " + id));

        int targetVersion = request.getTargetVersion();
        List<WorkflowDefinition> allVersions = workflowRepository.findByClientIdAndName(clientId, currentWorkflow.getName());

        WorkflowDefinition targetVersionWorkflow = allVersions.stream()
                .filter(w -> w.getVersion() == targetVersion)
                .findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Version " + targetVersion + " not found for workflow: " + currentWorkflow.getName()));

        log.info("Rolling back workflow '{}' to version {} for clientId={}", currentWorkflow.getName(), targetVersion, clientId);

        // Find the max version
        int maxVersion = allVersions.stream()
                .mapToInt(WorkflowDefinition::getVersion)
                .max()
                .orElse(0);

        // Create a new DRAFT based on the target version
        LocalDateTime now = LocalDateTime.now();
        WorkflowDefinition rollbackDraft = WorkflowDefinition.builder()
                .id(UUID.randomUUID().toString())
                .clientId(clientId)
                .name(targetVersionWorkflow.getName())
                .displayName(targetVersionWorkflow.getDisplayName())
                .description(targetVersionWorkflow.getDescription())
                .version(maxVersion + 1)
                .activeVersion(false) // It's a draft, not yet active
                .status("DRAFT")
                .triggerType(targetVersionWorkflow.getTriggerType())
                .cronExpression(targetVersionWorkflow.getCronExpression())
                .kafkaTopic(targetVersionWorkflow.getKafkaTopic())
                .inputSchema(targetVersionWorkflow.getInputSchema())
                .variables(targetVersionWorkflow.getVariables())
                .steps(targetVersionWorkflow.getSteps())
                .edges(targetVersionWorkflow.getEdges())
                .changeLog("Rollback to version " + targetVersion + " by " + requestedBy)
                .createdBy(requestedBy)
                .createdAt(now)
                .updatedAt(now)
                .build();

        return workflowRepository.save(rollbackDraft);
    }

    /**
     * Get all versions of a workflow sorted by version number descending.
     */
    public List<WorkflowDefinition> getAllVersions(String clientId, String name) {
        List<WorkflowDefinition> versions = workflowRepository.findByClientIdAndName(clientId, name);
        versions.sort(Comparator.comparingInt(WorkflowDefinition::getVersion).reversed());
        return versions;
    }
}
