package com.flowforge.workflow.dto;

import java.util.Map;

/**
 * Request body used to test a payload against a data model's JSON Schema.
 */
public class ValidatePayloadRequest {

    /** The raw payload to validate */
    private Map<String, Object> payload;

    public ValidatePayloadRequest() {
    }

    public Map<String, Object> getPayload() { return payload; }
    public void setPayload(Map<String, Object> payload) { this.payload = payload; }
}
