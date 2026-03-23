package com.flowforge.client.dto;

import com.flowforge.common.model.Client;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.Objects;

public class RegisterRequest {

    @NotBlank(message = "Organization name is required")
    private String orgName;

    @NotBlank(message = "Your name is required")
    private String yourName;

    @NotBlank(message = "Email is required")
    @Email(message = "Email must be valid")
    private String email;

    @NotBlank(message = "Password is required")
    @Size(min = 8, message = "Password must be at least 8 characters")
    private String password;

    private Client.Plan plan;

    private String webhookUrl;

    public RegisterRequest() {
    }

    public RegisterRequest(String orgName, String yourName, String email, String password,
                           Client.Plan plan, String webhookUrl) {
        this.orgName = orgName;
        this.yourName = yourName;
        this.email = email;
        this.password = password;
        this.plan = plan;
        this.webhookUrl = webhookUrl;
    }

    public String getOrgName() {
        return orgName;
    }

    public void setOrgName(String orgName) {
        this.orgName = orgName;
    }

    public String getYourName() {
        return yourName;
    }

    public void setYourName(String yourName) {
        this.yourName = yourName;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public Client.Plan getPlan() {
        return plan;
    }

    public void setPlan(Client.Plan plan) {
        this.plan = plan;
    }

    public String getWebhookUrl() {
        return webhookUrl;
    }

    public void setWebhookUrl(String webhookUrl) {
        this.webhookUrl = webhookUrl;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        RegisterRequest that = (RegisterRequest) o;
        return Objects.equals(orgName, that.orgName) &&
                Objects.equals(yourName, that.yourName) &&
                Objects.equals(email, that.email) &&
                Objects.equals(password, that.password) &&
                plan == that.plan &&
                Objects.equals(webhookUrl, that.webhookUrl);
    }

    @Override
    public int hashCode() {
        return Objects.hash(orgName, yourName, email, password, plan, webhookUrl);
    }

    @Override
    public String toString() {
        return "RegisterRequest{" +
                "orgName='" + orgName + '\'' +
                ", yourName='" + yourName + '\'' +
                ", email='" + email + '\'' +
                ", password='[PROTECTED]'" +
                ", plan=" + plan +
                ", webhookUrl='" + webhookUrl + '\'' +
                '}';
    }

    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private String orgName;
        private String yourName;
        private String email;
        private String password;
        private Client.Plan plan;
        private String webhookUrl;

        public Builder orgName(String orgName) {
            this.orgName = orgName;
            return this;
        }

        public Builder yourName(String yourName) {
            this.yourName = yourName;
            return this;
        }

        public Builder email(String email) {
            this.email = email;
            return this;
        }

        public Builder password(String password) {
            this.password = password;
            return this;
        }

        public Builder plan(Client.Plan plan) {
            this.plan = plan;
            return this;
        }

        public Builder webhookUrl(String webhookUrl) {
            this.webhookUrl = webhookUrl;
            return this;
        }

        public RegisterRequest build() {
            return new RegisterRequest(orgName, yourName, email, password, plan, webhookUrl);
        }
    }
}
