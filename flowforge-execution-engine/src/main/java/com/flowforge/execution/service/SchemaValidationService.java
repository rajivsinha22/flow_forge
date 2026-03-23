package com.flowforge.execution.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.networknt.schema.JsonSchema;
import com.networknt.schema.JsonSchemaFactory;
import com.networknt.schema.SpecVersion;
import com.networknt.schema.ValidationMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Validates an arbitrary payload (Map&lt;String, Object&gt;) against a JSON Schema Draft-07 string.
 *
 * <p>Used by {@link com.flowforge.execution.engine.WorkflowOrchestrator} to enforce input
 * contracts before starting execution, and optionally to validate output after completion.
 */
@Service
public class SchemaValidationService {

    private static final Logger log = LoggerFactory.getLogger(SchemaValidationService.class);

    private final ObjectMapper objectMapper;
    private final JsonSchemaFactory schemaFactory =
            JsonSchemaFactory.getInstance(SpecVersion.VersionFlag.V7);

    public SchemaValidationService(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    /**
     * Validates the given payload against the JSON Schema Draft-07 string.
     *
     * @param schemaJson JSON Schema as a raw string
     * @param payload    the payload to validate
     * @return an empty list when valid; otherwise a list of human-readable error messages
     */
    public List<String> validate(String schemaJson, Map<String, Object> payload) {
        if (schemaJson == null || schemaJson.isBlank()) {
            return Collections.emptyList();
        }
        try {
            JsonSchema schema = schemaFactory.getSchema(schemaJson);
            JsonNode inputNode = objectMapper.valueToTree(
                    payload != null ? payload : Collections.emptyMap());
            Set<ValidationMessage> errors = schema.validate(inputNode);
            return errors.stream()
                    .map(ValidationMessage::getMessage)
                    .sorted()
                    .collect(Collectors.toList());
        } catch (Exception e) {
            log.error("Schema validation runtime error: {}", e.getMessage(), e);
            return List.of("Schema validation failed unexpectedly: " + e.getMessage());
        }
    }

    /**
     * Convenience method — returns {@code true} when the payload is valid.
     */
    public boolean isValid(String schemaJson, Map<String, Object> payload) {
        return validate(schemaJson, payload).isEmpty();
    }

    /**
     * Applies a simple {@code {{stepId.field}}} template to build an output map.
     *
     * <p>Each value in the template is inspected for {@code {{…}}} tokens.  If the token
     * resolves to a step output value it is substituted; otherwise the token is left as-is.
     *
     * @param template   output-mapping template (key → "{{stepId.field}}")
     * @param stepOutputs map of stepId → output map produced during execution
     * @return the resolved output map
     */
    @SuppressWarnings("unchecked")
    public Map<String, Object> applyOutputMapping(
            Map<String, Object> template, Map<String, Object> stepOutputs) {

        if (template == null || template.isEmpty()) return Collections.emptyMap();

        java.util.LinkedHashMap<String, Object> result = new java.util.LinkedHashMap<>();
        for (Map.Entry<String, Object> entry : template.entrySet()) {
            Object value = entry.getValue();
            if (value instanceof String) {
                result.put(entry.getKey(), resolveTemplate((String) value, stepOutputs));
            } else {
                result.put(entry.getKey(), value);
            }
        }
        return result;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Private helpers
    // ─────────────────────────────────────────────────────────────────────────

    private static final java.util.regex.Pattern TEMPLATE_PATTERN =
            java.util.regex.Pattern.compile("\\{\\{([^}]+)}}");

    @SuppressWarnings("unchecked")
    private Object resolveTemplate(String template, Map<String, Object> stepOutputs) {
        java.util.regex.Matcher matcher = TEMPLATE_PATTERN.matcher(template);
        if (!matcher.find()) return template;

        // Single token — return the raw value (preserves types like numbers, booleans)
        if (template.trim().startsWith("{{") && template.trim().endsWith("}}")) {
            String expression = matcher.group(1).trim(); // e.g. "step1.data.id"
            return resolveExpression(expression, stepOutputs);
        }

        // Multi-token string interpolation
        matcher.reset();
        StringBuffer sb = new StringBuffer();
        while (matcher.find()) {
            Object resolved = resolveExpression(matcher.group(1).trim(), stepOutputs);
            matcher.appendReplacement(sb, java.util.regex.Matcher.quoteReplacement(
                    resolved != null ? resolved.toString() : ""));
        }
        matcher.appendTail(sb);
        return sb.toString();
    }

    @SuppressWarnings("unchecked")
    private Object resolveExpression(String expression, Map<String, Object> stepOutputs) {
        // expression: "stepId.field.subfield"
        String[] parts = expression.split("\\.", 2);
        String stepId = parts[0];
        Object stepOutput = stepOutputs.get(stepId);
        if (stepOutput == null) return null;
        if (parts.length == 1) return stepOutput;
        // Traverse nested path
        return traverse(stepOutput, parts[1]);
    }

    @SuppressWarnings("unchecked")
    private Object traverse(Object node, String path) {
        if (node == null || path == null || path.isBlank()) return node;
        String[] parts = path.split("\\.", 2);
        if (node instanceof Map) {
            Object child = ((Map<String, Object>) node).get(parts[0]);
            return parts.length == 1 ? child : traverse(child, parts[1]);
        }
        return null;
    }
}
