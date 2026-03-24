package com.flowforge.execution.controller;

import com.flowforge.common.response.ApiResponse;
import com.flowforge.execution.dto.ExecutionDetailDto;
import com.flowforge.execution.dto.ExecutionTraceDto;
import com.flowforge.execution.dto.ReplayStepRequest;
import com.flowforge.execution.dto.ResumeWaitRequest;
import com.flowforge.execution.dto.TriggerExecutionRequest;
import com.flowforge.execution.engine.WorkflowOrchestrator;
import com.flowforge.execution.model.StepExecution;
import com.flowforge.execution.model.WaitToken;
import com.flowforge.execution.model.WorkflowDefinitionSnapshot;
import com.flowforge.execution.model.WorkflowExecution;
import com.flowforge.execution.repository.StepExecutionRepository;
import com.flowforge.execution.repository.WaitTokenRepository;
import com.flowforge.execution.repository.WorkflowExecutionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/v1")
public class ExecutionController {

    private static final Logger log = LoggerFactory.getLogger(ExecutionController.class);

    private final WorkflowOrchestrator orchestrator;
    private final WorkflowExecutionRepository executionRepository;
    private final StepExecutionRepository stepExecutionRepository;
    private final WaitTokenRepository waitTokenRepository;

    public ExecutionController(WorkflowOrchestrator orchestrator,
                                WorkflowExecutionRepository executionRepository,
                                StepExecutionRepository stepExecutionRepository,
                                WaitTokenRepository waitTokenRepository) {
        this.orchestrator = orchestrator;
        this.executionRepository = executionRepository;
        this.stepExecutionRepository = stepExecutionRepository;
        this.waitTokenRepository = waitTokenRepository;
    }

