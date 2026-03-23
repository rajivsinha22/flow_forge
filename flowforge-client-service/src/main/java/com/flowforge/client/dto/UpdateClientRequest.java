package com.flowforge.client.dto;

import java.util.Objects;

public class UpdateClientRequest {

    private String name;
    private String webhookUrl;
    private String webhookSecret;
    private Boolean webhookEnabled;

    public UpdateClientRequest() {
    }

    public UpdateClientRequest(String name, String webhookUrl, String webhookSecret, Boolean webhookEnabled) {
        this.name = name;
        this.webhookUrl = webhookUrl;
        this.webhookSecret = webhookSecret;
        this.webhookEnabled = webhookEnabled;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getWebhookUrl() {
        return webhookUrl;
    }

    public void setWebhookUrl(String webhookUrl) {
        this.webhookUrl = webhookUrl;
    }

    public String getWebhookSecret() {
        return webhookSecret;
    }

    public void setWebhookSecret(String webhookSecret) {
        this.webhookSecret = webhookSecret;
    }

    public Boolean getWebhookEnabled() {
        return webhookEnabled;
    }

    public void setWebhookEnabled(Boolean webhookEnabled) {
        this.webhookEnabled = webhookEnabled;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        UpdateClientRequest that = (UpdateClientRequest) o;
        return Objects.equals(name, that.name) &&
                Objects.equals(webhookUrl, that.webhookUrl) &&
                Objects.equals(webhookSecret, that.webhookSecret);
    }

    @Override
    public int hashCode() {
        return Objects.hash(name, webhookUrl, webhookSecret);
    }

    @Override
    public String toString() {
        return "UpdateClientRequest{" +
                "name='" + name + '\'' +
                ", webhookUrl='" + webhookUrl + '\'' +
                ", webhookSecret='[PROTECTED]'" +
                '}';
    }

    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private String name;
        private String webhookUrl;
        private String webhookSecret;

        public Builder name(String name) {
            this.name = name;
            return this;
        }

        public Builder webhookUrl(String webhookUrl) {
            this.webhookUrl = webhookUrl;
            return this;
        }

        public Builder webhookSecret(String webhookSecret) {
            this.webhookSecret = webhookSecret;
            return this;
        }

        public Builder webhookEnabled(Boolean webhookEnabled) {
            this.webhookEnabled = webhookEnabled;
            return this;
        }

        public UpdateClientRequest build() {
            return new UpdateClientRequest(name, webhookUrl, webhookSecret, webhookEnabled);
        }
    }
}
