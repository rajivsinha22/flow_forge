package com.flowforge.workflow.dto;

import java.time.Instant;

public class GenerateDocResponse {

    private String workflowId;
    private Integer workflowVersion;
    private String markdown;
    private Instant generatedAt;
    private boolean regenerated;

    public GenerateDocResponse() {
    }

    public GenerateDocResponse(String workflowId, Integer workflowVersion, String markdown,
                                Instant generatedAt, boolean regenerated) {
        this.workflowId = workflowId;
        this.workflowVersion = workflowVersion;
        this.markdown = markdown;
        this.generatedAt = generatedAt;
        this.regenerated = regenerated;
    }

    public String getWorkflowId() { return workflowId; }
    public void setWorkflowId(String workflowId) { this.workflowId = workflowId; }

    public Integer getWorkflowVersion() { return workflowVersion; }
    public void setWorkflowVersion(Integer workflowVersion) { this.workflowVersion = workflowVersion; }

    public String getMarkdown() { return markdown; }
    public void setMarkdown(String markdown) { this.markdown = markdown; }

    public Instant getGeneratedAt() { return generatedAt; }
    public void setGeneratedAt(Instant generatedAt) { this.generatedAt = generatedAt; }

    public boolean isRegenerated() { return regenerated; }
    public void setRegenerated(boolean regenerated) { this.regenerated = regenerated; }
}