    /**
     * GET /api/v1/executions
     * List executions for the tenant, paginated, filterable by status and workflowId.
     */
    @GetMapping("/executions")
    public ResponseEntity<ApiResponse<Page<WorkflowExecution>>> listExecutions(
            @RequestHeader("X-Client-Id") String clientId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String workflowId,
            @RequestParam(required = false) String workflowName,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "startedAt") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir) {

        Sort sort = "asc".equalsIgnoreCase(sortDir)
                ? Sort.by(sortBy).ascending()
                : Sort.by(sortBy).descending();
        PageRequest pageable = PageRequest.of(page, size, sort);

        Page<WorkflowExecution> executions;
        if (StringUtils.hasText(workflowId)) {
            executions = executionRepository.findByClientIdAndWorkflowId(clientId, workflowId, pageable);
        } else if (StringUtils.hasText(workflowName)) {
            executions = executionRepository.findByClientIdAndWorkflowName(clientId, workflowName, pageable);
        } else if (StringUtils.hasText(status)) {
            executions = executionRepository.findByClientIdAndStatus(clientId, status, pageable);
        } else {
            executions = executionRepository.findByClientId(clientId, pageable);
        }

        return ResponseEntity.ok(ApiResponse.success(executions));
    }

    /**
     * POST /api/v1/workflows/{workflowId}/trigger
     * Trigger a workflow execution.
     */
    @PostMapping("/workflows/{workflowId}/trigger")
    public ResponseEntity<ApiResponse<WorkflowExecution>> triggerExecution(
            @RequestHeader("X-Client-Id") String clientId,
            @RequestHeader(value = "X-User-Id", defaultValue = "system") String userId,
            @PathVariable String workflowId,
            @RequestBody(required = false) TriggerExecutionRequest request) {

        log.info("Triggering workflow {} for clientId={} by user={}", workflowId, clientId, userId);

        String triggerType = (request != null && StringUtils.hasText(request.getTriggerType()))
                ? request.getTriggerType()
                : "API";

        java.util.Map<String, Object> input = (request != null && request.getInput() != null)
                ? request.getInput()
                : new java.util.HashMap<>();

        WorkflowExecution execution = orchestrator.startExecution(
                clientId, workflowId, input, userId, triggerType);

        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(execution));
    }

    /**
     * GET /api/v1/executions/{id}
     * Get execution detail including all step executions.
     */
    @GetMapping("/executions/{id}")
    public ResponseEntity<ApiResponse<ExecutionDetailDto>> getExecution(
            @RequestHeader("X-Client-Id") String clientId,
            @PathVariable String id) {

        WorkflowExecution execution = executionRepository.findById(id)
                .filter(e -> clientId.equals(e.getClientId()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Execution not found: " + id));

        List<StepExecution> stepExecutions = stepExecutionRepository.findByExecutionIdOrderByStartedAtAsc(id);

        ExecutionDetailDto detail = ExecutionDetailDto.builder()
                .execution(execution)
                .stepExecutions(stepExecutions)
                .build();

        return ResponseEntity.ok(ApiResponse.success(detail));
    }

    /**
     * POST /api/v1/executions/{id}/pause
     * Pause a running execution.
     */
    @PostMapping("/executions/{id}/pause")
    public ResponseEntity<ApiResponse<WorkflowExecution>> pauseExecution(
            @RequestHeader("X-Client-Id") String clientId,
            @PathVariable String id) {

        log.info("Pausing execution id={} for clientId={}", id, clientId);
        WorkflowExecution execution = orchestrator.pauseExecution(clientId, id);
        return ResponseEntity.ok(ApiResponse.success(execution));
    }

    /**
     * POST /api/v1/executions/{id}/resume
     * Resume a paused execution.
     */
    @PostMapping("/executions/{id}/resume")
    public ResponseEntity<ApiResponse<WorkflowExecution>> resumeExecution(
            @RequestHeader("X-Client-Id") String clientId,
            @PathVariable String id) {

        log.info("Resuming execution id={} for clientId={}", id, clientId);
        WorkflowExecution execution = orchestrator.resumeExecution(clientId, id);
        return ResponseEntity.ok(ApiResponse.success(execution));
    }

    /**
     * POST /api/v1/executions/{id}/retry
     * Retry a failed execution.
     */
    @PostMapping("/executions/{id}/retry")
    public ResponseEntity<ApiResponse<WorkflowExecution>> retryExecution(
            @RequestHeader("X-Client-Id") String clientId,
            @PathVariable String id) {

        log.info("Retrying execution id={} for clientId={}", id, clientId);
        WorkflowExecution newExecution = orchestrator.retryExecution(clientId, id);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(newExecution));
    }

    /**
     * POST /api/v1/executions/{id}/cancel
     * Cancel a running or paused execution.
     */
    @PostMapping("/executions/{id}/cancel")
    public ResponseEntity<ApiResponse<WorkflowExecution>> cancelExecution(
            @RequestHeader("X-Client-Id") String clientId,
            @PathVariable String id) {

        log.info("Cancelling execution id={} for clientId={}", id, clientId);
        WorkflowExecution execution = orchestrator.cancelExecution(clientId, id);
        return ResponseEntity.ok(ApiResponse.success(execution));
    }

    /**
     * GET /api/v1/executions/{id}/wait-tokens
     * List all wait tokens for an execution (active and historical).
     */
    @GetMapping("/executions/{id}/wait-tokens")
    public ResponseEntity<ApiResponse<List<WaitToken>>> getWaitTokens(
            @RequestHeader("X-Client-Id") String clientId,
            @PathVariable String id) {

        executionRepository.findById(id)
                .filter(e -> clientId.equals(e.getClientId()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Execution not found: " + id));

        List<WaitToken> tokens = waitTokenRepository.findByExecutionId(id);
        return ResponseEntity.ok(ApiResponse.success(tokens));
    }

    /**
     * POST /api/v1/executions/{id}/steps/{stepId}/resume
     * Resume a WAITING execution at a specific step, optionally providing data.
     */
    @PostMapping("/executions/{id}/steps/{stepId}/resume")
    public ResponseEntity<ApiResponse<WaitToken>> resumeWaitState(
            @RequestHeader("X-Client-Id") String clientId,
            @RequestHeader(value = "X-User-Id", defaultValue = "system") String userId,
            @PathVariable String id,
            @PathVariable String stepId,
            @RequestBody(required = false) ResumeWaitRequest request) {

        WaitToken token = waitTokenRepository.findByExecutionIdAndStepId(id, stepId)
                .filter(t -> "WAITING".equals(t.getStatus()) && clientId.equals(t.getClientId()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "No active wait state found for execution " + id + " step " + stepId));

        token.setStatus("RESUMED");
        token.setResumedAt(LocalDateTime.now());
        token.setResumedBy(request != null && request.getResumedBy() != null ? request.getResumedBy() : "MANUAL_API");
        token.setResumedByUserId(userId);
        if (request != null && request.getData() != null) {
            token.setResumeData(request.getData());
        }
        WaitToken saved = waitTokenRepository.save(token);
        log.info("Resumed wait state for execution {} step {} by user {}", id, stepId, userId);
        return ResponseEntity.ok(ApiResponse.success(saved));
    }

    /**
     * POST /api/v1/executions/resume-by-token/{token}
     * Resume a wait state using the opaque token (for external systems / Kafka).
     */
    @PostMapping("/executions/resume-by-token/{token}")
    public ResponseEntity<ApiResponse<WaitToken>> resumeByToken(
            @RequestHeader("X-Client-Id") String clientId,
            @PathVariable String token,
            @RequestBody(required = false) ResumeWaitRequest request) {

        WaitToken waitToken = waitTokenRepository.findByToken(token)
                .filter(t -> "WAITING".equals(t.getStatus()) && clientId.equals(t.getClientId()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "No active wait state found for token " + token));

        waitToken.setStatus("RESUMED");
        waitToken.setResumedAt(LocalDateTime.now());
        waitToken.setResumedBy(request != null && request.getResumedBy() != null ? request.getResumedBy() : "MANUAL_API");
        if (request != null && request.getData() != null) {
            waitToken.setResumeData(request.getData());
        }
        WaitToken saved = waitTokenRepository.save(waitToken);
        return ResponseEntity.ok(ApiResponse.success(saved));
    }

    /**
     * POST /api/v1/executions/replay-step
     * DLQ Replay — re-execute a specific failed step within its original execution
     * and continue downstream steps on success.
     *
     * <p>Called by the integration-service {@code DlqReplayService} when a user
     * triggers a replay from the Dead Letter Queue console. The request carries the
     * exact execution context that was captured at the point of failure so the step
     * is replayed with identical inputs.
     *
     * <p>On success the engine resumes normal routing (onSuccess edges), so the
     * remainder of the workflow continues automatically. On failure the step is
     * dead-lettered again and the DLQ message status returns to PENDING.
     */
    @PostMapping("/executions/replay-step")
    public ResponseEntity<ApiResponse<WorkflowExecution>> replayStep(
            @RequestHeader("X-Client-Id") String clientId,
            @RequestHeader(value = "X-User-Id", defaultValue = "system") String userId,
            @RequestBody ReplayStepRequest request) {

        log.info("DLQ replay-step: executionId={} stepId={} dlqMessageId={} clientId={}",
                request.getExecutionId(), request.getStepId(), request.getDlqMessageId(), clientId);

        if (request.getExecutionId() == null || request.getStepId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "executionId and stepId are required for replay-step");
        }

        WorkflowExecution execution = orchestrator.replayStep(
                clientId,
                request.getExecutionId(),
                request.getStepId(),
                request.getExecutionContext());

        return ResponseEntity.ok(ApiResponse.success(execution));
    }

    /**
     * GET /api/v1/executions/{id}/trace
     * Returns the full execution trace including workflow DAG definition,
     * all step executions with input/output and HTTP call logs, and stats.
     */
    @GetMapping("/executions/{id}/trace")
    public ResponseEntity<ApiResponse<ExecutionTraceDto>> getExecutionTrace(
            @RequestHeader("X-Client-Id") String clientId,
            @PathVariable String id) {

        WorkflowExecution execution = executionRepository.findById(id)
                .filter(e -> clientId.equals(e.getClientId()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Execution not found: " + id));

        List<StepExecution> steps = stepExecutionRepository.findByExecutionIdOrderByStartedAtAsc(id);

        // Build stats
        ExecutionTraceDto.ExecutionStats stats = new ExecutionTraceDto.ExecutionStats();
        stats.setTotalSteps(steps.size());
        stats.setSuccessSteps((int) steps.stream().filter(s -> "SUCCESS".equals(s.getStatus())).count());
        stats.setFailedSteps((int) steps.stream().filter(s -> "FAILED".equals(s.getStatus())).count());
        stats.setSkippedSteps((int) steps.stream().filter(s -> "SKIPPED".equals(s.getStatus())).count());
        stats.setPendingSteps((int) steps.stream().filter(s -> "PENDING".equals(s.getStatus())).count());
        stats.setWaitingSteps((int) steps.stream().filter(s -> "WAITING".equals(s.getStatus())).count());
        stats.setTotalDurationMs(steps.stream().mapToLong(s -> s.getDurationMs()).sum());
        stats.setTotalHttpCalls((int) steps.stream().filter(s -> s.getHttpCallLog() != null).count());
        stats.setFailedHttpCalls((int) steps.stream()
                .filter(s -> s.getHttpCallLog() != null && !s.getHttpCallLog().isSuccess()).count());

        // Get the workflow definition snapshot stored at execution start time
        WorkflowDefinitionSnapshot snapshot = execution.getWorkflowDefinition();

        ExecutionTraceDto trace = ExecutionTraceDto.builder()
                .execution(execution)
                .stepExecutions(steps)
                .workflowDefinition(snapshot)
                .executionContext(execution.getExecutionContext())
                .stats(stats)
                .build();

        return ResponseEntity.ok(ApiResponse.success(trace));
    }
}
