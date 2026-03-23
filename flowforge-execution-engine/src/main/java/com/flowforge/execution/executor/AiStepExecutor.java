package com.flowforge.execution.executor;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.flowforge.execution.engine.ContextResolver;
import com.flowforge.execution.engine.ExecutionContext;
import com.flowforge.execution.engine.StepExecutionResult;
import com.flowforge.execution.model.StepDef;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import java.time.Duration;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * AiStepExecutor
 *
 * Executes an AI_CALL step by sending a prompt to the Anthropic Claude API
 * and returning the model's text response as step output.
 *
 * Config fields (from StepDef.config):
 *   model         (String)  — Claude model ID, default: claude-haiku-4-5-20251001
 *   systemPrompt  (String)  — Optional system message. Supports ${...} interpolation.
 *   userPrompt    (String)  — Required. The user message. Supports ${...} interpolation.
 *   maxTokens     (Number)  — Max output tokens, default: 1024
 *   temperature   (Number)  — Sampling temperature 0.0–1.0, default: 0.7
 *
 * Step output:
 *   { text, model, inputTokens, outputTokens, stopReason }
 *
 * Prompt interpolation uses the existing ContextResolver:
 *   ${input.field}                  — workflow input field
 *   ${steps.stepId.output.field}    — previous step output
 *   ${variables.name}               — workflow variable
 *   ${env.VAR_NAME}                 — environment variable
 */
@Component
public class AiStepExecutor implements StepExecutor {

    private static final Logger log = LoggerFactory.getLogger(AiStepExecutor.class);

    private static final String TYPE = "AI_CALL";
    private static final String DEFAULT_MODEL = "claude-haiku-4-5-20251001";
    private static final int DEFAULT_MAX_TOKENS = 1024;
    private static final double DEFAULT_TEMPERATURE = 0.7;
    private static final int TIMEOUT_SECONDS = 60;
    private static final String ANTHROPIC_MESSAGES_URL = "https://api.anthropic.com/v1/messages";

    @Value("${flowforge.anthropic.api-key}")
    private String anthropicApiKey;

    @Value("${flowforge.anthropic.api-version:2023-06-01}")
    private String anthropicApiVersion;

    private final WebClient webClient;
    private final ContextResolver contextResolver;
    private final ObjectMapper objectMapper;

    public AiStepExecutor(WebClient webClient, ContextResolver contextResolver, ObjectMapper objectMapper) {
        this.webClient = webClient;
        this.contextResolver = contextResolver;
        this.objectMapper = objectMapper;
    }

    @Override
    public String getType() {
        return TYPE;
    }

