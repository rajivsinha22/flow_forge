package com.flowforge.execution.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.flowforge.execution.client.ClaudeClient;
import com.flowforge.execution.config.TenantContext;
import com.flowforge.execution.dto.OptimizationResult;
import com.flowforge.execution.dto.OptimizationSuggestion;
import com.flowforge.execution.engine.WorkflowDefinitionLoader;
import com.flowforge.execution.model.StepDef;
import com.flowforge.execution.model.StepExecution;
import com.flowforge.execution.model.WorkflowDefinitionSnapshot;
import com.flowforge.execution.model.WorkflowExecution;
import com.flowforge.execution.repository.StepExecutionRepository;
import com.flowforge.execution.repository.WorkflowExecutionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * WorkflowOptimizationService
 *
 * Analyzes the last N runs of a workflow plus its definition and asks Claude
 * to produce JSON-structured optimization suggestions.
 */
@Service
public class WorkflowOptimizationService {

    private static final Logger log = LoggerFactory.getLogger(WorkflowOptimizationService.class);

    private static final String SYSTEM_PROMPT =
            "You are a workflow optimization expert. Respond ONLY with valid JSON matching the requested schema. " +
            "Do not include any commentary outside the JSON object.";

    private final ClaudeClient claudeClient;
    private final WorkflowExecutionRepository executionRepository;
    private final StepExecutionRepository stepExecutionRepository;
    private final WorkflowDefinitionLoader definitionLoader;
    private final ObjectMapper objectMapper;

    @Value("${flowforge.ai.optimization.model:claude-haiku-4-5-20251001}")
    private String optimizationModel;

    @Value("${flowforge.ai.optimization.sampleSize:100}")
    private int sampleSize;

    public WorkflowOptimizationService(ClaudeClient claudeClient,
                                       WorkflowExecutionRepository executionRepository,
                                       StepExecutionRepository stepExecutionRepository,
                                       WorkflowDefinitionLoader definitionLoader,
                                       ObjectMapper objectMapper) {
        this.claudeClient = claudeClient;
        this.executionRepository = executionRepository;
        this.stepExecutionRepository = stepExecutionRepository;
        this.definitionLoader = definitionLoader;
        this.objectMapper = objectMapper;
    }

    public OptimizationResult optimize(String workflowId) {
        String clientId = TenantContext.getClientId();
        String namespace = TenantContext.getNamespace();

        List<WorkflowExecution> executions = executionRepository
                .findTop100ByClientIdAndNamespaceAndWorkflowIdOrderByStartedAtDesc(clientId, namespace, workflowId);

        List<String> executionIds = executions.stream().map(WorkflowExecution::getId).toList();
        List<StepExecution> steps = executionIds.isEmpty()
                ? List.of()
                : stepExecutionRepository.findByExecutionIdIn(executionIds);

        WorkflowDefinitionSnapshot definition = null;
        try {
            definition = definitionLoader.loadById(clientId, workflowId);
        } catch (Exception e) {
            log.warn("Failed to load workflow definition {}: {}", workflowId, e.getMessage());
        }

        Map<String, Object> stats = buildStatistics(executions, steps);
        String userPrompt = buildUserPrompt(workflowId, definition, stats);

        String raw = claudeClient.call(SYSTEM_PROMPT, userPrompt, optimizationModel, 2048, 0.3);
        raw = raw == null ? "" : raw.trim();
        if (raw.startsWith("```")) {
            raw = raw
                    .replaceFirst("(?s)^```(?:json)?\\s*", "")
                    .replaceFirst("(?s)```\\s*$", "")
                    .trim();
        }

        String summary = "";
        List<OptimizationSuggestion> suggestions = new ArrayList<>();
        try {
            Map<String, Object> parsed = objectMapper.readValue(raw, new TypeReference<>() { });
            Object sum = parsed.get("summary");
            if (sum != null) summary = String.valueOf(sum);
            Object rawSuggestions = parsed.get("suggestions");
            if (rawSuggestions instanceof List<?> list) {
                for (Object item : list) {
                    if (!(item instanceof Map<?, ?> m)) continue;
                    suggestions.add(new OptimizationSuggestion(
                            asString(m.get("type")),
                            asString(m.get("severity")),
                            asString(m.get("stepId")),
                            asString(m.get("description")),
                            asString(m.get("rationale"))
                    ));
                }
            }
        } catch (Exception ex) {
            log.warn("Failed to parse optimization JSON for workflow {}: {}. Raw: {}",
                    workflowId, ex.getMessage(), raw);
            summary = raw;
        }

        return new OptimizationResult(workflowId, executions.size(), Instant.now(), suggestions, summary);
    }

    // ── Statistics ───────────────────────────────────────────────────────────

