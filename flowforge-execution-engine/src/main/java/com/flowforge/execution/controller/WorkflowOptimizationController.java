package com.flowforge.execution.controller;

import com.flowforge.common.response.ApiResponse;
import com.flowforge.execution.dto.OptimizationResult;
import com.flowforge.execution.service.WorkflowOptimizationService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1")
@CrossOrigin(origins = "*")
public class WorkflowOptimizationController {

    private static final Logger log = LoggerFactory.getLogger(WorkflowOptimizationController.class);

    private final WorkflowOptimizationService optimizationService;

    public WorkflowOptimizationController(WorkflowOptimizationService optimizationService) {
        this.optimizationService = optimizationService;
    }

    @PostMapping("/workflows/{workflowId}/optimize")
    public ResponseEntity<ApiResponse<OptimizationResult>> optimize(@PathVariable String workflowId) {
        log.info("Workflow optimization requested for workflowId={}", workflowId);
        OptimizationResult result = optimizationService.optimize(workflowId);
        return ResponseEntity.ok(ApiResponse.success(result));
    }
}
