package com.flowforge.execution.engine;

import com.flowforge.execution.executor.StepExecutor;
import com.flowforge.execution.executor.SubWorkflowExecutor;
import com.flowforge.execution.kafka.ExecutionEventPublisher;
import com.flowforge.execution.model.StepDef;
import com.flowforge.execution.model.StepExecution;
import com.flowforge.execution.model.WorkflowDefinitionSnapshot;
import com.flowforge.execution.model.WorkflowExecution;
import com.flowforge.execution.repository.StepExecutionRepository;
import com.flowforge.execution.repository.WorkflowExecutionRepository;
import com.flowforge.execution.service.SchemaValidationService;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Component
public class WorkflowOrchestrator {

    private static final Logger log = LoggerFactory.getLogger(WorkflowOrchestrator.class);

    private final WorkflowExecutionRepository executionRepository;
    private final StepExecutionRepository stepExecutionRepository;
    private final ExecutionEventPublisher eventPublisher;
    private final List<StepExecutor> stepExecutors;
    private final WorkflowDefinitionLoader definitionLoader;
    private final SchemaValidationService schemaValidationService;

    private Map<String, StepExecutor> executorMap;

    public WorkflowOrchestrator(WorkflowExecutionRepository executionRepository,
                                 StepExecutionRepository stepExecutionRepository,
                                 ExecutionEventPublisher eventPublisher,
                                 List<StepExecutor> stepExecutors,
                                 WorkflowDefinitionLoader definitionLoader,
                                 SchemaValidationService schemaValidationService) {
        this.executionRepository = executionRepository;
        this.stepExecutionRepository = stepExecutionRepository;
        this.eventPublisher = eventPublisher;
        this.stepExecutors = stepExecutors;
        this.definitionLoader = definitionLoader;
        this.schemaValidationService = schemaValidationService;
    }

    @PostConstruct
    public void init() {
        executorMap = stepExecutors.stream()
                .collect(Collectors.toMap(StepExecutor::getType, Function.identity()));
        log.info("Registered step executors: {}", executorMap.keySet());

        // Wire back-reference for SubWorkflowExecutor
        stepExecutors.stream()
                .filter(e -> e instanceof SubWorkflowExecutor)
                .map(e -> (SubWorkflowExecutor) e)
                .findFirst()
                .ifPresent(e -> e.setOrchestrator(this));
    }

    /**
     * Start execution by workflow ID.
     */
    public WorkflowExecution startExecution(String clientId, String workflowId,
                                             Map<String, Object> input,
                                             String triggeredBy, String triggerType) {
        WorkflowDefinitionSnapshot definition = definitionLoader.loadById(clientId, workflowId);
        return executeWorkflow(clientId, definition, input, triggeredBy, triggerType);
    }

    /**
     * Start execution by workflow name (active version).
     */
    public WorkflowExecution startExecutionByName(String clientId, String workflowName,
                                                   Map<String, Object> input,
                                                   String triggeredBy, String triggerType) {
        WorkflowDefinitionSnapshot definition = definitionLoader.loadByName(clientId, workflowName);
        return executeWorkflow(clientId, definition, input, triggeredBy, triggerType);
    }

    private WorkflowExecution executeWorkflow(String clientId, WorkflowDefinitionSnapshot definition,
                                               Map<String, Object> input, String triggeredBy, String triggerType) {
        if (definition.getSteps() == null || definition.getSteps().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Workflow '" + definition.getName() + "' has no steps to execute");
        }

        // ── Input schema validation ──────────────────────────────────────────
        String inputSchemaJson = definition.getResolvedInputSchemaJson();
        if (inputSchemaJson != null && !inputSchemaJson.isBlank()) {
            List<String> validationErrors = schemaValidationService.validate(
                    inputSchemaJson, input != null ? input : new HashMap<>());

            if (!validationErrors.isEmpty()) {
                log.warn("Input validation failed for workflow '{}': {}", definition.getName(), validationErrors);

                // Determine behaviour from errorHandlingConfig
                Map<String, Object> ehc = definition.getErrorHandlingConfig();
                String mode = ehc != null ? (String) ehc.getOrDefault("mode", "FAIL_FAST") : "FAIL_FAST";

                if ("CUSTOM_RESPONSE".equals(mode)) {
                    // Build a synthetic failed execution record so the caller can inspect errors
                    int statusCode = ehc.containsKey("customStatusCode")
                            ? ((Number) ehc.get("customStatusCode")).intValue() : 422;
                    throw new ResponseStatusException(HttpStatus.valueOf(statusCode),
                            "Input validation failed: " + String.join("; ", validationErrors));
                }
                // FAIL_FAST (default) or CONTINUE both reject invalid input at the gate
                throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY,
                        "Input validation failed: " + String.join("; ", validationErrors));
            }
        }

