package com.flowforge.workflow.service;

import com.flowforge.workflow.dto.ValidationResult;
import com.flowforge.workflow.model.EdgeDef;
import com.flowforge.workflow.model.StepDef;
import com.flowforge.workflow.model.WorkflowDefinition;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.util.CollectionUtils;
import org.springframework.util.StringUtils;

import java.util.*;

@Service
public class WorkflowValidationService {

    private static final Logger log = LoggerFactory.getLogger(WorkflowValidationService.class);

    private static final Set<String> VALID_TRIGGER_TYPES = Set.of("API", "WEBHOOK", "CRON", "KAFKA", "SNS");
    private static final Set<String> VALID_STEP_TYPES = Set.of("HTTP", "CONDITION", "LOOP", "DELAY", "SCRIPT", "NOTIFY", "SUB_WORKFLOW");
    private static final Set<String> VALID_RETRY_STRATEGIES = Set.of("FIXED", "EXPONENTIAL", "LINEAR");

    public ValidationResult validate(WorkflowDefinition workflow) {
        List<String> errors = new ArrayList<>();
        List<String> warnings = new ArrayList<>();

        validateBasicFields(workflow, errors);
        validateTrigger(workflow, errors);
        validateSteps(workflow, errors, warnings);
        validateEdges(workflow, errors);
        validateDag(workflow, errors);

        return ValidationResult.builder()
                .valid(errors.isEmpty())
                .errors(errors)
                .warnings(warnings)
                .build();
    }

    private void validateBasicFields(WorkflowDefinition workflow, List<String> errors) {
        if (!StringUtils.hasText(workflow.getName())) {
            errors.add("Workflow name is required");
        }
        if (!StringUtils.hasText(workflow.getDisplayName())) {
            errors.add("Workflow display name is required");
        }
        if (!StringUtils.hasText(workflow.getClientId())) {
            errors.add("Client ID is required");
        }
    }

    private void validateTrigger(WorkflowDefinition workflow, List<String> errors) {
        if (!StringUtils.hasText(workflow.getTriggerType())) {
            errors.add("Trigger type is required");
            return;
        }
        if (!VALID_TRIGGER_TYPES.contains(workflow.getTriggerType())) {
            errors.add("Invalid trigger type: " + workflow.getTriggerType() + ". Must be one of: " + VALID_TRIGGER_TYPES);
        }
        if ("CRON".equals(workflow.getTriggerType()) && !StringUtils.hasText(workflow.getCronExpression())) {
            errors.add("Cron expression is required for CRON trigger type");
        }
        if ("KAFKA".equals(workflow.getTriggerType()) && !StringUtils.hasText(workflow.getKafkaTopic())) {
            errors.add("Kafka topic is required for KAFKA trigger type");
        }
    }

    private void validateSteps(WorkflowDefinition workflow, List<String> errors, List<String> warnings) {
        if (CollectionUtils.isEmpty(workflow.getSteps())) {
            errors.add("Workflow must have at least one step");
            return;
        }

        Set<String> stepIds = new HashSet<>();
        for (StepDef step : workflow.getSteps()) {
            if (!StringUtils.hasText(step.getStepId())) {
                errors.add("Each step must have a stepId");
                continue;
            }
            if (stepIds.contains(step.getStepId())) {
                errors.add("Duplicate stepId found: " + step.getStepId());
            }
            stepIds.add(step.getStepId());

            if (!StringUtils.hasText(step.getName())) {
                errors.add("Step '" + step.getStepId() + "' must have a name");
            }
            if (!StringUtils.hasText(step.getType())) {
                errors.add("Step '" + step.getStepId() + "' must have a type");
            } else if (!VALID_STEP_TYPES.contains(step.getType())) {
                errors.add("Step '" + step.getStepId() + "' has invalid type: " + step.getType());
            }

            validateRetryPolicy(step, errors);
            validateStepTypeConfig(step, errors, warnings);
        }

        // Validate onSuccess/onFailure references
        for (StepDef step : workflow.getSteps()) {
            if (StringUtils.hasText(step.getOnSuccess()) && !stepIds.contains(step.getOnSuccess())) {
                errors.add("Step '" + step.getStepId() + "' onSuccess references unknown stepId: " + step.getOnSuccess());
            }
            if (StringUtils.hasText(step.getOnFailure()) && !stepIds.contains(step.getOnFailure())) {
                errors.add("Step '" + step.getStepId() + "' onFailure references unknown stepId: " + step.getOnFailure());
            }
        }
    }

