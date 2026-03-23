package com.flowforge.execution.executor;

import com.flowforge.execution.engine.ContextResolver;
import com.flowforge.execution.engine.ExecutionContext;
import com.flowforge.execution.engine.StepExecutionResult;
import com.flowforge.execution.model.StepDef;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.expression.EvaluationContext;
import org.springframework.expression.Expression;
import org.springframework.expression.ExpressionParser;
import org.springframework.expression.spel.standard.SpelExpressionParser;
import org.springframework.expression.spel.support.StandardEvaluationContext;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;

/**
 * Evaluates a SpEL expression from the step config's "expression" field.
 * Returns a branch label (true/false or a custom label from "trueBranch"/"falseBranch" config).
 */
@Component
public class ConditionStepExecutor implements StepExecutor {

    private static final Logger log = LoggerFactory.getLogger(ConditionStepExecutor.class);

    private static final String TYPE = "CONDITION";

    private final ContextResolver contextResolver;
    private final ExpressionParser spelParser = new SpelExpressionParser();

    public ConditionStepExecutor(ContextResolver contextResolver) {
        this.contextResolver = contextResolver;
    }

    @Override
    public String getType() {
        return TYPE;
    }

    @Override
    public StepExecutionResult execute(StepDef step, ExecutionContext context) {
        Map<String, Object> config = step.getConfig();
        if (config == null || !config.containsKey("expression")) {
            return StepExecutionResult.builder()
                    .success(false)
                    .errorMessage("CONDITION step '" + step.getStepId() + "' requires 'expression' in config")
                    .build();
        }

        String rawExpression = (String) config.get("expression");
        String resolvedExpression = contextResolver.resolve(rawExpression, context);

        String trueBranch = (String) config.getOrDefault("trueBranch", "true");
        String falseBranch = (String) config.getOrDefault("falseBranch", "false");

        log.debug("Evaluating CONDITION step '{}': expression={}", step.getStepId(), resolvedExpression);

        try {
            EvaluationContext evalContext = buildEvalContext(context);
            Expression expression = spelParser.parseExpression(resolvedExpression);
            Boolean result = expression.getValue(evalContext, Boolean.class);

            boolean conditionResult = Boolean.TRUE.equals(result);
            String branchLabel = conditionResult ? trueBranch : falseBranch;

            log.debug("CONDITION step '{}' evaluated to {} -> branch: {}", step.getStepId(), conditionResult, branchLabel);

            Map<String, Object> output = new HashMap<>();
            output.put("result", conditionResult);
            output.put("branch", branchLabel);

            return StepExecutionResult.builder()
                    .success(true)
                    .output(output)
                    .branchLabel(branchLabel)
                    .build();

        } catch (Exception e) {
            log.error("CONDITION step '{}' expression evaluation failed: {}", step.getStepId(), e.getMessage(), e);
            return StepExecutionResult.builder()
                    .success(false)
                    .errorMessage("Expression evaluation failed: " + e.getMessage())
                    .build();
        }
    }

    private EvaluationContext buildEvalContext(ExecutionContext context) {
        StandardEvaluationContext evalContext = new StandardEvaluationContext();
        if (context.getInput() != null) {
            evalContext.setVariable("input", context.getInput());
        }
        if (context.getVariables() != null) {
            evalContext.setVariable("variables", context.getVariables());
        }
        if (context.getStepOutputs() != null) {
            evalContext.setVariable("steps", context.getStepOutputs());
        }
        if (context.getEnvVars() != null) {
            evalContext.setVariable("env", context.getEnvVars());
        }
        return evalContext;
    }
}
