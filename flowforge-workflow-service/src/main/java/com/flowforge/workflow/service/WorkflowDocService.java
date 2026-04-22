package com.flowforge.workflow.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.flowforge.common.exception.ResourceNotFoundException;
import com.flowforge.workflow.client.ClaudeClient;
import com.flowforge.workflow.config.TenantContext;
import com.flowforge.workflow.dto.GenerateDocResponse;
import com.flowforge.workflow.model.DataModel;
import com.flowforge.workflow.model.WorkflowDefinition;
import com.flowforge.workflow.model.WorkflowDoc;
import com.flowforge.workflow.repository.DataModelRepository;
import com.flowforge.workflow.repository.WorkflowDefinitionRepository;
import com.flowforge.workflow.repository.WorkflowDocRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
public class WorkflowDocService {

    private static final Logger log = LoggerFactory.getLogger(WorkflowDocService.class);

    private static final String MODEL = "claude-haiku-4-5-20251001";
    private static final int MAX_TOKENS = 2048;
    private static final double TEMPERATURE = 0.4;

    private static final String SYSTEM_PROMPT =
            "You are a technical writer documenting workflows in FlowForge. " +
            "Produce clean, human-readable markdown. Use headings (##), bullet lists, " +
            "and code blocks for configuration snippets. " +
            "Target audience: mixed technical + business stakeholders.";

    private final WorkflowDocRepository docRepository;
    private final WorkflowDefinitionRepository workflowRepository;
    private final DataModelRepository dataModelRepository;
    private final ClaudeClient claudeClient;
    private final ObjectMapper objectMapper;

    public WorkflowDocService(WorkflowDocRepository docRepository,
                               WorkflowDefinitionRepository workflowRepository,
                               DataModelRepository dataModelRepository,
                               ClaudeClient claudeClient,
                               ObjectMapper objectMapper) {
        this.docRepository = docRepository;
        this.workflowRepository = workflowRepository;
        this.dataModelRepository = dataModelRepository;
        this.claudeClient = claudeClient;
        this.objectMapper = objectMapper;
    }

    public GenerateDocResponse generate(String workflowId) {
        String clientId = TenantContext.getClientId();
        String namespace = TenantContext.getNamespace();

        WorkflowDefinition workflow = workflowRepository.findById(workflowId)
                .filter(w -> clientId.equals(w.getClientId()) && namespace.equals(w.getNamespace()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Workflow not found: " + workflowId));

        String inputModelName = null;
        if (workflow.getInputModelId() != null) {
            Optional<DataModel> model = dataModelRepository.findByClientIdAndNamespaceAndId(
                    clientId, namespace, workflow.getInputModelId());
            inputModelName = model.map(DataModel::getName).orElse(null);
        }

        String userPrompt = buildPrompt(workflow, inputModelName);
        log.info("Generating docs for workflow id={} (clientId={}, namespace={})", workflowId, clientId, namespace);

        String markdown = claudeClient.call(SYSTEM_PROMPT, userPrompt, MODEL, MAX_TOKENS, TEMPERATURE);

        Optional<WorkflowDoc> existing = docRepository
                .findByClientIdAndNamespaceAndWorkflowId(clientId, namespace, workflowId);

        Instant now = Instant.now();
        WorkflowDoc doc;
        boolean regenerated = existing.isPresent();

        if (existing.isPresent()) {
            doc = existing.get();
            doc.setMarkdown(markdown);
            doc.setWorkflowVersion(workflow.getVersion());
            doc.setGeneratedAt(now);
            doc.setEditedBy(null);
            doc.setEditedAt(null);
        } else {
            doc = WorkflowDoc.builder()
                    .id(UUID.randomUUID().toString())
                    .clientId(clientId)
                    .namespace(namespace)
                    .workflowId(workflowId)
                    .workflowVersion(workflow.getVersion())
                    .markdown(markdown)
                    .generatedAt(now)
                    .createdAt(now)
                    .build();
        }

        WorkflowDoc saved = docRepository.save(doc);

        return new GenerateDocResponse(
                saved.getWorkflowId(),
                saved.getWorkflowVersion(),
                saved.getMarkdown(),
                saved.getGeneratedAt(),
                regenerated
        );
    }

    public Optional<WorkflowDoc> get(String workflowId) {
        String clientId = TenantContext.getClientId();
        String namespace = TenantContext.getNamespace();
        return docRepository.findByClientIdAndNamespaceAndWorkflowId(clientId, namespace, workflowId);
    }

    public WorkflowDoc update(String workflowId, String markdown, String editorUserId) {
        String clientId = TenantContext.getClientId();
        String namespace = TenantContext.getNamespace();

        WorkflowDoc doc = docRepository
                .findByClientIdAndNamespaceAndWorkflowId(clientId, namespace, workflowId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "No documentation found for workflowId: " + workflowId));

        doc.setMarkdown(markdown);
        doc.setEditedBy(editorUserId);
        doc.setEditedAt(Instant.now());
        return docRepository.save(doc);
    }

    private String buildPrompt(WorkflowDefinition workflow, String inputModelName) {
        Map<String, Object> summary = new HashMap<>();
        summary.put("id", workflow.getId());
        summary.put("name", workflow.getName());
        summary.put("displayName", workflow.getDisplayName());
        summary.put("description", workflow.getDescription());
        summary.put("version", workflow.getVersion());
        summary.put("status", workflow.getStatus());
        summary.put("triggerType", workflow.getTriggerType());
        summary.put("cronExpression", workflow.getCronExpression());
        summary.put("kafkaTopic", workflow.getKafkaTopic());
        summary.put("inputModelId", workflow.getInputModelId());
        summary.put("inputModelName", inputModelName);
        summary.put("dataSyncMode", workflow.getDataSyncMode());
        summary.put("variables", workflow.getVariables());
        summary.put("inputSchema", workflow.getInputSchema());
        summary.put("steps", workflow.getSteps());
        summary.put("edges", workflow.getEdges());

        String workflowJson;
        try {
            workflowJson = objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(summary);
        } catch (Exception e) {
            workflowJson = summary.toString();
        }

        StringBuilder sb = new StringBuilder();
        sb.append("Generate comprehensive markdown documentation for the following FlowForge workflow.\n\n");
        sb.append("=== WORKFLOW DEFINITION ===\n");
        sb.append(workflowJson).append("\n\n");
        sb.append("=== REQUIRED SECTIONS ===\n");
        sb.append("Produce markdown with these top-level sections using '##' headings, in this order:\n");
        sb.append("1. ## Overview — what the workflow does and why it exists, in plain language.\n");
        sb.append("2. ## Trigger — how the workflow is invoked (type, schedule, topic, or API).\n");
        sb.append("3. ## Step-by-step behavior — each step, in execution order, with configuration highlights.\n");
        sb.append("4. ## Data Models — input/output schemas and model linkages (if any).\n");
        sb.append("5. ## Failure Modes — likely failure scenarios and how the workflow handles them.\n");
        sb.append("6. ## Observability Notes — what to monitor, which metrics/logs matter.\n\n");
        sb.append("Use bullet lists where helpful and fenced code blocks for config snippets. ");
        sb.append("Do not include any text outside the markdown document.\n");
        return sb.toString();
    }
}