    private void validateRetryPolicy(StepDef step, List<String> errors) {
        if (step.getRetryPolicy() == null) {
            return;
        }
        var rp = step.getRetryPolicy();
        if (rp.getMaxRetries() < 0) {
            errors.add("Step '" + step.getStepId() + "' retryPolicy.maxRetries cannot be negative");
        }
        if (StringUtils.hasText(rp.getStrategy()) && !VALID_RETRY_STRATEGIES.contains(rp.getStrategy())) {
            errors.add("Step '" + step.getStepId() + "' retryPolicy.strategy is invalid: " + rp.getStrategy());
        }
        if (rp.getInitialDelayMs() < 0) {
            errors.add("Step '" + step.getStepId() + "' retryPolicy.initialDelayMs cannot be negative");
        }
        if (rp.getMaxDelayMs() < rp.getInitialDelayMs()) {
            errors.add("Step '" + step.getStepId() + "' retryPolicy.maxDelayMs must be >= initialDelayMs");
        }
    }

    private void validateStepTypeConfig(StepDef step, List<String> errors, List<String> warnings) {
        if (step.getConfig() == null || step.getConfig().isEmpty()) {
            if ("HTTP".equals(step.getType())) {
                errors.add("Step '" + step.getStepId() + "' of type HTTP requires config with 'url' and 'method'");
            } else if ("DELAY".equals(step.getType())) {
                errors.add("Step '" + step.getStepId() + "' of type DELAY requires config with 'durationMs'");
            } else if ("CONDITION".equals(step.getType())) {
                errors.add("Step '" + step.getStepId() + "' of type CONDITION requires config with 'expression'");
            } else if ("SCRIPT".equals(step.getType())) {
                errors.add("Step '" + step.getStepId() + "' of type SCRIPT requires config with 'script'");
            } else if ("SUB_WORKFLOW".equals(step.getType())) {
                errors.add("Step '" + step.getStepId() + "' of type SUB_WORKFLOW requires config with 'workflowName'");
            }
            return;
        }
        if ("HTTP".equals(step.getType())) {
            if (!step.getConfig().containsKey("url")) {
                errors.add("Step '" + step.getStepId() + "' of type HTTP requires 'url' in config");
            }
            if (!step.getConfig().containsKey("method")) {
                errors.add("Step '" + step.getStepId() + "' of type HTTP requires 'method' in config");
            }
        }
        if ("DELAY".equals(step.getType()) && !step.getConfig().containsKey("durationMs")) {
            errors.add("Step '" + step.getStepId() + "' of type DELAY requires 'durationMs' in config");
        }
        if ("CONDITION".equals(step.getType()) && !step.getConfig().containsKey("expression")) {
            errors.add("Step '" + step.getStepId() + "' of type CONDITION requires 'expression' in config");
        }
        if ("SCRIPT".equals(step.getType()) && !step.getConfig().containsKey("script")) {
            errors.add("Step '" + step.getStepId() + "' of type SCRIPT requires 'script' in config");
        }
        if ("SUB_WORKFLOW".equals(step.getType()) && !step.getConfig().containsKey("workflowName")) {
            errors.add("Step '" + step.getStepId() + "' of type SUB_WORKFLOW requires 'workflowName' in config");
        }
        if ("LOOP".equals(step.getType()) && !step.getConfig().containsKey("collection")) {
            warnings.add("Step '" + step.getStepId() + "' of type LOOP: 'collection' not specified in config");
        }
    }

