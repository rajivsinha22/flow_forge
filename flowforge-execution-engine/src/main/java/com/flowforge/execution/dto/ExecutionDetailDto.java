package com.flowforge.execution.dto;

import com.flowforge.execution.model.StepExecution;
import com.flowforge.execution.model.WorkflowExecution;

import java.util.List;
import java.util.Objects;

public class ExecutionDetailDto {

    private WorkflowExecution execution;
    private List<StepExecution> stepExecutions;

    public ExecutionDetailDto() {
    }

    public ExecutionDetailDto(WorkflowExecution execution, List<StepExecution> stepExecutions) {
        this.execution = execution;
        this.stepExecutions = stepExecutions;
    }

    public WorkflowExecution getExecution() { return execution; }
    public void setExecution(WorkflowExecution execution) { this.execution = execution; }

    public List<StepExecution> getStepExecutions() { return stepExecutions; }
    public void setStepExecutions(List<StepExecution> stepExecutions) { this.stepExecutions = stepExecutions; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        ExecutionDetailDto that = (ExecutionDetailDto) o;
        return Objects.equals(execution, that.execution) &&
                Objects.equals(stepExecutions, that.stepExecutions);
    }

    @Override
    public int hashCode() {
        return Objects.hash(execution, stepExecutions);
    }

    @Override
    public String toString() {
        return "ExecutionDetailDto{execution=" + execution + ", stepExecutions=" + stepExecutions + '}';
    }

    public static Builder builder() { return new Builder(); }

    public static class Builder {
        private WorkflowExecution execution;
        private List<StepExecution> stepExecutions;

        public Builder execution(WorkflowExecution execution) { this.execution = execution; return this; }
        public Builder stepExecutions(List<StepExecution> stepExecutions) { this.stepExecutions = stepExecutions; return this; }

        public ExecutionDetailDto build() {
            return new ExecutionDetailDto(execution, stepExecutions);
        }
    }
}
