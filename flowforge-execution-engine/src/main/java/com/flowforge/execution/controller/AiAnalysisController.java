package com.flowforge.execution.controller;

import com.flowforge.common.response.ApiResponse;
import com.flowforge.execution.dto.AiAnalysisResult;
import com.flowforge.execution.model.StepExecution;
import com.flowforge.execution.model.WorkflowExecution;
import com.flowforge.execution.repository.StepExecutionRepository;
import com.flowforge.execution.repository.WorkflowExecutionRepository;
import com.flowforge.execution.service.AiAnalysisService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

/**
 * AiAnalysisController
 *
 * Provides AI-powered failure analysis for workflow executions.
 *
 * POST /api/v1/executions/{id}/analyze
 *   — Accepts only FAILED executions
 *   — Calls Claude via AiAnalysisService with the full execution trace
 *   — Returns { summary, rootCause, suggestions[] }
 */
@RestController
@RequestMapping("/api/v1")
@CrossOrigin(origins = "*")
public class AiAnalysisController {

    private static final Logger log = LoggerFactory.getLogger(AiAnalysisController.class);

    private final WorkflowExecutionRepository executionRepository;
    private final StepExecutionRepository stepExecutionRepository;
    private final AiAnalysisService aiAnalysisService;

    public AiAnalysisController(WorkflowExecutionRepository executionRepository,
                                 StepExecutionRepository stepExecutionRepository,
                                 AiAnalysisService aiAnalysisService) {
        this.executionRepository = executionRepository;
        this.stepExecutionRepository = stepExecutionRepository;
        this.aiAnalysisService = aiAnalysisService;
    }

    /**
     * POST /api/v1/executions/{id}/analyze
     *
     * Analyze a FAILED execution using Claude AI.
     * Returns a structured diagnosis with summary, root cause, and fix suggestions.
     *
     * @param clientId  Tenant ID from X-Client-Id header
     * @param id        Execution ID to analyze
     */
    @PostMapping("/executions/{id}/analyze")
    public ResponseEntity<ApiResponse<AiAnalysisResult>> analyzeExecution(
            @RequestHeader("X-Client-Id") String clientId,
            @PathVariable String id) {

        log.info("AI analysis requested for execution {} (client: {})", id, clientId);

        // ── Load and validate execution ────────────────────────────────────────
        WorkflowExecution execution = executionRepository.findById(id)
                .filter(e -> clientId.equals(e.getClientId()))
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Execution not found: " + id));

        if (!"FAILED".equals(execution.getStatus())) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "AI analysis is only available for FAILED executions. " +
                    "Current status: " + execution.getStatus());
        }

        // ── Load step executions ───────────────────────────────────────────────
        List<StepExecution> stepExecutions =
                stepExecutionRepository.findByExecutionIdOrderByStartedAtAsc(id);

        // ── Delegate to AI service ─────────────────────────────────────────────
        try {
            AiAnalysisResult result = aiAnalysisService.analyzeExecution(execution, stepExecutions);
            return ResponseEntity.ok(ApiResponse.success(result));
        } catch (Exception e) {
            log.error("AI analysis failed for execution {}: {}", id, e.getMessage(), e);
            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "AI analysis failed: " + e.getMessage());
        }
    }
}