        // Initialize execution record, storing the workflow definition snapshot for trace queries
        LocalDateTime now = LocalDateTime.now();
        WorkflowExecution execution = WorkflowExecution.builder()
                .id(UUID.randomUUID().toString())
                .clientId(clientId)
                .workflowId(definition.getId())
                .workflowName(definition.getName())
                .workflowVersion(definition.getVersion())
                .status("RUNNING")
                .triggerType(triggerType)
                .triggeredBy(triggeredBy)
                .input(input != null ? input : new HashMap<>())
                .variables(definition.getVariables() != null
                        ? definition.getVariables().entrySet().stream()
                            .collect(Collectors.toMap(Map.Entry::getKey, e -> (Object) e.getValue(),
                                (a, b) -> b, HashMap::new))
                        : new HashMap<String, Object>())
                .stepOutputs(new HashMap<>())
                .completedSteps(new ArrayList<>())
                .startedAt(now)
                .workflowDefinition(definition)
                .build();

        execution = executionRepository.save(execution);
        log.info("Started workflow execution id={} workflow='{}' clientId={}",
                execution.getId(), definition.getName(), clientId);

        eventPublisher.publishExecutionStarted(execution.getId(), clientId, definition.getName());

        // Build execution context
        ExecutionContext context = ExecutionContext.builder()
                .clientId(clientId)
                .executionId(execution.getId())
                .workflowId(definition.getId())
                .workflowName(definition.getName())
                .input(execution.getInput())
                .variables(execution.getVariables() != null
                        ? new HashMap<>(execution.getVariables())
                        : new HashMap<>())
                .stepOutputs(execution.getStepOutputs())
                .envVars(new HashMap<>())
                .build();

        // Find the first step (first in the list)
        StepDef firstStep = definition.getSteps().get(0);

        // Execute steps sequentially
        try {
            executeStepsFrom(execution, firstStep, definition.getSteps(), context);
        } catch (Exception e) {
            log.error("Unexpected error during workflow execution id={}: {}", execution.getId(), e.getMessage(), e);
            execution = executionRepository.findById(execution.getId()).orElse(execution);
            if (!"FAILED".equals(execution.getStatus()) && !"CANCELLED".equals(execution.getStatus())) {
                finalizeExecution(execution, "FAILED", e.getMessage(), context);
            }
        }

