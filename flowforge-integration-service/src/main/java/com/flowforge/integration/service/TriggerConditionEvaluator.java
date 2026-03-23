package com.flowforge.integration.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.flowforge.integration.model.TriggerCondition;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.expression.Expression;
import org.springframework.expression.ExpressionParser;
import org.springframework.expression.spel.standard.SpelExpressionParser;
import org.springframework.expression.spel.support.StandardEvaluationContext;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

@Component
public class TriggerConditionEvaluator {

    private static final Logger log = LoggerFactory.getLogger(TriggerConditionEvaluator.class);
    private final ExpressionParser spelParser = new SpelExpressionParser();
    private final ObjectMapper objectMapper;

    public TriggerConditionEvaluator(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    /**
     * Evaluate a condition against a JSON event payload.
     * Returns true if the event satisfies the condition.
     */
    public boolean evaluate(TriggerCondition condition, JsonNode event) {
        if (condition == null) return true;
        String type = condition.getConditionType();
        if (type == null || "ALWAYS".equals(type)) return true;

        try {
            switch (type) {
                case "FIELD_EXISTS":
                    return !resolveField(event, condition.getFieldPath()).isMissingNode()
                            && !resolveField(event, condition.getFieldPath()).isNull();

                case "FIELD_NOT_EXISTS":
                    JsonNode fn = resolveField(event, condition.getFieldPath());
                    return fn.isMissingNode() || fn.isNull();

                case "FIELD_EQUALS":
                    return condition.getExpectedValue() != null &&
                            condition.getExpectedValue().equals(resolveField(event, condition.getFieldPath()).asText());

                case "FIELD_NOT_EQUALS":
                    return condition.getExpectedValue() != null &&
                            !condition.getExpectedValue().equals(resolveField(event, condition.getFieldPath()).asText());

                case "FIELD_CONTAINS":
                    String containsVal = resolveField(event, condition.getFieldPath()).asText("");
                    return condition.getExpectedValue() != null && containsVal.contains(condition.getExpectedValue());

                case "FIELD_MATCHES":
                    String matchVal = resolveField(event, condition.getFieldPath()).asText("");
                    return condition.getExpectedValue() != null && matchVal.matches(condition.getExpectedValue());

                case "FIELD_GT":
                    JsonNode gtNode = resolveField(event, condition.getFieldPath());
                    if (gtNode.isNumber() && condition.getExpectedValue() != null) {
                        return gtNode.doubleValue() > Double.parseDouble(condition.getExpectedValue());
                    }
                    return false;

                case "FIELD_LT":
                    JsonNode ltNode = resolveField(event, condition.getFieldPath());
                    if (ltNode.isNumber() && condition.getExpectedValue() != null) {
                        return ltNode.doubleValue() < Double.parseDouble(condition.getExpectedValue());
                    }
                    return false;

                case "SPEL_EXPRESSION":
                    if (condition.getSpelExpression() == null) return true;
                    StandardEvaluationContext ctx = new StandardEvaluationContext();
                    ctx.setVariable("event", objectMapper.convertValue(event, Map.class));
                    Expression expr = spelParser.parseExpression(condition.getSpelExpression());
                    Boolean result = expr.getValue(ctx, Boolean.class);
                    return Boolean.TRUE.equals(result);

                case "AND":
                    List<TriggerCondition> andList = condition.getNestedConditions();
                    if (andList == null || andList.isEmpty()) return true;
                    return andList.stream().allMatch(c -> evaluate(c, event));

                case "OR":
                    List<TriggerCondition> orList = condition.getNestedConditions();
                    if (orList == null || orList.isEmpty()) return false;
                    return orList.stream().anyMatch(c -> evaluate(c, event));

                case "NOT":
                    List<TriggerCondition> notList = condition.getNestedConditions();
                    if (notList == null || notList.isEmpty()) return true;
                    return !evaluate(notList.get(0), event);

                default:
                    log.warn("Unknown condition type: {}", type);
                    return true;
            }
        } catch (Exception e) {
            log.warn("Condition evaluation error (type={}, field={}): {}", type, condition.getFieldPath(), e.getMessage());
            return false;
        }
    }

    /**
     * Resolve a field from a JsonNode using dot notation ("data.order.status")
     * or JSON Pointer ("/data/order/status").
     */
    private JsonNode resolveField(JsonNode node, String path) {
        if (path == null || path.isBlank()) return com.fasterxml.jackson.databind.node.MissingNode.getInstance();
        if (path.startsWith("/")) {
            return node.at(path);
        }
        // Dot notation → convert to JSON Pointer
        String pointer = "/" + path.replace(".", "/");
        return node.at(pointer);
    }
}
