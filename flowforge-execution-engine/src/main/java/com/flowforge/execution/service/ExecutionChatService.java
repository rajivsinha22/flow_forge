package com.flowforge.execution.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.flowforge.common.exception.PlanLimitExceededException;
import com.flowforge.common.model.Client;
import com.flowforge.common.model.PlanLimits;
import com.flowforge.execution.client.ClaudeClient;
import com.flowforge.execution.config.TenantContext;
import com.flowforge.execution.dto.ChatCitation;
import com.flowforge.execution.dto.ChatRequest;
import com.flowforge.execution.dto.ChatResponse;
import com.flowforge.execution.model.AiUsageDaily;
import com.flowforge.execution.repository.AiUsageDailyRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * ExecutionChatService
 *
 * Handles conversational queries about the tenant's workflows and executions
 * using Anthropic tool-use. Limited by the plan's maxAiChatMessagesPerDay.
 */
@Service
public class ExecutionChatService {

    private static final Logger log = LoggerFactory.getLogger(ExecutionChatService.class);

    private static final String SYSTEM_PROMPT =
            "You are a helpful assistant for FlowForge workflow platform users. " +
            "Answer questions about their workflows, executions, and steps using the provided tools. " +
            "Always cite specific execution IDs or workflow names when giving answers. Keep answers concise.";

    private final ClaudeClient claudeClient;
    private final ExecutionQueryTools executionQueryTools;
    private final AiUsageDailyRepository usageRepository;
    private final MongoTemplate mongoTemplate;
    private final ObjectMapper objectMapper;

    @Value("${flowforge.ai.chat.model:claude-haiku-4-5-20251001}")
    private String chatModel;

    @Value("${flowforge.ai.chat.maxToolIterations:5}")
    private int maxToolIterations;

    public ExecutionChatService(ClaudeClient claudeClient,
                                ExecutionQueryTools executionQueryTools,
                                AiUsageDailyRepository usageRepository,
                                MongoTemplate mongoTemplate,
                                ObjectMapper objectMapper) {
        this.claudeClient = claudeClient;
        this.executionQueryTools = executionQueryTools;
        this.usageRepository = usageRepository;
        this.mongoTemplate = mongoTemplate;
        this.objectMapper = objectMapper;
    }

