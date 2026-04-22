package com.flowforge.workflow.controller;

import com.flowforge.workflow.dto.GenerateDocResponse;
import com.flowforge.workflow.dto.UpdateDocRequest;
import com.flowforge.workflow.model.WorkflowDoc;
import com.flowforge.workflow.service.WorkflowDocService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/v1/workflows/{workflowId}/docs")
public class WorkflowDocController {

    private static final Logger log = LoggerFactory.getLogger(WorkflowDocController.class);

    private final WorkflowDocService docService;

    public WorkflowDocController(WorkflowDocService docService) {
        this.docService = docService;
    }

    @PostMapping("/generate")
    public ResponseEntity<GenerateDocResponse> generate(@PathVariable String workflowId) {
        log.info("Generating documentation for workflowId={}", workflowId);
        GenerateDocResponse response = docService.generate(workflowId);
        return ResponseEntity.ok(response);
    }

    @GetMapping("")
    public ResponseEntity<WorkflowDoc> get(@PathVariable String workflowId) {
        WorkflowDoc doc = docService.get(workflowId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "No documentation found for workflowId: " + workflowId));
        return ResponseEntity.ok(doc);
    }

    @PutMapping("")
    public ResponseEntity<WorkflowDoc> update(@PathVariable String workflowId,
                                               @RequestBody UpdateDocRequest req,
                                               @RequestHeader(value = "X-User-Id", defaultValue = "system") String userId) {
        log.info("Updating documentation for workflowId={} by userId={}", workflowId, userId);
        WorkflowDoc updated = docService.update(workflowId, req.getMarkdown(), userId);
        return ResponseEntity.ok(updated);
    }
}
