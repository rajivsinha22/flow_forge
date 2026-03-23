package com.flowforge.execution.dto;

import com.flowforge.execution.model.StepExecution;
import com.flowforge.execution.model.WorkflowDefinitionSnapshot;
import com.flowforge.execution.model.WorkflowExecution;

import java.util.List;
import java.util.Map;

/**
 * Full execution trace response - used by the execution history UI.
 * Includes the workflow definition (for rendering the DAG) and all step details with HTTP logs.
 */
public class ExecutionTraceDto {

    private WorkflowExecution execution;
    private List<StepExecution> stepExecutions;
    private WorkflowDefinitionSnapshot workflowDefinition; // for DAG rendering
    private Map<String, Object> executionContext; // final resolved context
    private ExecutionStats stats;

    public ExecutionTraceDto() {}

    public static class ExecutionStats {
        private int totalSteps;
        private int successSteps;
        private int failedSteps;
        private int skippedSteps;
        private int pendingSteps;
        private int waitingSteps;
        private long totalDurationMs;
        private int totalHttpCalls;
        private int failedHttpCalls;

        public ExecutionStats() {}

        public int getTotalSteps() { return totalSteps; }
        public void setTotalSteps(int totalSteps) { this.totalSteps = totalSteps; }

        public int getSuccessSteps() { return successSteps; }
        public void setSuccessSteps(int successSteps) { this.successSteps = successSteps; }

        public int getFailedSteps() { return failedSteps; }
        public void setFailedSteps(int failedSteps) { this.failedSteps = failedSteps; }

        public int getSkippedSteps() { return skippedSteps; }
        public void setSkippedSteps(int skippedSteps) { this.skippedSteps = skippedSteps; }

        public int getPendingSteps() { return pendingSteps; }
        public void setPendingSteps(int pendingSteps) { this.pendingSteps = pendingSteps; }

        public int getWaitingSteps() { return waitingSteps; }
        public void setWaitingSteps(int waitingSteps) { this.waitingSteps = waitingSteps; }

        public long getTotalDurationMs() { return totalDurationMs; }
        public void setTotalDurationMs(long totalDurationMs) { this.totalDurationMs = totalDurationMs; }

        public int getTotalHttpCalls() { return totalHttpCalls; }
        public void setTotalHttpCalls(int totalHttpCalls) { this.totalHttpCalls = totalHttpCalls; }

        public int getFailedHttpCalls() { return failedHttpCalls; }
        public void setFailedHttpCalls(int failedHttpCalls) { this.failedHttpCalls = failedHttpCalls; }
    }

    public WorkflowExecution getExecution() { return execution; }
    public void setExecution(WorkflowExecution execution) { this.execution = execution; }

    public List<StepExecution> getStepExecutions() { return stepExecutions; }
    public void setStepExecutions(List<StepExecution> stepExecutions) { this.stepExecutions = stepExecutions; }

    public WorkflowDefinitionSnapshot getWorkflowDefinition() { return workflowDefinition; }
    public void setWorkflowDefinition(WorkflowDefinitionSnapshot workflowDefinition) { this.workflowDefinition = workflowDefinition; }

    public Map<String, Object> getExecutionContext() { return executionContext; }
    public void setExecutionContext(Map<String, Object> executionContext) { this.executionContext = executionContext; }

    public ExecutionStats getStats() { return stats; }
    public void setStats(ExecutionStats stats) { this.stats = stats; }

    public static Builder builder() { return new Builder(); }

    public static class Builder {
        private WorkflowExecution execution;
        private List<StepExecution> stepExecutions;
        private WorkflowDefinitionSnapshot workflowDefinition;
        private Map<String, Object> executionContext;
        private ExecutionStats stats;

        public Builder execution(WorkflowExecution e) { this.execution = e; return this; }
        public Builder stepExecutions(List<StepExecution> s) { this.stepExecutions = s; return this; }
        public Builder workflowDefinition(WorkflowDefinitionSnapshot w) { this.workflowDefinition = w; return this; }
        public Builder executionContext(Map<String, Object> c) { this.executionContext = c; return this; }
        public Builder stats(ExecutionStats s) { this.stats = s; return this; }

        public ExecutionTraceDto build() {
            ExecutionTraceDto dto = new ExecutionTraceDto();
            dto.execution = execution;
            dto.stepExecutions = stepExecutions;
            dto.workflowDefinition = workflowDefinition;
            dto.executionContext = executionContext;
            dto.stats = stats;
            return dto;
        }
    }
}
