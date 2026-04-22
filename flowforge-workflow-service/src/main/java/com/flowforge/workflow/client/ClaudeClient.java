package com.flowforge.workflow.client;

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

@Component
public class ClaudeClient {

    private static final Logger log = LoggerFactory.getLogger(ClaudeClient.class);

    private static final String ANTHROPIC_BASE_URL = "https://api.anthropic.com";
    private static final String MESSAGES_PATH = "/v1/messages";
    private static final int TIMEOUT_SECONDS = 45;

    @Value("${flowforge.anthropic.api-key:dummy-key-for-dev}")
    private String anthropicApiKey;

    @Value("${flowforge.anthropic.api-version:2023-06-01}")
    private String anthropicApiVersion;

    private final WebClient webClient;
    private final ObjectMapper objectMapper;

    public ClaudeClient(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
        this.webClient = WebClient.builder()
                .baseUrl(ANTHROPIC_BASE_URL)
                .codecs(configurer -> configurer.defaultCodecs().maxInMemorySize(10 * 1024 * 1024))
                .build();
    }

    public String call(String systemPrompt, String userPrompt, String model, int maxTokens, double temperature) {
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

            log.debug("Calling Claude model={} maxTokens={} temperature={}", model, maxTokens, temperature);

            String rawResponse = webClient
                    .post()
                    .uri(MESSAGES_PATH)
                    .header("x-api-key", anthropicApiKey)
                    .header("anthropic-version", anthropicApiVersion)
                    .header("content-type", "application/json")
                    .bodyValue(requestJson)
                    .retrieve()
                    .bodyToMono(String.class)
                    .timeout(Duration.ofSeconds(TIMEOUT_SECONDS))
                    .block();

            JsonNode responseNode = objectMapper.readTree(rawResponse);
            String text = responseNode.path("content").path(0).path("text").asText("");
            return text == null ? "" : text.trim();
        } catch (Exception e) {
            log.error("Claude call failed: {}", e.getMessage(), e);
            throw new RuntimeException("Claude API call failed: " + e.getMessage(), e);
        }
    }
}
