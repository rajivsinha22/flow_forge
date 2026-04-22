package com.flowforge.execution.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.flowforge.execution.client.ClaudeClient;
import com.flowforge.execution.dto.AiAnalysisResult;
import com.flowforge.execution.model.StepExecution;
import com.flowforge.execution.model.WorkflowExecution;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

/**
 * AiAnalysisService
 *
 * Builds a structured prompt from a failed workflow execution trace and calls
 * the Anthropic Claude API via ClaudeClient to produce a human-readable failure
 * analysis.
 */
@Service
public class AiAnalysisService {

    private static final Logger log = LoggerFactory.getLogger(AiAnalysisService.class);

    private static final String ANALYSIS_MODEL = "claude-haiku-4-5-20251001";
    private static final int MAX_TOKENS = 1024;
    private static final double TEMPERATURE = 0.3;
    private static final int MAX_JSON_CHARS = 2000;

    private static final String SYSTEM_PROMPT =
            "You are an expert workflow automation engineer. " +
            "Analyze failed workflow executions and respond ONLY with valid JSON in the exact format requested. " +
            "Do not include any text before or after the JSON object.";

    private final ClaudeClient claudeClient;
    private final ObjectMapper objectMapper;

    public AiAnalysisService(ClaudeClient claudeClient, ObjectMapper objectMapper) {
        this.claudeClient = claudeClient;
        this.objectMapper = objectMapper;
    }

    public AiAnalysisResult analyzeExecution(WorkflowExecution execution,
                                              List<StepExecution> stepExecutions) throws Exception {

        String prompt = buildPrompt(execution, stepExecutions);
        log.debug("Sending execution {} to AI for analysis ({} chars)", execution.getId(), prompt.length());

        String responseText = claudeClient.call(SYSTEM_PROMPT, prompt, ANALYSIS_MODEL, MAX_TOKENS, TEMPERATURE);

        responseText = responseText == null ? "" : responseText.trim();
        if (responseText.startsWith("```")) {
            responseText = responseText
                    .replaceFirst("(?s)^```(?:json)?\\s*", "")
                    .replaceFirst("(?s)```\\s*$", "")
                    .trim();
        }

        try {
            AiAnalysisResult result = objectMapper.readValue(responseText, AiAnalysisResult.class);
            log.info("AI analysis complete for execution {}", execution.getId());
            return result;
        } catch (Exception parseEx) {
            log.warn("Failed to parse AI analysis JSON for execution {}: {}. Raw: {}",
                    execution.getId(), parseEx.getMessage(), responseText);
            return new AiAnalysisResult(
                    responseText,
                    "Could not parse structured analysis — see summary for details.",
                    List.of("Review the error message in the failed step's detail panel.")
            );
        }
    }

    private String buildPrompt(WorkflowExecution execution, List<StepExecution> stepExecutions) {
        List<StepExecution> failedSteps = stepExecutions.stream()
                .filter(s -> "FAILED".equals(s.getStatus()))
                .toList();

        StringBuilder sb = new StringBuilder();
        sb.append("Analyze this failed workflow execution and respond ONLY with JSON.\n\n");
        sb.append("=== EXECUTION SUMMARY ===\n");
        sb.append("Workflow: ").append(execution.getWorkflowName())
          .append(" v").append(execution.getWorkflowVersion()).append("\n");
        sb.append("Execution ID: ").append(execution.getId()).append("\n");
        sb.append("Status: ").append(execution.getStatus()).append("\n");
        if (execution.getStartedAt() != null) {
            sb.append("Started: ").append(execution.getStartedAt()).append("\n");
        }
        if (execution.getDurationMs() > 0) {
            sb.append("Duration: ").append(execution.getDurationMs()).append("ms\n");
        }

        if (!failedSteps.isEmpty()) {
            sb.append("\n=== FAILED STEP(S) ===\n");
            for (StepExecution step : failedSteps) {
                sb.append("Step ID:    ").append(step.getStepId()).append("\n");
                sb.append("Step Name:  ").append(step.getStepName()).append("\n");
                sb.append("Step Type:  ").append(step.getStepType()).append("\n");
                sb.append("Attempts:   ").append(step.getTotalAttempts()).append("\n");
                if (step.getErrorMessage() != null) {
                    sb.append("Error:      ").append(step.getErrorMessage()).append("\n");
                }
                if (step.getInput() != null && !step.getInput().isEmpty()) {
                    sb.append("Input:      ").append(truncateJson(step.getInput())).append("\n");
                }
                if (step.getResolvedConfig() != null && !step.getResolvedConfig().isEmpty()) {
                    sb.append("Config:     ").append(truncateJson(step.getResolvedConfig())).append("\n");
                }
                if (step.getOutput() != null && !step.getOutput().isEmpty()) {
                    sb.append("Output:     ").append(truncateJson(step.getOutput())).append("\n");
                }
                if (step.getHttpCallLog() != null) {
                    sb.append("HTTP URL:   ").append(step.getHttpCallLog().getUrl()).append("\n");
                    sb.append("HTTP Status:").append(step.getHttpCallLog().getResponseStatus()).append("\n");
                    if (step.getHttpCallLog().getResponseBody() != null) {
                        sb.append("HTTP Body:  ").append(
                                truncate(step.getHttpCallLog().getResponseBody(), 500)).append("\n");
                    }
                }
                sb.append("\n");
            }
        }

        if (!stepExecutions.isEmpty()) {
            sb.append("=== ALL STEPS ===\n");
            for (StepExecution step : stepExecutions) {
                sb.append("  ").append(step.getStepName())
                  .append(" [").append(step.getStepType()).append("]")
                  .append(" → ").append(step.getStatus());
                if (step.getErrorMessage() != null) {
                    sb.append(": ").append(truncate(step.getErrorMessage(), 120));
                }
                sb.append("\n");
            }
        }

        sb.append("\n=== REQUIRED JSON RESPONSE FORMAT ===\n");
        sb.append("{\n");
        sb.append("  \"summary\": \"One paragraph explaining what happened in this execution\",\n");
        sb.append("  \"rootCause\": \"The specific technical reason the workflow failed\",\n");
        sb.append("  \"suggestions\": [\n");
        sb.append("    \"First concrete action the user can take to fix this\",\n");
        sb.append("    \"Second action if applicable\",\n");
        sb.append("    \"Third action if applicable\"\n");
        sb.append("  ]\n");
        sb.append("}\n");

        return sb.toString();
    }

    private String truncateJson(Map<String, Object> map) {
        try {
            return truncate(objectMapper.writeValueAsString(map), MAX_JSON_CHARS);
        } catch (Exception e) {
            return map.toString();
        }
    }

    private static String truncate(String s, int maxChars) {
        if (s == null) return "";
        return s.length() <= maxChars ? s : s.substring(0, maxChars) + "...[truncated]";
    }
}