    private void validateEdges(WorkflowDefinition workflow, List<String> errors) {
        if (CollectionUtils.isEmpty(workflow.getEdges())) {
            return;
        }
        Set<String> stepIds = new HashSet<>();
        if (!CollectionUtils.isEmpty(workflow.getSteps())) {
            workflow.getSteps().forEach(s -> {
                if (s.getStepId() != null) stepIds.add(s.getStepId());
            });
        }
        Set<String> edgeIds = new HashSet<>();
        for (EdgeDef edge : workflow.getEdges()) {
            if (!StringUtils.hasText(edge.getId())) {
                errors.add("Each edge must have an id");
            } else if (edgeIds.contains(edge.getId())) {
                errors.add("Duplicate edge id: " + edge.getId());
            } else {
                edgeIds.add(edge.getId());
            }
            if (!StringUtils.hasText(edge.getSource())) {
                errors.add("Edge '" + edge.getId() + "' must have a source");
            } else if (!stepIds.contains(edge.getSource())) {
                errors.add("Edge '" + edge.getId() + "' source references unknown stepId: " + edge.getSource());
            }
            if (!StringUtils.hasText(edge.getTarget())) {
                errors.add("Edge '" + edge.getId() + "' must have a target");
            } else if (!stepIds.contains(edge.getTarget())) {
                errors.add("Edge '" + edge.getId() + "' target references unknown stepId: " + edge.getTarget());
            }
        }
    }

    /**
     * Validate there are no cycles in the DAG using DFS.
     */
    private void validateDag(WorkflowDefinition workflow, List<String> errors) {
        if (CollectionUtils.isEmpty(workflow.getSteps())) {
            return;
        }

        // Build adjacency list from both edges and onSuccess/onFailure links
        Map<String, List<String>> adjacency = new HashMap<>();
        for (StepDef step : workflow.getSteps()) {
            adjacency.put(step.getStepId(), new ArrayList<>());
        }
        for (StepDef step : workflow.getSteps()) {
            if (StringUtils.hasText(step.getOnSuccess()) && adjacency.containsKey(step.getOnSuccess())) {
                adjacency.get(step.getStepId()).add(step.getOnSuccess());
            }
            if (StringUtils.hasText(step.getOnFailure()) && adjacency.containsKey(step.getOnFailure())) {
                adjacency.get(step.getStepId()).add(step.getOnFailure());
            }
        }
        if (!CollectionUtils.isEmpty(workflow.getEdges())) {
            for (EdgeDef edge : workflow.getEdges()) {
                if (adjacency.containsKey(edge.getSource()) && adjacency.containsKey(edge.getTarget())) {
                    adjacency.get(edge.getSource()).add(edge.getTarget());
                }
            }
        }

        // DFS cycle detection
        Set<String> visited = new HashSet<>();
        Set<String> inStack = new HashSet<>();
        for (String stepId : adjacency.keySet()) {
            if (!visited.contains(stepId)) {
                if (hasCycle(stepId, adjacency, visited, inStack)) {
                    errors.add("Workflow DAG contains a cycle involving step: " + stepId);
                    return; // Report first cycle only
                }
            }
        }
    }

    private boolean hasCycle(String node, Map<String, List<String>> adjacency,
                              Set<String> visited, Set<String> inStack) {
        visited.add(node);
        inStack.add(node);
        List<String> neighbors = adjacency.getOrDefault(node, Collections.emptyList());
        for (String neighbor : neighbors) {
            if (!visited.contains(neighbor)) {
                if (hasCycle(neighbor, adjacency, visited, inStack)) {
                    return true;
                }
            } else if (inStack.contains(neighbor)) {
                return true;
            }
        }
        inStack.remove(node);
        return false;
    }
}
