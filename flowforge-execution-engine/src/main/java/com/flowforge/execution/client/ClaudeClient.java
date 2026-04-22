package com.flowforge.execution.client;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.Duration;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * ClaudeClient
 *
 * Shared HTTP client for calling the Anthropic Claude Messages API.
 */
@Component
public class ClaudeClient {

    private static final Logger log = LoggerFactory.getLogger(ClaudeClient.class);

    private static final String ANTHROPIC_MESSAGES_URL = "https://api.anthropic.com/v1/messages";
    private static final int TIMEOUT_SECONDS = 60;

    @Value("${flowforge.anthropic.api-key}")
    private String anthropicApiKey;

    @Value("${flowforge.anthropic.api-version:2023-06-01}")
    private String anthropicApiVersion;

    private final WebClient webClient;
    private final ObjectMapper objectMapper;

    public ClaudeClient(WebClient webClient, ObjectMapper objectMapper) {
        this.webClient = webClient;
        this.objectMapper = objectMapper;
    }

    /**
     * Simple text completion. Returns the plain-text content of the first content block.
     */
    public String call(String systemPrompt, String userPrompt, String model,
                       int maxTokens, double temperature) {
        try {
            Map<String, Object> userMessage = new HashMap<>();
            userMessage.put("role", "user");
            userMessage.put("content", userPrompt);

            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("model", model);
            requestBody.put("max_tokens", maxTokens);
            requestBody.put("temperature", temperature);
            requestBody.put("messages", List.of(userMessage));
            if (systemPrompt != null && !systemPrompt.isBlank()) {
                requestBody.put("system", systemPrompt);
            }

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

            JsonNode responseNode = objectMapper.readTree(rawResponse);
            return responseNode.path("content").path(0).path("text").asText("");
        } catch (Exception e) {
            log.error("ClaudeClient.call failed: {}", e.getMessage(), e);
            throw new RuntimeException("Claude API call failed: " + e.getMessage(), e);
        }
    }

    /**
     * Full tool-use compatible call. Returns the raw Anthropic response as a Map so
     * the caller can inspect stop_reason, content blocks, tool_use entries, etc.
     */
    @SuppressWarnings("unchecked")
    public Map<String, Object> callWithTools(String systemPrompt,
                                             List<Map<String, Object>> messages,
                                             String model,
                                             int maxTokens,
                                             List<Map<String, Object>> toolSpecs) {
        try {
            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("model", model);
            requestBody.put("max_tokens", maxTokens);
            requestBody.put("messages", messages);
            if (systemPrompt != null && !systemPrompt.isBlank()) {
                requestBody.put("system", systemPrompt);
            }
            if (toolSpecs != null && !toolSpecs.isEmpty()) {
                requestBody.put("tools", toolSpecs);
            }

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

            return objectMapper.readValue(rawResponse, Map.class);
        } catch (Exception e) {
            log.error("ClaudeClient.callWithTools failed: {}", e.getMessage(), e);
            throw new RuntimeException("Claude API call failed: " + e.getMessage(), e);
        }
    }
}