    private Map<String, Object> buildStatistics(List<WorkflowExecution> executions,
                                                List<StepExecution> steps) {
        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("totalRuns", executions.size());

        long success = executions.stream().filter(e -> "SUCCESS".equals(e.getStatus())).count();
        long failed  = executions.stream().filter(e -> "FAILED".equals(e.getStatus())).count();
        stats.put("successRuns", success);
        stats.put("failedRuns", failed);
        stats.put("successRate", executions.isEmpty() ? 0.0 : (double) success / executions.size());

        double avgDuration = executions.stream()
                .filter(e -> e.getDurationMs() > 0)
                .mapToLong(WorkflowExecution::getDurationMs)
                .average().orElse(0.0);
        stats.put("avgDurationMs", Math.round(avgDuration));

        Map<String, Map<String, Object>> perStep = new LinkedHashMap<>();
        Map<String, List<StepExecution>> byStep = steps.stream()
                .collect(Collectors.groupingBy(
                        s -> s.getStepId() != null ? s.getStepId() : "unknown"));

        for (Map.Entry<String, List<StepExecution>> entry : byStep.entrySet()) {
            List<StepExecution> group = entry.getValue();
            long total = group.size();
            long stepFails = group.stream().filter(s -> "FAILED".equals(s.getStatus())).count();
            double stepAvg = group.stream()
                    .filter(s -> s.getDurationMs() > 0)
                    .mapToLong(StepExecution::getDurationMs)
                    .average().orElse(0.0);

            Map<String, Long> topErrors = group.stream()
                    .filter(s -> s.getErrorMessage() != null)
                    .collect(Collectors.groupingBy(
                            s -> truncate(s.getErrorMessage(), 200),
                            Collectors.counting()));
            List<Map<String, Object>> topErrorList = topErrors.entrySet().stream()
                    .sorted(Map.Entry.<String, Long>comparingByValue().reversed())
                    .limit(3)
                    .map(e -> {
                        Map<String, Object> m = new LinkedHashMap<>();
                        m.put("message", e.getKey());
                        m.put("count", e.getValue());
                        return m;
                    })
                    .toList();

            StepExecution first = group.get(0);
            Map<String, Object> stepStats = new LinkedHashMap<>();
            stepStats.put("stepName", first.getStepName());
            stepStats.put("stepType", first.getStepType());
            stepStats.put("totalAttempts", total);
            stepStats.put("failureRate", total == 0 ? 0.0 : (double) stepFails / total);
            stepStats.put("avgDurationMs", Math.round(stepAvg));
            stepStats.put("topErrors", topErrorList);
            perStep.put(entry.getKey(), stepStats);
        }
        stats.put("perStep", perStep);
        return stats;
    }

    private String buildUserPrompt(String workflowId, WorkflowDefinitionSnapshot def,
                                    Map<String, Object> stats) {
        StringBuilder sb = new StringBuilder();
        sb.append("Analyze this workflow and suggest optimizations. ")
          .append("Return JSON with schema {summary: string, suggestions: [{type, severity, stepId?, description, rationale}]}. ")
          .append("Use only these types: RETRY_TUNING, TIMEOUT_TUNING, PARALLELIZATION, DEAD_BRANCH, RATE_LIMIT_RISK, SCHEMA_MISMATCH. ")
          .append("Severity: INFO/WARN/CRITICAL. Be specific and cite stepIds.\n\n");

        sb.append("=== WORKFLOW ===\n");
        sb.append("ID: ").append(workflowId).append("\n");

        if (def != null) {
            sb.append("Name: ").append(def.getName()).append(" v").append(def.getVersion()).append("\n");
            sb.append("Trigger: ").append(def.getTriggerType()).append("\n");
            List<StepDef> defSteps = def.getSteps();
            if (defSteps != null) {
                sb.append("Steps (").append(defSteps.size()).append("):\n");
                for (StepDef s : defSteps) {
                    sb.append("  - stepId=").append(s.getStepId())
                      .append(", type=").append(s.getType())
                      .append(", onSuccess=").append(s.getOnSuccess())
                      .append(", onFailure=").append(s.getOnFailure());
                    if (s.getRetryPolicy() != null) {
                        sb.append(", retry={maxRetries=").append(s.getRetryPolicy().getMaxRetries())
                          .append(", strategy=").append(s.getRetryPolicy().getStrategy())
                          .append(", initialDelayMs=").append(s.getRetryPolicy().getInitialDelayMs())
                          .append("}");
                    }
                    sb.append("\n");
                }
            }
        } else {
            sb.append("(workflow definition unavailable)\n");
        }

        sb.append("\n=== RUNTIME STATISTICS (last ").append(stats.getOrDefault("totalRuns", 0)).append(" runs) ===\n");
        try {
            sb.append(objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(stats));
        } catch (Exception e) {
            sb.append(stats.toString());
        }
        sb.append("\n\nRespond with JSON only.");
        return sb.toString();
    }

    private static String asString(Object o) {
        return o == null ? null : String.valueOf(o);
    }

    private static String truncate(String s, int maxChars) {
        if (s == null) return "";
        return s.length() <= maxChars ? s : s.substring(0, maxChars) + "...";
    }
}