    @SuppressWarnings("unchecked")
    public ChatResponse handleMessage(ChatRequest request) {
        String clientId = TenantContext.getClientId();
        String planStr = TenantContext.getPlan();
        Client.Plan plan = resolvePlan(planStr);
        PlanLimits limits = PlanLimits.forPlan(plan);
        int limitPerDay = limits.getMaxAiChatMessagesPerDay();

        LocalDate today = LocalDate.now();
        int usedToday = usageRepository.findByClientIdAndDate(clientId, today)
                .map(AiUsageDaily::getMessages).orElse(0);

        if (limitPerDay != -1 && usedToday >= limitPerDay) {
            throw new PlanLimitExceededException(plan, "AI chat messages", usedToday, limitPerDay);
        }

        // ── Build message list ─────────────────────────────────────────────────
        List<Map<String, Object>> messages = new ArrayList<>();
        if (request.getHistory() != null) {
            for (ChatRequest.ChatMessage m : request.getHistory()) {
                if (m.getRole() == null || m.getContent() == null) continue;
                Map<String, Object> msg = new LinkedHashMap<>();
                msg.put("role", m.getRole());
                msg.put("content", m.getContent());
                messages.add(msg);
            }
        }
        Map<String, Object> newUser = new LinkedHashMap<>();
        newUser.put("role", "user");
        newUser.put("content", request.getMessage() != null ? request.getMessage() : "");
        messages.add(newUser);

        List<Map<String, Object>> toolSpecs = buildToolSpecs();

        List<ChatCitation> allCitations = new ArrayList<>();
        String finalText = "";

        for (int iter = 0; iter < maxToolIterations; iter++) {
            Map<String, Object> response = claudeClient.callWithTools(
                    SYSTEM_PROMPT, messages, chatModel, 1024, toolSpecs);

            String stopReason = (String) response.getOrDefault("stop_reason", "end_turn");
            List<Map<String, Object>> content = (List<Map<String, Object>>) response.getOrDefault("content", List.of());

            // Record the assistant turn in the running message list.
            Map<String, Object> assistantMsg = new LinkedHashMap<>();
            assistantMsg.put("role", "assistant");
            assistantMsg.put("content", content);
            messages.add(assistantMsg);

            if ("tool_use".equals(stopReason)) {
                List<Map<String, Object>> toolResults = new ArrayList<>();
                for (Map<String, Object> block : content) {
                    if (!"tool_use".equals(block.get("type"))) continue;
                    String toolName = (String) block.get("name");
                    String toolUseId = (String) block.get("id");
                    Map<String, Object> input = (Map<String, Object>) block.getOrDefault("input", Map.of());

                    Map<String, Object> toolOutput;
                    try {
                        toolOutput = invokeTool(toolName, input);
                        List<ChatCitation> cites = (List<ChatCitation>) toolOutput.getOrDefault(
                                "citations", new ArrayList<>());
                        for (ChatCitation c : cites) {
                            if (!allCitations.contains(c)) allCitations.add(c);
                        }
                    } catch (Exception ex) {
                        log.warn("Tool '{}' failed: {}", toolName, ex.getMessage());
                        toolOutput = Map.of("error", ex.getMessage());
                    }

                    String toolJson;
                    try {
                        toolJson = objectMapper.writeValueAsString(toolOutput.getOrDefault("data", toolOutput));
                    } catch (Exception e) {
                        toolJson = "{\"error\":\"serialization failed\"}";
                    }

                    Map<String, Object> toolResult = new LinkedHashMap<>();
                    toolResult.put("type", "tool_result");
                    toolResult.put("tool_use_id", toolUseId);
                    toolResult.put("content", toolJson);
                    toolResults.add(toolResult);
                }
                Map<String, Object> toolMsg = new LinkedHashMap<>();
                toolMsg.put("role", "user");
                toolMsg.put("content", toolResults);
                messages.add(toolMsg);
                continue;
            }

            // end_turn / stop_sequence / max_tokens → collect text and finish.
            StringBuilder sb = new StringBuilder();
            for (Map<String, Object> block : content) {
                if ("text".equals(block.get("type"))) {
                    sb.append((String) block.getOrDefault("text", ""));
                }
            }
            finalText = sb.toString().trim();
            break;
        }

        int updatedUsage = incrementUsage(clientId, today);

        return new ChatResponse(finalText, allCitations, updatedUsage, limitPerDay);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private Client.Plan resolvePlan(String planStr) {
        if (planStr == null || planStr.isBlank()) return Client.Plan.FREE;
        try {
            return Client.Plan.valueOf(planStr.toUpperCase());
        } catch (IllegalArgumentException ex) {
            return Client.Plan.FREE;
        }
    }

    private int incrementUsage(String clientId, LocalDate date) {
        Query q = new Query(Criteria.where("clientId").is(clientId).and("date").is(date));
        Update u = new Update()
                .inc("messages", 1)
                .setOnInsert("clientId", clientId)
                .setOnInsert("date", date)
                .set("updatedAt", Instant.now());
        AiUsageDaily updated = mongoTemplate.findAndModify(
                q, u,
                new org.springframework.data.mongodb.core.FindAndModifyOptions().upsert(true).returnNew(true),
                AiUsageDaily.class);
        return updated != null ? updated.getMessages() : 1;
    }

    private Map<String, Object> invokeTool(String name, Map<String, Object> input) {
        return switch (name) {
            case "count_executions" -> executionQueryTools.countExecutions(
                    asString(input.get("status")),
                    asString(input.get("workflowName")),
                    asInt(input.get("windowHours"), null));
            case "find_failing_steps" -> executionQueryTools.findFailingSteps(
                    asString(input.get("workflowId")),
                    asInt(input.get("limit"), 10),
                    asInt(input.get("windowHours"), 24));
            case "top_slow_steps" -> executionQueryTools.topSlowSteps(
                    asInt(input.get("limit"), 10),
                    asInt(input.get("windowHours"), 24));
            case "search_workflows" -> executionQueryTools.searchWorkflows(
                    asString(input.get("query")),
                    asInt(input.get("limit"), 10));
            case "get_execution_detail" -> executionQueryTools.getExecutionDetail(
                    asString(input.get("executionId")));
            default -> Map.of("error", "unknown tool: " + name);
        };
    }

    private static String asString(Object o) {
        return o == null ? null : String.valueOf(o);
    }

    private static int asInt(Object o, Integer defaultValue) {
        if (o == null) return defaultValue != null ? defaultValue : 0;
        if (o instanceof Number n) return n.intValue();
        try {
            return Integer.parseInt(String.valueOf(o));
        } catch (NumberFormatException e) {
            return defaultValue != null ? defaultValue : 0;
        }
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> buildToolSpecs() {
        List<Map<String, Object>> specs = new ArrayList<>();

        specs.add(toolSpec("count_executions",
                "Count workflow executions optionally filtered by status, workflow name, and a time window in hours.",
                Map.of(
                        "status", propStr("Execution status (SUCCESS, FAILED, RUNNING, PENDING)"),
                        "workflowName", propStr("Optional workflow name filter"),
                        "windowHours", propInt("How many hours back to consider (default 24)")
                ),
                List.of()));

        specs.add(toolSpec("find_failing_steps",
                "Return the top failing step names for a given workflow over the last window. Each entry has stepName and failure count.",
                Map.of(
                        "workflowId", propStr("Workflow ID to focus on (optional)"),
                        "limit", propInt("Max entries to return (default 10)"),
                        "windowHours", propInt("How many hours back to consider (default 24)")
                ),
                List.of()));

        specs.add(toolSpec("top_slow_steps",
                "Return the slowest step executions over the window, sorted by duration descending.",
                Map.of(
                        "limit", propInt("Max entries to return (default 10)"),
                        "windowHours", propInt("How many hours back to consider (default 24)")
                ),
                List.of()));

        specs.add(toolSpec("search_workflows",
                "Regex-search workflows by name. Returns workflowId, workflowName, and recent run counts.",
                Map.of(
                        "query", propStr("Case-insensitive substring/regex to match against workflow name"),
                        "limit", propInt("Max entries to return (default 10)")
                ),
                List.of("query")));

        specs.add(toolSpec("get_execution_detail",
                "Fetch a single execution by ID along with its failed steps and summary fields.",
                Map.of(
                        "executionId", propStr("The execution document ID")
                ),
                List.of("executionId")));

        return specs;
    }

    private static Map<String, Object> toolSpec(String name, String description,
                                                Map<String, Object> properties,
                                                List<String> required) {
        Map<String, Object> schema = new LinkedHashMap<>();
        schema.put("type", "object");
        schema.put("properties", properties);
        schema.put("required", required);

        Map<String, Object> spec = new LinkedHashMap<>();
        spec.put("name", name);
        spec.put("description", description);
        spec.put("input_schema", schema);
        return spec;
    }

    private static Map<String, Object> propStr(String desc) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("type", "string");
        m.put("description", desc);
        return m;
    }

    private static Map<String, Object> propInt(String desc) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("type", "integer");
        m.put("description", desc);
        return m;
    }
}