        // Reload final state
        return executionRepository.findById(execution.getId()).orElse(execution);
    }

    private void executeStepsFrom(WorkflowExecution execution, StepDef startStep,
                                   List<StepDef> allSteps, ExecutionContext context) {
        Map<String, StepDef> stepMap = allSteps.stream()
                .collect(Collectors.toMap(StepDef::getStepId, Function.identity()));

        StepDef currentStep = startStep;
        while (currentStep != null) {
            // Reload execution to check for pause/cancel
            WorkflowExecution current = executionRepository.findById(execution.getId())
                    .orElseThrow(() -> new RuntimeException("Execution not found: " + execution.getId()));

            if ("PAUSED".equals(current.getStatus())) {
                log.info("Execution {} is PAUSED, stopping step loop", execution.getId());
                return;
            }
            if ("CANCELLED".equals(current.getStatus())) {
                log.info("Execution {} is CANCELLED, stopping step loop", execution.getId());
                return;
            }

            // Update current step tracker
            current.setCurrentStepId(currentStep.getStepId());
            executionRepository.save(current);

            StepExecutionResult result = executeStep(execution.getId(), current.getClientId(), currentStep, context);

            // Update context with step output
            if (result.getOutput() != null) {
                context.getStepOutputs().put(currentStep.getStepId(), result.getOutput());
            }

            // Update execution step outputs in DB
            WorkflowExecution freshExecution = executionRepository.findById(execution.getId()).orElse(current);
            if (freshExecution.getStepOutputs() == null) {
                freshExecution.setStepOutputs(new HashMap<>());
            }
            if (result.getOutput() != null) {
                freshExecution.getStepOutputs().put(currentStep.getStepId(), result.getOutput());
            }
            if (freshExecution.getCompletedSteps() == null) {
                freshExecution.setCompletedSteps(new ArrayList<>());
            }
            freshExecution.getCompletedSteps().add(currentStep.getStepId());
            executionRepository.save(freshExecution);

            if (result.isSuccess()) {
                // Route to onSuccess or end
                String nextStepId = currentStep.getOnSuccess();
                if (nextStepId != null && stepMap.containsKey(nextStepId)) {
                    currentStep = stepMap.get(nextStepId);
                } else {
                    // No more steps - workflow complete
                    finalizeExecution(freshExecution, "SUCCESS", null, context);
                    return;
                }
            } else {
                // Route to onFailure or fail
                String failureStepId = currentStep.getOnFailure();
                if (failureStepId != null && stepMap.containsKey(failureStepId)) {
                    currentStep = stepMap.get(failureStepId);
                } else {
                    finalizeExecution(freshExecution, "FAILED", result.getErrorMessage(), context);
                    return;
                }
            }
        }
    }

    private StepExecutionResult executeStep(String executionId, String clientId,
                                             StepDef step, ExecutionContext context) {
        log.info("Executing step '{}' type={} in execution={}", step.getStepId(), step.getType(), executionId);

        StepExecution stepExecution = StepExecution.builder()
                .id(UUID.randomUUID().toString())
                .executionId(executionId)
                .clientId(clientId)
                .stepId(step.getStepId())
                .stepName(step.getName())
                .stepType(step.getType())
                .status("RUNNING")
                .attemptNumber(1)
                .input(context.getInput())
                .startedAt(LocalDateTime.now())
                .build();
        stepExecutionRepository.save(stepExecution);

        eventPublisher.publishStepStarted(executionId, step.getStepId(), step.getName());

        StepExecutor executor = executorMap.get(step.getType());
        if (executor == null) {
            log.error("No executor found for step type: {}", step.getType());
            StepExecutionResult result = StepExecutionResult.builder()
                    .success(false)
                    .errorMessage("No executor for step type: " + step.getType())
                    .build();
            finalizeStepExecution(stepExecution, result);
            return result;
        }

        StepExecutionResult result;
        int attempt = 1;
        int maxRetries = step.getRetryPolicy() != null ? step.getRetryPolicy().getMaxRetries() : 0;

        do {
            try {
                result = executor.execute(step, context);
            } catch (Exception e) {
                log.error("Step '{}' threw unexpected exception on attempt {}: {}",
                        step.getStepId(), attempt, e.getMessage(), e);
                result = StepExecutionResult.builder()
                        .success(false)
                        .errorMessage("Step threw exception: " + e.getMessage())
                        .build();
            }

            if (result.isSuccess()) {
                break;
            }

            if (attempt <= maxRetries) {
                log.warn("Step '{}' failed on attempt {}/{}, retrying...",
                        step.getStepId(), attempt, maxRetries + 1);
                updateStepExecutionRetrying(stepExecution, attempt);
                applyRetryDelay(step, attempt);
                attempt++;
            } else {
                break;
            }
        } while (attempt <= maxRetries + 1);

        stepExecution.setAttemptNumber(attempt);
        stepExecution.setTotalAttempts(attempt);

        // Copy HTTP call log and resolved config from result into StepExecution before persisting
        if (result.getHttpCallLog() != null) {
            stepExecution.setHttpCallLog(result.getHttpCallLog());
        }
        if (result.getResolvedConfig() != null) {
            stepExecution.setResolvedConfig(result.getResolvedConfig());
        }

        finalizeStepExecution(stepExecution, result);

        // Handle DLQ if all retries exhausted and still failed
        if (!result.isSuccess() && attempt > maxRetries + 1) {
            String dlqMessageId = UUID.randomUUID().toString();
            eventPublisher.publishStepDeadLettered(executionId, step.getStepId(), dlqMessageId);
            log.error("Step '{}' dead-lettered after {} attempts. DLQ ID: {}",
                    step.getStepId(), attempt - 1, dlqMessageId);
        }

        eventPublisher.publishStepCompleted(executionId, step.getStepId(),
                result.isSuccess() ? "SUCCESS" : "FAILED", result.getOutput());

        return result;
    }

    private void finalizeStepExecution(StepExecution stepExecution, StepExecutionResult result) {
        LocalDateTime completedAt = LocalDateTime.now();
        stepExecution.setStatus(result.isSuccess() ? "SUCCESS" : "FAILED");
        stepExecution.setOutput(result.getOutput());
        stepExecution.setErrorMessage(result.getErrorMessage());
        stepExecution.setCompletedAt(completedAt);
        if (stepExecution.getStartedAt() != null) {
            long duration = java.time.Duration.between(stepExecution.getStartedAt(), completedAt).toMillis();
            stepExecution.setDurationMs(duration);
        }
        stepExecutionRepository.save(stepExecution);
    }

    private void updateStepExecutionRetrying(StepExecution stepExecution, int attempt) {
        stepExecution.setStatus("RETRYING");
        stepExecution.setAttemptNumber(attempt);
        stepExecutionRepository.save(stepExecution);
    }

    private void applyRetryDelay(StepDef step, int attempt) {
        if (step.getRetryPolicy() == null) return;
        var policy = step.getRetryPolicy();
        long delay = switch (policy.getStrategy() != null ? policy.getStrategy() : "FIXED") {
            case "EXPONENTIAL" -> Math.min(
                    (long) (policy.getInitialDelayMs() * Math.pow(2, attempt - 1)),
                    policy.getMaxDelayMs() > 0 ? policy.getMaxDelayMs() : Long.MAX_VALUE
            );
            case "LINEAR" -> Math.min(
                    policy.getInitialDelayMs() * attempt,
                    policy.getMaxDelayMs() > 0 ? policy.getMaxDelayMs() : Long.MAX_VALUE
            );
            default -> policy.getInitialDelayMs(); // FIXED
        };

        if (delay > 0) {
            try {
                Thread.sleep(delay);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        }
    }

    private void finalizeExecution(WorkflowExecution execution, String status, String errorMessage,
                                    ExecutionContext context) {
        LocalDateTime completedAt = LocalDateTime.now();
        execution.setStatus(status);
        execution.setErrorMessage(errorMessage);
        execution.setCompletedAt(completedAt);
        if (execution.getStartedAt() != null) {
            execution.setDurationMs(
                    java.time.Duration.between(execution.getStartedAt(), completedAt).toMillis());
        }

        if (context != null) {
            Map<String, Object> finalContext = new HashMap<>();
            if (context.getInput() != null) finalContext.put("input", context.getInput());
            if (context.getVariables() != null) finalContext.put("variables", context.getVariables());
            if (context.getStepOutputs() != null) finalContext.put("stepOutputs", context.getStepOutputs());

            // ── Apply output mapping when workflow succeeds ──────────────────
            if ("SUCCESS".equals(status)) {
                WorkflowDefinitionSnapshot def = execution.getWorkflowDefinition();
                if (def != null && def.getOutputMapping() != null && !def.getOutputMapping().isEmpty()) {
                    Map<String, Object> mappedOutput = schemaValidationService.applyOutputMapping(
                            def.getOutputMapping(), context.getStepOutputs() != null
                                    ? context.getStepOutputs() : new HashMap<>());
                    finalContext.put("output", mappedOutput);
                    execution.setOutput(mappedOutput);
                }
            }

            execution.setExecutionContext(finalContext);
        }

        executionRepository.save(execution);
        eventPublisher.publishExecutionCompleted(execution.getId(), status);
        log.info("Workflow execution id={} completed with status={}", execution.getId(), status);
    }

    public WorkflowExecution pauseExecution(String clientId, String executionId) {
        WorkflowExecution execution = getExecution(clientId, executionId);
        if (!"RUNNING".equals(execution.getStatus())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Can only pause RUNNING executions. Current status: " + execution.getStatus());
        }
        execution.setStatus("PAUSED");
        return executionRepository.save(execution);
    }

    public WorkflowExecution resumeExecution(String clientId, String executionId) {
        WorkflowExecution execution = getExecution(clientId, executionId);
        if (!"PAUSED".equals(execution.getStatus())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Can only resume PAUSED executions. Current status: " + execution.getStatus());
        }
        execution.setStatus("RUNNING");
        executionRepository.save(execution);
        log.info("Resuming execution id={} from step={}", executionId, execution.getCurrentStepId());

        // Resume from current step asynchronously (fire and forget for now)
        // In production this would be picked up by a scheduler or async executor
        WorkflowDefinitionSnapshot definition;
        try {
            definition = definitionLoader.loadById(clientId, execution.getWorkflowId());
        } catch (Exception e) {
            log.error("Failed to load workflow definition for resume: {}", e.getMessage());
            execution.setStatus("FAILED");
            execution.setErrorMessage("Failed to resume: " + e.getMessage());
            return executionRepository.save(execution);
        }

        ExecutionContext context = ExecutionContext.builder()
                .clientId(clientId)
                .executionId(executionId)
                .input(execution.getInput())
                .variables(execution.getVariables() != null
                        ? new HashMap<>(execution.getVariables())
                        : new HashMap<>())
                .stepOutputs(execution.getStepOutputs() != null ? execution.getStepOutputs() : new HashMap<>())
                .envVars(new HashMap<>())
                .build();

        String resumeStepId = execution.getCurrentStepId();
        Optional<StepDef> resumeStep = definition.getSteps().stream()
                .filter(s -> s.getStepId().equals(resumeStepId))
                .findFirst();

        resumeStep.ifPresent(step ->
                executeStepsFrom(execution, step, definition.getSteps(), context));

        return executionRepository.findById(executionId).orElse(execution);
    }

    public WorkflowExecution cancelExecution(String clientId, String executionId) {
        WorkflowExecution execution = getExecution(clientId, executionId);
        if ("SUCCESS".equals(execution.getStatus()) || "FAILED".equals(execution.getStatus())
                || "CANCELLED".equals(execution.getStatus())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Cannot cancel a completed/cancelled execution. Status: " + execution.getStatus());
        }
        execution.setStatus("CANCELLED");
        execution.setCompletedAt(LocalDateTime.now());
        if (execution.getStartedAt() != null) {
            execution.setDurationMs(
                    java.time.Duration.between(execution.getStartedAt(), execution.getCompletedAt()).toMillis());
        }
        executionRepository.save(execution);
        eventPublisher.publishExecutionCompleted(executionId, "CANCELLED");
        log.info("Cancelled execution id={}", executionId);
        return execution;
    }

    public WorkflowExecution retryExecution(String clientId, String executionId) {
        WorkflowExecution failedExecution = getExecution(clientId, executionId);
        if (!"FAILED".equals(failedExecution.getStatus())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Can only retry FAILED executions. Current status: " + failedExecution.getStatus());
        }
        log.info("Retrying failed execution id={}", executionId);
        return startExecution(
                clientId,
                failedExecution.getWorkflowId(),
                failedExecution.getInput(),
                failedExecution.getTriggeredBy() + ":retry",
                failedExecution.getTriggerType()
        );
    }

    private WorkflowExecution getExecution(String clientId, String executionId) {
        return executionRepository.findById(executionId)
                .filter(e -> clientId.equals(e.getClientId()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Execution not found: " + executionId));
    }
}
