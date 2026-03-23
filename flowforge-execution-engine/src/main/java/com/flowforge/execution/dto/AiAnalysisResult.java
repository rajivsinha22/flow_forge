package com.flowforge.execution.dto;

import java.util.List;

/**
 * Result of an AI-powered execution failure analysis.
 * Returned by POST /api/v1/executions/{id}/analyze
 */
public class AiAnalysisResult {

    private String summary;
    private String rootCause;
    private List<String> suggestions;

    public AiAnalysisResult() {
    }

    public AiAnalysisResult(String summary, String rootCause, List<String> suggestions) {
        this.summary = summary;
        this.rootCause = rootCause;
        this.suggestions = suggestions;
    }

    public String getSummary() { return summary; }
    public void setSummary(String summary) { this.summary = summary; }

    public String getRootCause() { return rootCause; }
    public void setRootCause(String rootCause) { this.rootCause = rootCause; }

    public List<String> getSuggestions() { return suggestions; }
    public void setSuggestions(List<String> suggestions) { this.suggestions = suggestions; }
}
