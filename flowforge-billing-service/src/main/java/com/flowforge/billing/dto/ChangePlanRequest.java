package com.flowforge.billing.dto;

import jakarta.validation.constraints.NotBlank;

public class ChangePlanRequest {

    @NotBlank(message = "Plan is required")
    private String plan;

    public ChangePlanRequest() {
    }

    public ChangePlanRequest(String plan) {
        this.plan = plan;
    }

    public String getPlan() { return plan; }
    public void setPlan(String plan) { this.plan = plan; }
}
