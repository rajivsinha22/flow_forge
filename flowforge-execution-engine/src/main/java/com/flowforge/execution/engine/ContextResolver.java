package com.flowforge.execution.engine;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Resolves placeholder expressions in step configs.
 *
 * Supported patterns:
 *   ${env.VAR_NAME}           - environment variable
 *   ${input.field}            - top-level field in execution input
 *   ${input.nested.field}     - nested field access using dot notation
 *   ${steps.stepId.output.field} - output of a previous step
 *   ${variables.varName}      - workflow-level variables
 */
@Component
public class ContextResolver {

    private static final Logger log = LoggerFactory.getLogger(ContextResolver.class);

    private static final Pattern PLACEHOLDER_PATTERN = Pattern.compile("\\$\\{([^}]+)}");

    /**
     * Resolve all placeholders in the given template string.
     */
    public String resolve(String template, ExecutionContext context) {
        if (template == null || !template.contains("${")) {
            return template;
        }

        Matcher matcher = PLACEHOLDER_PATTERN.matcher(template);
        StringBuffer sb = new StringBuffer();
        while (matcher.find()) {
            String expression = matcher.group(1);
            String resolved = resolveExpression(expression, context);
            matcher.appendReplacement(sb, Matcher.quoteReplacement(resolved != null ? resolved : matcher.group(0)));
        }
        matcher.appendTail(sb);
        return sb.toString();
    }

    /**
     * Resolve a single expression like "env.VAR_NAME", "input.field", "steps.stepId.output.field".
     */
    public String resolveExpression(String expression, ExecutionContext context) {
        if (expression == null) {
            return null;
        }

        String[] parts = expression.split("\\.", 2);
        if (parts.length < 2) {
            log.warn("Cannot resolve expression without namespace: {}", expression);
            return null;
        }

        String namespace = parts[0];
        String path = parts[1];

        return switch (namespace) {
            case "env" -> resolveEnvVar(path, context);
            case "input" -> resolveNestedValue(context.getInput(), path);
            case "variables" -> resolveNestedValue(context.getVariables() != null
                    ? (Map<String, Object>) (Map<?, ?>) context.getVariables()
                    : null, path);
            case "steps" -> resolveStepOutput(path, context);
            default -> {
                log.warn("Unknown namespace in expression: {}", expression);
                yield null;
            }
        };
    }

    private String resolveEnvVar(String varName, ExecutionContext context) {
        if (context.getEnvVars() != null && context.getEnvVars().containsKey(varName)) {
            return context.getEnvVars().get(varName);
        }
        // Fallback to system environment
        String envValue = System.getenv(varName);
        if (envValue != null) {
            return envValue;
        }
        log.debug("Environment variable not found: {}", varName);
        return null;
    }

    /**
     * Resolve step output: "steps.stepId.output.field"
     * The path after "steps." is "stepId.output.field", so we split on "."
     */
    private String resolveStepOutput(String path, ExecutionContext context) {
        String[] parts = path.split("\\.", 3);
        if (parts.length < 3) {
            log.warn("Invalid step output path, expected steps.stepId.output.field but got: steps.{}", path);
            return null;
        }
        String stepId = parts[0];
        // parts[1] should be "output"
        String fieldPath = parts[2];

        if (context.getStepOutputs() == null) {
            return null;
        }

        Object stepOutput = context.getStepOutputs().get(stepId);
        if (stepOutput instanceof Map) {
            @SuppressWarnings("unchecked")
            Map<String, Object> outputMap = (Map<String, Object>) stepOutput;
            return resolveNestedValue(outputMap, fieldPath);
        }
        return stepOutput != null ? stepOutput.toString() : null;
    }

    @SuppressWarnings("unchecked")
    private String resolveNestedValue(Map<String, Object> map, String path) {
        if (map == null || path == null) {
            return null;
        }

        String[] keys = path.split("\\.", 2);
        Object value = map.get(keys[0]);

        if (value == null) {
            return null;
        }
        if (keys.length == 1) {
            return value.toString();
        }
        if (value instanceof Map) {
            return resolveNestedValue((Map<String, Object>) value, keys[1]);
        }
        return null;
    }

    /**
     * Resolve an object value (not just String) from context — used for passing objects to executors.
     */
    @SuppressWarnings("unchecked")
    public Object resolveObject(String expression, ExecutionContext context) {
        if (expression == null) {
            return null;
        }
        String[] parts = expression.split("\\.", 2);
        if (parts.length < 2) {
            return null;
        }
        String namespace = parts[0];
        String path = parts[1];

        return switch (namespace) {
            case "env" -> resolveEnvVar(path, context);
            case "input" -> resolveNestedObject(context.getInput(), path);
            case "steps" -> {
                String[] stepParts = path.split("\\.", 3);
                if (stepParts.length < 3) yield null;
                Object stepOutput = context.getStepOutputs() != null ? context.getStepOutputs().get(stepParts[0]) : null;
                if (stepOutput instanceof Map) {
                    yield resolveNestedObject((Map<String, Object>) stepOutput, stepParts[2]);
                }
                yield stepOutput;
            }
            default -> null;
        };
    }

    @SuppressWarnings("unchecked")
    private Object resolveNestedObject(Map<String, Object> map, String path) {
        if (map == null || path == null) {
            return null;
        }
        String[] keys = path.split("\\.", 2);
        Object value = map.get(keys[0]);
        if (value == null || keys.length == 1) {
            return value;
        }
        if (value instanceof Map) {
            return resolveNestedObject((Map<String, Object>) value, keys[1]);
        }
        return null;
    }
}
