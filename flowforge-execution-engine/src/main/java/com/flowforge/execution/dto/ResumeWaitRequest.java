package com.flowforge.execution.dto;

import java.util.Map;

public class ResumeWaitRequest {
    private Map<String, Object> data;   // optional payload injected into context
    private String resumedBy;           // optional description e.g. "manual", "kafka_event"

    public ResumeWaitRequest() {}
    public Map<String, Object> getData() { return data; }
    public void setData(Map<String, Object> data) { this.data = data; }
    public String getResumedBy() { return resumedBy; }
    public void setResumedBy(String resumedBy) { this.resumedBy = resumedBy; }
}
