package com.flowforge.client.dto;

import jakarta.validation.constraints.NotBlank;

import java.util.List;
import java.util.Objects;

public class CreateRoleRequest {

    @NotBlank(message = "Role name is required")
    private String name;

    private List<String> permissions;

    public CreateRoleRequest() {
    }

    public CreateRoleRequest(String name, List<String> permissions) {
        this.name = name;
        this.permissions = permissions;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public List<String> getPermissions() {
        return permissions;
    }

    public void setPermissions(List<String> permissions) {
        this.permissions = permissions;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        CreateRoleRequest that = (CreateRoleRequest) o;
        return Objects.equals(name, that.name) &&
                Objects.equals(permissions, that.permissions);
    }

    @Override
    public int hashCode() {
        return Objects.hash(name, permissions);
    }

    @Override
    public String toString() {
        return "CreateRoleRequest{" +
                "name='" + name + '\'' +
                ", permissions=" + permissions +
                '}';
    }

    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private String name;
        private List<String> permissions;

        public Builder name(String name) {
            this.name = name;
            return this;
        }

        public Builder permissions(List<String> permissions) {
            this.permissions = permissions;
            return this;
        }

        public CreateRoleRequest build() {
            return new CreateRoleRequest(name, permissions);
        }
    }
}
