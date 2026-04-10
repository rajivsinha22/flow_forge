package com.flowforge.billing.dto;

import jakarta.validation.constraints.NotBlank;

public class CreateCheckoutSessionRequest {

    @NotBlank(message = "Plan is required")
    private String plan;

    @NotBlank(message = "Success URL is required")
    private String successUrl;

    @NotBlank(message = "Cancel URL is required")
    private String cancelUrl;

    public CreateCheckoutSessionRequest() {
    }

    public CreateCheckoutSessionRequest(String plan, String successUrl, String cancelUrl) {
        this.plan = plan;
        this.successUrl = successUrl;
        this.cancelUrl = cancelUrl;
    }

    public String getPlan() { return plan; }
    public void setPlan(String plan) { this.plan = plan; }

    public String getSuccessUrl() { return successUrl; }
    public void setSuccessUrl(String successUrl) { this.successUrl = successUrl; }

    public String getCancelUrl() { return cancelUrl; }
    public void setCancelUrl(String cancelUrl) { this.cancelUrl = cancelUrl; }
}
