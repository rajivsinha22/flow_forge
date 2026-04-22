package com.flowforge.workflow.dto;

public class UpdateDocRequest {

    private String markdown;

    public UpdateDocRequest() {
    }

    public UpdateDocRequest(String markdown) {
        this.markdown = markdown;
    }

    public String getMarkdown() { return markdown; }
    public void setMarkdown(String markdown) { this.markdown = markdown; }
}
