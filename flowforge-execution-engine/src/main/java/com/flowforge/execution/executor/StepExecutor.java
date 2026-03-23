package com.flowforge.execution.executor;

import com.flowforge.execution.engine.ExecutionContext;
import com.flowforge.execution.engine.StepExecutionResult;
import com.flowforge.execution.model.StepDef;

/**
 * Strategy interface for step execution.
 * Each implementation handles a specific step type.
 */
public interface StepExecutor {

    /**
     * Returns the step type this executor handles (e.g., "HTTP", "CONDITION").
     */
    String getType();

    /**
     * Execute the step and return the result.
     *
     * @param step    the step definition containing config and routing
     * @param context the current execution context with input, variables, and prior step outputs
     * @return the step execution result
     */
    StepExecutionResult execute(StepDef step, ExecutionContext context);
}
