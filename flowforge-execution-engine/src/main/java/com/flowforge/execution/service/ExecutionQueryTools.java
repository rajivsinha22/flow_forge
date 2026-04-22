package com.flowforge.execution.service;

import com.flowforge.execution.config.TenantContext;
import com.flowforge.execution.dto.ChatCitation;
import com.flowforge.execution.model.StepExecution;
import com.flowforge.execution.model.WorkflowExecution;
import com.flowforge.execution.repository.StepExecutionRepository;
import com.flowforge.execution.repository.WorkflowExecutionRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * ExecutionQueryTools
 *
 * Backing implementations for the Anthropic tool-use calls made by the chat service.
 * All queries are scoped by clientId and namespace from TenantContext.
 *
 * Every tool method returns a Map containing:
 *   - "data"      : the actual payload (counts, lists, etc.)
 *   - "citations" : List&lt;ChatCitation&gt; of executions/workflows referenced
 */
@Component
public class ExecutionQueryTools {

    private static final int DEFAULT_WINDOW_HOURS = 24;

    private final WorkflowExecutionRepository executionRepository;
    private final StepExecutionRepository stepExecutionRepository;

    public ExecutionQueryTools(WorkflowExecutionRepository executionRepository,
                               StepExecutionRepository stepExecutionRepository) {
        this.executionRepository = executionRepository;
        this.stepExecutionRepository = stepExecutionRepository;
    }

    /**
     * Count executions matching filters (status, workflowName, time window).
     */
    public Map<String, Object> countExecutions(String status, String workflowName, Integer windowHours) {
        String clientId = TenantContext.getClientId();
        String namespace = TenantContext.getNamespace();
        int hours = windowHours != null && windowHours > 0 ? windowHours : DEFAULT_WINDOW_HOURS;
        LocalDateTime since = LocalDateTime.now().minusHours(hours);

        long count;
        if (status != null && !status.isBlank() && workflowName != null && !workflowName.isBlank()) {
            count = executionRepository.countByClientIdAndNamespaceAndStatusAndWorkflowNameAndStartedAtAfter(
                    clientId, namespace, status.toUpperCase(), workflowName, since);
        } else if (status != null && !status.isBlank()) {
            count = executionRepository.countByClientIdAndNamespaceAndStatusAndStartedAtAfter(
                    clientId, namespace, status.toUpperCase(), since);
        } else if (workflowName != null && !workflowName.isBlank()) {
            count = executionRepository.countByClientIdAndNamespaceAndWorkflowNameAndStartedAtAfter(
                    clientId, namespace, workflowName, since);
        } else {
            count = executionRepository.countByClientIdAndNamespaceAndStartedAtAfter(
                    clientId, namespace, since);
        }

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("count", count);
        data.put("status", status);
        data.put("workflowName", workflowName);
        data.put("windowHours", hours);

        Map<String, Object> out = new HashMap<>();
        out.put("data", data);
        out.put("citations", new ArrayList<ChatCitation>());
        return out;
    }

    /**
     * Top failing step names for a given workflow (by count) over the window.
     */
    public Map<String, Object> findFailingSteps(String workflowId, int limit, int windowHours) {
        String clientId = TenantContext.getClientId();
        String namespace = TenantContext.getNamespace();
        int hours = windowHours > 0 ? windowHours : DEFAULT_WINDOW_HOURS;
        int cap = limit > 0 ? limit : 10;
        LocalDateTime since = LocalDateTime.now().minusHours(hours);

        List<WorkflowExecution> executions;
        if (workflowId != null && !workflowId.isBlank()) {
            executions = executionRepository.findByClientIdAndNamespaceAndWorkflowIdAndStartedAtAfter(
                    clientId, namespace, workflowId, since);
        } else {
            executions = executionRepository.findByClientIdAndNamespaceAndStartedAtAfter(
                    clientId, namespace, since);
        }

        List<String> executionIds = executions.stream().map(WorkflowExecution::getId).toList();
        List<StepExecution> failed = executionIds.isEmpty()
                ? List.of()
                : stepExecutionRepository.findByExecutionIdIn(executionIds).stream()
                    .filter(s -> "FAILED".equals(s.getStatus()))
                    .toList();

        Map<String, Long> counts = failed.stream()
                .collect(Collectors.groupingBy(
                        s -> s.getStepName() != null ? s.getStepName() : s.getStepId(),
                        Collectors.counting()));

        List<Map<String, Object>> top = counts.entrySet().stream()
                .sorted(Map.Entry.<String, Long>comparingByValue().reversed())
                .limit(cap)
                .map(e -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("stepName", e.getKey());
                    m.put("failures", e.getValue());
                    StepExecution sample = failed.stream()
                            .filter(s -> e.getKey().equals(s.getStepName() != null ? s.getStepName() : s.getStepId()))
                            .findFirst().orElse(null);
                    if (sample != null && sample.getErrorMessage() != null) {
                        m.put("sampleError", truncate(sample.getErrorMessage(), 200));
                    }
                    return m;
                })
                .toList();

        List<ChatCitation> citations = executions.stream()
                .limit(10)
                .map(e -> new ChatCitation("execution", e.getId(), e.getWorkflowName() + " / " + e.getStatus()))
                .collect(Collectors.toList());

