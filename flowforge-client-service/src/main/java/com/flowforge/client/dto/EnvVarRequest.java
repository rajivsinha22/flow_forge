package com.flowforge.client.dto;

import jakarta.validation.constraints.NotBlank;

import java.util.Objects;

public class EnvVarRequest {

    @NotBlank(message = "Variable name is required")
    private String name;

    @NotBlank(message = "Variable value is required")
    private String value;

    public EnvVarRequest() {
    }

    public EnvVarRequest(String name, String value) {
        this.name = name;
        this.value = value;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getValue() {
        return value;
    }

    public void setValue(String value) {
        this.value = value;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        EnvVarRequest that = (EnvVarRequest) o;
        return Objects.equals(name, that.name) &&
                Objects.equals(value, that.value);
    }

    @Override
    public int hashCode() {
        return Objects.hash(name, value);
    }

    @Override
    public String toString() {
        return "EnvVarRequest{" +
                "name='" + name + '\'' +
                ", value='[PROTECTED]'" +
                '}';
    }

    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private String name;
        private String value;

        public Builder name(String name) {
            this.name = name;
            return this;
        }

        public Builder value(String value) {
            this.value = value;
            return this;
        }

        public EnvVarRequest build() {
            return new EnvVarRequest(name, value);
        }
    }
}