    @Override
    @SuppressWarnings("unchecked")
    public StepExecutionResult execute(StepDef step, ExecutionContext context) {
        Map<String, Object> config = step.getConfig();
        if (config == null) {
            return StepExecutionResult.builder()
                    .success(false)
                    .errorMessage("AI_CALL step '" + step.getStepId() + "' has no config")
                    .build();
        }

        // ── Extract and resolve config fields ─────────────────────────────────
        String model = config.containsKey("model")
                ? String.valueOf(config.get("model"))
                : DEFAULT_MODEL;

        String rawUserPrompt = config.containsKey("userPrompt")
                ? String.valueOf(config.get("userPrompt"))
                : null;

        if (rawUserPrompt == null || rawUserPrompt.isBlank()) {
            return StepExecutionResult.builder()
                    .success(false)
                    .errorMessage("AI_CALL step '" + step.getStepId() + "': userPrompt is required")
                    .build();
        }

        String resolvedUserPrompt = contextResolver.resolve(rawUserPrompt, context);

        String rawSystemPrompt = config.containsKey("systemPrompt")
                ? String.valueOf(config.get("systemPrompt"))
                : null;
        String resolvedSystemPrompt = (rawSystemPrompt != null && !rawSystemPrompt.isBlank())
                ? contextResolver.resolve(rawSystemPrompt, context)
                : null;

        int maxTokens = config.containsKey("maxTokens")
                ? ((Number) config.get("maxTokens")).intValue()
                : DEFAULT_MAX_TOKENS;

        double temperature = config.containsKey("temperature")
                ? ((Number) config.get("temperature")).doubleValue()
                : DEFAULT_TEMPERATURE;

        // ── Build audit resolvedConfig ─────────────────────────────────────────
        Map<String, Object> resolvedConfig = new HashMap<>();
        resolvedConfig.put("model", model);
        resolvedConfig.put("userPrompt", resolvedUserPrompt);
        if (resolvedSystemPrompt != null) {
            resolvedConfig.put("systemPrompt", resolvedSystemPrompt);
        }
        resolvedConfig.put("maxTokens", maxTokens);
        resolvedConfig.put("temperature", temperature);

        log.debug("Executing AI_CALL step '{}' with model={}, maxTokens={}", step.getStepId(), model, maxTokens);

        // ── Build Anthropic request body ───────────────────────────────────────
        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("model", model);
        requestBody.put("max_tokens", maxTokens);
        requestBody.put("temperature", temperature);

        Map<String, String> userMessage = new HashMap<>();
        userMessage.put("role", "user");
        userMessage.put("content", resolvedUserPrompt);
        List<Map<String, String>> messages = new ArrayList<>();
        messages.add(userMessage);
        requestBody.put("messages", messages);

        // Anthropic rejects empty string for system — only include if non-blank
        if (resolvedSystemPrompt != null) {
            requestBody.put("system", resolvedSystemPrompt);
        }

        long start = System.currentTimeMillis();

        try {
            String requestJson = objectMapper.writeValueAsString(requestBody);

            String rawResponse = webClient
                    .post()
                    .uri(ANTHROPIC_MESSAGES_URL)
                    .header("x-api-key", anthropicApiKey)
                    .header("anthropic-version", anthropicApiVersion)
                    .header("content-type", "application/json")
                    .bodyValue(requestJson)
                    .retrieve()
                    .bodyToMono(String.class)
                    .timeout(Duration.ofSeconds(TIMEOUT_SECONDS))
                    .block();

            long durationMs = System.currentTimeMillis() - start;

            // ── Parse Anthropic response ───────────────────────────────────────
            JsonNode responseNode = objectMapper.readTree(rawResponse);

            String responseText = responseNode
                    .path("content").path(0).path("text").asText("");

            String responseModel = responseNode.path("model").asText(model);
            String stopReason   = responseNode.path("stop_reason").asText("end_turn");
            int inputTokens     = responseNode.path("usage").path("input_tokens").asInt(0);
            int outputTokens    = responseNode.path("usage").path("output_tokens").asInt(0);

            Map<String, Object> output = new HashMap<>();
            output.put("text",         responseText);
            output.put("model",        responseModel);
            output.put("inputTokens",  inputTokens);
            output.put("outputTokens", outputTokens);
            output.put("stopReason",   stopReason);
            output.put("durationMs",   durationMs);

            log.debug("AI_CALL step '{}' succeeded: model={}, in={} out={} tokens, {}ms",
                    step.getStepId(), responseModel, inputTokens, outputTokens, durationMs);

            return StepExecutionResult.builder()
                    .success(true)
                    .output(output)
                    .resolvedConfig(resolvedConfig)
                    .build();

        } catch (WebClientResponseException e) {
            long durationMs = System.currentTimeMillis() - start;
            String anthropicError = e.getResponseBodyAsString();
            log.warn("AI_CALL step '{}' failed — Anthropic returned HTTP {}: {}",
                    step.getStepId(), e.getStatusCode().value(), anthropicError);

            String errorMessage = "Anthropic API error " + e.getStatusCode().value()
                    + ": " + anthropicError;

            return StepExecutionResult.builder()
                    .success(false)
                    .errorMessage(errorMessage)
                    .resolvedConfig(resolvedConfig)
                    .build();

        } catch (Exception e) {
            long durationMs = System.currentTimeMillis() - start;
            log.error("AI_CALL step '{}' threw exception after {}ms: {}",
                    step.getStepId(), durationMs, e.getMessage(), e);

            return StepExecutionResult.builder()
                    .success(false)
                    .errorMessage("AI_CALL step failed: " + e.getMessage())
                    .resolvedConfig(resolvedConfig)
                    .build();
        }
    }
}
