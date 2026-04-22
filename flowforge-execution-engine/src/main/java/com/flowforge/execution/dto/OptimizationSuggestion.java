package com.flowforge.execution.dto;

public class OptimizationSuggestion {

    private String type;      // RETRY_TUNING, TIMEOUT_TUNING, PARALLELIZATION, DEAD_BRANCH, RATE_LIMIT_RISK, SCHEMA_MISMATCH
    private String severity;  // INFO, WARN, CRITICAL
    private String stepId;
    private String description;
    private String rationale;

    public OptimizationSuggestion() {
    }

    public OptimizationSuggestion(String type, String severity, String stepId,
                                  String description, String rationale) {
        this.type = type;
        this.severity = severity;
        this.stepId = stepId;
        this.description = description;
        this.rationale = rationale;
    }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public String getSeverity() { return severity; }
    public void setSeverity(String severity) { this.severity = severity; }

    public String getStepId() { return stepId; }
    public void setStepId(String stepId) { this.stepId = stepId; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getRationale() { return rationale; }
    public void setRationale(String rationale) { this.rationale = rationale; }
}
