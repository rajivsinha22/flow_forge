package com.flowforge.execution.dto;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

public class OptimizationResult {

    private String workflowId;
    private int sampleSize;
    private Instant analyzedAt;
    private List<OptimizationSuggestion> suggestions = new ArrayList<>();
    private String summary;

    public OptimizationResult() {
    }

    public OptimizationResult(String workflowId, int sampleSize, Instant analyzedAt,
                              List<OptimizationSuggestion> suggestions, String summary) {
        this.workflowId = workflowId;
        this.sampleSize = sampleSize;
        this.analyzedAt = analyzedAt;
        this.suggestions = suggestions != null ? suggestions : new ArrayList<>();
        this.summary = summary;
    }

    public String getWorkflowId() { return workflowId; }
    public void setWorkflowId(String workflowId) { this.workflowId = workflowId; }

    public int getSampleSize() { return sampleSize; }
    public void setSampleSize(int sampleSize) { this.sampleSize = sampleSize; }

    public Instant getAnalyzedAt() { return analyzedAt; }
    public void setAnalyzedAt(Instant analyzedAt) { this.analyzedAt = analyzedAt; }

    public List<OptimizationSuggestion> getSuggestions() {
        if (suggestions == null) suggestions = new ArrayList<>();
        return suggestions;
    }
    public void setSuggestions(List<OptimizationSuggestion> suggestions) { this.suggestions = suggestions; }

    public String getSummary() { return summary; }
    public void setSummary(String summary) { this.summary = summary; }
}
