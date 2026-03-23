package com.flowforge.execution.executor;

import com.flowforge.execution.engine.ExecutionContext;
import com.flowforge.execution.engine.StepExecutionResult;
import com.flowforge.execution.model.StepDef;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;

/**
 * Triggers a child workflow execution and waits for its completion.
 * In this synchronous implementation, it invokes the orchestrator recursively.
 */
@Component
public class SubWorkflowExecutor implements StepExecutor {

    private static final Logger log = LoggerFactory.getLogger(SubWorkflowExecutor.class);

    private static final String TYPE = "SUB_WORKFLOW";

    // Lazy injection to avoid circular dependency — set by WorkflowOrchestrator
    private volatile com.flowforge.execution.engine.WorkflowOrchestrator orchestrator;

    public void setOrchestrator(com.flowforge.execution.engine.WorkflowOrchestrator orchestrator) {
        this.orchestrator = orchestrator;
    }

    @Override
    public String getType() {
        return TYPE;
    }

    @Override
    public StepExecutionResult execute(StepDef step, ExecutionContext context) {
        Map<String, Object> config = step.getConfig();
        if (config == null || !config.containsKey("workflowName")) {
            return StepExecutionResult.builder()
                    .success(false)
                    .errorMessage("SUB_WORKFLOW step '" + step.getStepId() + "' requires 'workflowName' in config")
                    .build();
        }

        String workflowName = (String) config.get("workflowName");
        @SuppressWarnings("unchecked")
        Map<String, Object> subInput = config.containsKey("input")
                ? (Map<String, Object>) config.get("input")
                : new HashMap<>();

        log.info("Triggering sub-workflow '{}' from step '{}' in execution '{}'",
                workflowName, step.getStepId(), context.getExecutionId());

        try {
            if (orchestrator == null) {
                return StepExecutionResult.builder()
                        .success(false)
                        .errorMessage("WorkflowOrchestrator not available for SUB_WORKFLOW step")
                        .build();
            }

            com.flowforge.execution.model.WorkflowExecution childExecution =
                    orchestrator.startExecutionByName(
                            context.getClientId(),
                            workflowName,
                            subInput,
                            "sub-workflow:" + context.getExecutionId(),
                            "SUB_WORKFLOW"
                    );

            Map<String, Object> output = new HashMap<>();
            output.put("childExecutionId", childExecution.getId());
            output.put("childStatus", childExecution.getStatus());
            output.put("childOutput", childExecution.getStepOutputs());

            boolean success = "SUCCESS".equals(childExecution.getStatus());

            return StepExecutionResult.builder()
                    .success(success)
                    .output(output)
                    .errorMessage(success ? null : "Sub-workflow failed: " + childExecution.getErrorMessage())
                    .build();

        } catch (Exception e) {
            log.error("SUB_WORKFLOW step '{}' failed: {}", step.getStepId(), e.getMessage(), e);
            return StepExecutionResult.builder()
                    .success(false)
                    .errorMessage("Sub-workflow execution failed: " + e.getMessage())
                    .build();
        }
    }
}
