package com.flowforge.workflow.service;

import com.flowforge.common.exception.PlanLimitExceededException;
import com.flowforge.common.model.Client;
import com.flowforge.common.model.PlanLimits;
import com.flowforge.workflow.config.TenantContext;
import com.flowforge.workflow.dto.CreateWorkflowRequest;
import com.flowforge.workflow.dto.UpdateWorkflowRequest;
import com.flowforge.workflow.dto.WorkflowSummaryDto;
import com.flowforge.workflow.model.WorkflowDefinition;
import com.flowforge.workflow.repository.WorkflowDefinitionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class WorkflowService {

    private static final Logger log = LoggerFactory.getLogger(WorkflowService.class);

    private final WorkflowDefinitionRepository workflowRepository;

    public WorkflowService(WorkflowDefinitionRepository workflowRepository) {
        this.workflowRepository = workflowRepository;
    }

    public Page<WorkflowDefinition> listWorkflows(String clientId, String status, String triggerType, Pageable pageable) {
        log.debug("Listing workflows for clientId={}, status={}, triggerType={}", clientId, status, triggerType);
        if (StringUtils.hasText(status) && StringUtils.hasText(triggerType)) {
            return workflowRepository.findByClientIdAndStatusAndTriggerType(clientId, status, triggerType, pageable);
        } else if (StringUtils.hasText(status)) {
            return workflowRepository.findByClientIdAndStatus(clientId, status, pageable);
        } else if (StringUtils.hasText(triggerType)) {
            return workflowRepository.findByClientIdAndTriggerType(clientId, triggerType, pageable);
        }
        return workflowRepository.findByClientId(clientId, pageable);
    }

    public WorkflowDefinition createWorkflow(String clientId, CreateWorkflowRequest request, String createdBy) {
        log.info("Creating workflow '{}' for clientId={}", request.getName(), clientId);

        // Plan enforcement — check workflow count
        String planHeader = TenantContext.getPlan();
        Client.Plan plan = Client.Plan.valueOf(planHeader != null ? planHeader : "FREE");
        PlanLimits limits = PlanLimits.forPlan(plan);
        long workflowCount = workflowRepository.countByClientId(clientId);
        if (PlanLimits.isExceeded(limits.getMaxWorkflows(), workflowCount)) {
            throw new PlanLimitExceededException(plan, "workflows", workflowCount, limits.getMaxWorkflows());
        }

        // Check name uniqueness for active version
        workflowRepository.findByClientIdAndNameAndActiveVersionTrue(clientId, request.getName())
                .ifPresent(existing -> {
                    throw new ResponseStatusException(HttpStatus.CONFLICT,
                            "An active workflow with name '" + request.getName() + "' already exists");
                });

        LocalDateTime now = LocalDateTime.now();
        WorkflowDefinition workflow = WorkflowDefinition.builder()
                .id(UUID.randomUUID().toString())
                .clientId(clientId)
                .name(request.getName())
                .displayName(request.getDisplayName())
                .description(request.getDescription())
                .version(1)
                .activeVersion(true)
                .status("DRAFT")
                .triggerType(request.getTriggerType())
                .cronExpression(request.getCronExpression())
                .kafkaTopic(request.getKafkaTopic())
                .inputSchema(request.getInputSchema())
                .variables(request.getVariables())
                .steps(request.getSteps() != null ? request.getSteps() : new ArrayList<>())
                .edges(request.getEdges() != null ? request.getEdges() : new ArrayList<>())
                .createdBy(createdBy)
                .createdAt(now)
                .updatedAt(now)
                .build();

        return workflowRepository.save(workflow);
    }

    public WorkflowDefinition getWorkflowById(String clientId, String id) {
        return workflowRepository.findById(id)
                .filter(w -> clientId.equals(w.getClientId()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Workflow not found: " + id));
    }

    public WorkflowDefinition updateWorkflow(String clientId, String id, UpdateWorkflowRequest request) {
        WorkflowDefinition existing = getWorkflowById(clientId, id);
        if (!"DRAFT".equals(existing.getStatus())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Only DRAFT workflows can be updated. Current status: " + existing.getStatus());
        }

        if (StringUtils.hasText(request.getDisplayName())) {
            existing.setDisplayName(request.getDisplayName());
        }
        if (request.getDescription() != null) {
            existing.setDescription(request.getDescription());
        }
        if (StringUtils.hasText(request.getTriggerType())) {
            existing.setTriggerType(request.getTriggerType());
        }
        if (request.getCronExpression() != null) {
            existing.setCronExpression(request.getCronExpression());
        }
        if (request.getKafkaTopic() != null) {
            existing.setKafkaTopic(request.getKafkaTopic());
        }
        if (request.getInputSchema() != null) {
            existing.setInputSchema(request.getInputSchema());
        }
        if (request.getVariables() != null) {
            existing.setVariables(request.getVariables());
        }
        if (request.getSteps() != null) {
            existing.setSteps(request.getSteps());
        }
        if (request.getEdges() != null) {
            existing.setEdges(request.getEdges());
        }
        // Schema model bindings
        if (request.getInputModelId() != null) {
            existing.setInputModelId(request.getInputModelId());
        }
        if (request.getDataSyncMode() != null) {
            existing.setDataSyncMode(request.getDataSyncMode());
        }
        existing.setUpdatedAt(LocalDateTime.now());

        return workflowRepository.save(existing);
    }

    public void deleteWorkflow(String clientId, String id) {
        WorkflowDefinition existing = getWorkflowById(clientId, id);
        log.info("Deleting workflow id={}, name={}, clientId={}", id, existing.getName(), clientId);
        workflowRepository.deleteById(id);
    }

    public WorkflowDefinition cloneWorkflow(String clientId, String id, String createdBy) {
        WorkflowDefinition source = getWorkflowById(clientId, id);
        log.info("Cloning workflow id={}, name={} for clientId={}", id, source.getName(), clientId);

        String clonedName = source.getName() + "-copy-" + System.currentTimeMillis();
        LocalDateTime now = LocalDateTime.now();

        WorkflowDefinition clone = WorkflowDefinition.builder()
                .id(UUID.randomUUID().toString())
                .clientId(clientId)
                .name(clonedName)
                .displayName(source.getDisplayName() + " (Copy)")
                .description(source.getDescription())
                .version(1)
                .activeVersion(true)
                .status("DRAFT")
                .triggerType(source.getTriggerType())
                .cronExpression(source.getCronExpression())
                .kafkaTopic(source.getKafkaTopic())
                .inputSchema(source.getInputSchema())
                .variables(source.getVariables())
                .steps(source.getSteps())
                .edges(source.getEdges())
                .createdBy(createdBy)
                .createdAt(now)
                .updatedAt(now)
                .build();

        return workflowRepository.save(clone);
    }

    public List<WorkflowDefinition> getVersionsByName(String clientId, String name) {
        return workflowRepository.findByClientIdAndName(clientId, name);
    }

    public WorkflowSummaryDto toSummary(WorkflowDefinition workflow) {
        return WorkflowSummaryDto.builder()
                .id(workflow.getId())
                .name(workflow.getName())
                .displayName(workflow.getDisplayName())
                .triggerType(workflow.getTriggerType())
                .version(workflow.getVersion())
                .status(workflow.getStatus())
                .stepCount(workflow.getSteps() != null ? workflow.getSteps().size() : 0)
                .publishedAt(workflow.getPublishedAt())
                .createdAt(workflow.getCreatedAt())
                .updatedAt(workflow.getUpdatedAt())
                .build();
    }
}
