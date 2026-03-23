package com.flowforge.client.dto;

import jakarta.validation.constraints.NotBlank;

import java.util.Objects;

public class CreateApiKeyRequest {

    @NotBlank(message = "API key name is required")
    private String name;

    public CreateApiKeyRequest() {
    }

    public CreateApiKeyRequest(String name) {
        this.name = name;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        CreateApiKeyRequest that = (CreateApiKeyRequest) o;
        return Objects.equals(name, that.name);
    }

    @Override
    public int hashCode() {
        return Objects.hash(name);
    }

    @Override
    public String toString() {
        return "CreateApiKeyRequest{" +
                "name='" + name + '\'' +
                '}';
    }

    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private String name;

        public Builder name(String name) {
            this.name = name;
            return this;
        }

        public CreateApiKeyRequest build() {
            return new CreateApiKeyRequest(name);
        }
    }
}