        Map<String, Object> out = new HashMap<>();
        out.put("data", top);
        out.put("citations", citations);
        return out;
    }

    /**
     * Top slowest steps over the window.
     */
    public Map<String, Object> topSlowSteps(int limit, int windowHours) {
        String clientId = TenantContext.getClientId();
        String namespace = TenantContext.getNamespace();
        int hours = windowHours > 0 ? windowHours : DEFAULT_WINDOW_HOURS;
        int cap = limit > 0 ? limit : 10;
        LocalDateTime since = LocalDateTime.now().minusHours(hours);

        List<StepExecution> steps = stepExecutionRepository
                .findByClientIdAndNamespaceAndStartedAtAfter(clientId, namespace, since);

        List<Map<String, Object>> top = steps.stream()
                .filter(s -> s.getDurationMs() > 0)
                .sorted(Comparator.comparingLong(StepExecution::getDurationMs).reversed())
                .limit(cap)
                .map(s -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("stepId", s.getStepId());
                    m.put("stepName", s.getStepName());
                    m.put("stepType", s.getStepType());
                    m.put("durationMs", s.getDurationMs());
                    m.put("executionId", s.getExecutionId());
                    m.put("status", s.getStatus());
                    return m;
                })
                .toList();

        List<ChatCitation> citations = top.stream()
                .map(m -> new ChatCitation(
                        "execution",
                        String.valueOf(m.get("executionId")),
                        m.get("stepName") + " (" + m.get("durationMs") + "ms)"))
                .distinct()
                .collect(Collectors.toList());

        Map<String, Object> out = new HashMap<>();
        out.put("data", top);
        out.put("citations", citations);
        return out;
    }

    /**
     * Regex search on workflow name.
     */
    public Map<String, Object> searchWorkflows(String query, int limit) {
        String clientId = TenantContext.getClientId();
        String namespace = TenantContext.getNamespace();
        int cap = limit > 0 ? limit : 10;

        Page<WorkflowExecution> page = executionRepository
                .searchByClientIdAndNamespaceAndWorkflowName(
                        clientId, namespace,
                        query != null ? query : "",
                        PageRequest.of(0, cap * 5, Sort.by(Sort.Direction.DESC, "startedAt")));

        Map<String, Map<String, Object>> grouped = new LinkedHashMap<>();
        for (WorkflowExecution e : page.getContent()) {
            String key = e.getWorkflowId();
            if (key == null) continue;
            grouped.computeIfAbsent(key, k -> {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("workflowId", e.getWorkflowId());
                m.put("workflowName", e.getWorkflowName());
                m.put("runs", 0);
                return m;
            });
            Map<String, Object> m = grouped.get(key);
            m.put("runs", (int) m.get("runs") + 1);
        }

        List<Map<String, Object>> results = grouped.values().stream().limit(cap).toList();

        List<ChatCitation> citations = results.stream()
                .map(m -> new ChatCitation(
                        "workflow",
                        String.valueOf(m.get("workflowId")),
                        String.valueOf(m.get("workflowName"))))
                .collect(Collectors.toList());

        Map<String, Object> out = new HashMap<>();
        out.put("data", results);
        out.put("citations", citations);
        return out;
    }

    /**
     * Load a single execution plus its failed steps.
     */
    public Map<String, Object> getExecutionDetail(String executionId) {
        String clientId = TenantContext.getClientId();
        String namespace = TenantContext.getNamespace();

        WorkflowExecution exec = executionRepository.findById(executionId).orElse(null);
        Map<String, Object> data = new LinkedHashMap<>();
        List<ChatCitation> citations = new ArrayList<>();

        if (exec == null || !clientId.equals(exec.getClientId())
                || !namespace.equals(exec.getNamespace() != null ? exec.getNamespace() : "default")) {
            data.put("found", false);
            Map<String, Object> out = new HashMap<>();
            out.put("data", data);
            out.put("citations", citations);
            return out;
        }

        data.put("found", true);
        data.put("id", exec.getId());
        data.put("workflowId", exec.getWorkflowId());
        data.put("workflowName", exec.getWorkflowName());
        data.put("status", exec.getStatus());
        data.put("startedAt", exec.getStartedAt() != null ? exec.getStartedAt().toString() : null);
        data.put("completedAt", exec.getCompletedAt() != null ? exec.getCompletedAt().toString() : null);
        data.put("durationMs", exec.getDurationMs());
        data.put("errorMessage", exec.getErrorMessage());
        data.put("triggerType", exec.getTriggerType());

        List<StepExecution> steps = stepExecutionRepository.findByExecutionIdOrderByStartedAtAsc(executionId);
        List<Map<String, Object>> failedSteps = steps.stream()
                .filter(s -> "FAILED".equals(s.getStatus()))
                .map(s -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("stepId", s.getStepId());
                    m.put("stepName", s.getStepName());
                    m.put("stepType", s.getStepType());
                    m.put("attempts", s.getTotalAttempts());
                    m.put("errorMessage", s.getErrorMessage());
                    return m;
                })
                .toList();
        data.put("failedSteps", failedSteps);
        data.put("totalSteps", steps.size());

        citations.add(new ChatCitation("execution", exec.getId(),
                exec.getWorkflowName() + " / " + exec.getStatus()));
        if (exec.getWorkflowId() != null) {
            citations.add(new ChatCitation("workflow", exec.getWorkflowId(), exec.getWorkflowName()));
        }

        Map<String, Object> out = new HashMap<>();
        out.put("data", data);
        out.put("citations", citations);
        return out;
    }

    private static String truncate(String s, int maxChars) {
        if (s == null) return "";
        return s.length() <= maxChars ? s : s.substring(0, maxChars) + "...[truncated]";
    }
}
